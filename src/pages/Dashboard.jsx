/**
 * pages/Dashboard.jsx
 * 역할: 풀스크린 HUD 관제 대시보드 (레퍼런스 "위성 관제실" 톤)
 *       - //! [Original Code] 12-col grid 카드 레이아웃 (영상/온도/3D맵/하자/보고서)
 *       - //* [Modified Code v1] 풀스크린 3D 맵 배경 + HUD 플로팅 오버레이
 *       - //* [Modified Code v2] 메인 배경을 LIVE 카메라 피드로 승격, 3D 맵은 우하단 미니맵으로 강등
 *         (사용자 피드백: "3D 맵은 도면/평면도/시뮬레이션 모델링용 — 우하단 미니맵이 맞다")
 *
 * 레이아웃 구조:
 *   ┌─────────────────────────────────────────────────────────────────┐
 *   │  [DashboardTopBar]                                               │
 *   ├─────────────────────────────────────────────────────────────────┤
 *   │                                                   ┌─────────────┐ │
 *   │   ┌─ [D01·RGB·LIVE]  ─ <Main 16:9 카메라> ────┐   │ AI DEFECT   │ │
 *   │   │                                            │   │ ANALYSIS    │ │
 *   │   │                     ┌───── D02·THERMAL ──┐ │   │             │ │
 *   │   │                     │  (반대 드론 PIP) SWAP│ │   │             │ │
 *   │   └─────────────────────└────────────────────┘─┘   └─────────────┘ │
 *   │ ┌────────────┐                     ┌──────────────┐                │
 *   │ │ DRONES     │                     │ 3D MINI MAP  │                │
 *   │ │ (01 / 02)  │                     │ (BuildingScene)│              │
 *   │ └────────────┘                     └──────────────┘                │
 *   └─────────────────────────────────────────────────────────────────┘
 *
 *   PIP 는 "선택되지 않은 드론" 카메라를 실시간 표시. 클릭 시 메인 ↔ PIP 스왑.
 *
 * 드론 ↔ 카메라 연동:
 *   DRONE 01 클릭 → cameraMode='rgb'     → 메인 배경이 RGB 스트림
 *   DRONE 02 클릭 → cameraMode='thermal' → 메인 배경이 열화상 스트림
 */

import { useCallback, useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, Video, ArrowLeftRight, Circle, Square, Maximize2, Minimize2 } from 'lucide-react'
import BuildingScene from '../components/map3d/BuildingScene.jsx'
import LiveVideoFeed from '../components/video/LiveVideoFeed.jsx'
import DefectPanel from '../components/defects/DefectPanel.jsx'
import DashboardTopBar from '../components/dashboard/DashboardTopBar.jsx'
import DronesPanel from '../components/dashboard/DronesPanel.jsx'
import TestModeBar from '../components/dashboard/TestModeBar.jsx'
import useDroneStore, { DRONE_CAMERA_MAP } from '../store/droneStore.js'
import useSessionStore from '../store/sessionStore.js'
import useDefectStore from '../store/defectStore.js'
import useTestActiveMedia from '../hooks/useTestActiveMedia.js'
import { toast } from '../store/toastStore.js'
import { perfStart, perfEnd } from '../utils/perfTimer'
import { maybeDownsampleAll } from '../utils/imageDownsample'
import { uploadWithProgress } from '../utils/uploadWithProgress'

// //* [Modified Code] 반응형 viewport 훅 — Dashboard 절대 배치 ↔ 모바일 세로 스택 분기 트리거
// (CSS 미디어 쿼리로는 inline style 픽셀 값을 못 나누므로 JS matchMedia 필요)
function useDashboardViewport() {
  const [vp, setVp] = useState(() => {
    if (typeof window === 'undefined') return { isMobile: false, isTablet: false }
    return {
      isMobile: window.matchMedia('(max-width: 767px)').matches,
      isTablet: window.matchMedia('(min-width: 768px) and (max-width: 1023px)').matches,
    }
  })
  useEffect(() => {
    const mqMobile = window.matchMedia('(max-width: 767px)')
    const mqTablet = window.matchMedia('(min-width: 768px) and (max-width: 1023px)')
    const update = () => setVp({
      isMobile: mqMobile.matches,
      isTablet: mqTablet.matches,
    })
    mqMobile.addEventListener('change', update)
    mqTablet.addEventListener('change', update)
    return () => {
      mqMobile.removeEventListener('change', update)
      mqTablet.removeEventListener('change', update)
    }
  }, [])
  return vp
}

const CAMERA_LABEL = {
  rgb: 'RGB · 일반 카메라',
  thermal: 'THERMAL · 열화상',
  blend: 'BLEND · 합성',
}

const CAMERA_LABEL_SHORT = {
  rgb: 'RGB',
  thermal: 'THERMAL',
  blend: 'BLEND',
}

// 두 드론만 존재하는 현재 구조에서 "다른 드론" 을 반환. 확장 시 drones[] 배열 순회로 교체 예정.
const otherDroneId = (id) => (id === 'drone-01' ? 'drone-02' : 'drone-01')

// HUD 구역 치수 — 중앙 LIVE 피드 박스가 피해야 할 좌/우/상/하 safe zone (px).
// 값은 각 패널(DronesPanel·AI Analysis·Minimap) 폭/높이 + gap 기준.
// //* [Modified Code] Thermal Trend 를 피드 박스 내부 오버레이로 이관 → SAFE.left 대폭 축소(316 → 16).
// (DronesPanel 은 bottom 영역에만 있어 수평 충돌 없음, 이미 SAFE.bottom 으로 수직 분리됨)
//
// //* [Modified Code] 반응형: 태블릿(md~lg)에서는 우측 패널이 320px 로 축소되므로 SAFE.right 도 동기화.
// 모바일(<md)에서는 절대 배치 자체를 포기하고 세로 스택 fallback 으로 전환하므로 SAFE 값 미사용.
const SAFE = {
  top: 100,    // TopBar(56) + 여백(44)
  bottom: 150, // DronesPanel(≈134) + gap
  left: 16,    // 사이드바 이후 기본 margin — 좌측 상단이 비어 피드 확장 가능
  right: 400,  // AI Analysis(360) + margin(4) + gap(36)
}

// 태블릿 전용 SAFE — md~lg 구간 (panel width 320px 기준)
const SAFE_TABLET = {
  top: 100,
  bottom: 150,
  left: 16,
  right: 348,  // panel(320) + margin(12) + gap(16)
}

// 우하단 3D 미니맵 크기 — AI 패널의 하단 offset 산정에 사용.
// //* [Modified Code] MINIMAP_W 를 AI 패널(w-[360px]) 과 동일하게 맞춰 세로 정렬 — 사용자 피드백
const MINIMAP_W = 360
const MINIMAP_H = 200
// //* [Modified Code] 태블릿 단계 — AI 패널 320 기준
const MINIMAP_W_TABLET = 320
const MINIMAP_H_TABLET = 180

// 초(seconds)를 MM:SS 형식으로 변환
const formatTime = (sec) => {
  const m = Math.floor(sec / 60).toString().padStart(2, '0')
  const s = Math.floor(sec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1'

export default function Dashboard() {
  const navigate = useNavigate()
  const selectedDroneId = useDroneStore((s) => s.selectedDroneId)
  const cameraMode = useDroneStore((s) => s.cameraMode)
  const setSelectedDrone = useDroneStore((s) => s.setSelectedDrone)
  const isTestMode = useSessionStore((s) => s.isTestMode)

  // //* [Modified Code] 반응형 viewport — 모바일은 절대 배치 포기하고 세로 스택, 태블릿은 패널 사이즈만 축소
  const { isMobile, isTablet } = useDashboardViewport()
  const safe = isTablet ? SAFE_TABLET : SAFE
  const minimapBase = isTablet
    ? { w: MINIMAP_W_TABLET, h: MINIMAP_H_TABLET }
    : { w: MINIMAP_W, h: MINIMAP_H }

  // ── Dashboard mount 시 백엔드 워밍 + 모델 사전 로드 ─────────────────────────
  // Why: Fly.io idle stop 정책으로 머신 콜드 스타트 + ONNX 11모델 로드가 누적 25-40초.
  // dashboard 진입 즉시 머신 auto_start + `/test/init` 호출로 모델 로드까지 백그라운드에
  // 시작 → 사용자가 START 클릭할 시점엔 모델이 이미 준비되어 첫 frame이 즉시 흘러나옴.
  // fire-and-forget. 멱등(`already_loaded` 반환). Login.jsx 워밍 핑과 동일 패턴.
  // perf 측정 — 사용자 환경에서 워밍 효과 검증용 (?perf=1 위젯에 노출).
  useEffect(() => {
    perfStart('dashboard-warm-root')
    fetch(`${API_BASE}/`)
      .then(() => perfEnd('dashboard-warm-root'))
      .catch(() => perfEnd('dashboard-warm-root', { err: true }))
    perfStart('dashboard-warm-init')
    fetch(`${API_BASE}/api/v1/stream/test/init`, { method: 'POST' })
      .then((r) => perfEnd('dashboard-warm-init', { status: r.status }))
      .catch(() => perfEnd('dashboard-warm-init', { err: true }))
  }, [])

  // ── 업로드 영상 채널(rgb/thermal)에 맞춰 드론 자동 전환 ─────────────────────────
  // Why: 백엔드가 프레임 색으로 thermal 영상을 판별하면 그 영상은 Drone2(thermal) 피드에만
  // 노출된다. 사용자가 Drone1(rgb) 을 보고 있으면 빈 화면(No Signal)이 되므로, 새 영상이
  // 활성화될 때 1회 해당 채널의 드론으로 자동 전환한다(이후 수동 전환은 존중 — filename 단위 가드).
  const activeMedia = useTestActiveMedia()
  const autoSwitchedFileRef = useRef(null)
  useEffect(() => {
    if (!isTestMode) { autoSwitchedFileRef.current = null; return }
    if (activeMedia?.kind !== 'video' || !activeMedia?.filename) return
    if (autoSwitchedFileRef.current === activeMedia.filename) return
    autoSwitchedFileRef.current = activeMedia.filename
    const targetDrone = activeMedia.channel === 'thermal' ? 'drone-02' : 'drone-01'
    setSelectedDrone(targetDrone)  // 같은 드론이면 store 가 no-op
  }, [isTestMode, activeMedia?.kind, activeMedia?.filename, activeMedia?.channel, setSelectedDrone])

  // ── 드래그앤드랍 업로드 + 자동 재생 ─────────────────────────
  // Why: 파일 첨부 버튼만 있으면 클릭 동선이 길고, 사용자가 영상을 화면 어디에든 떨어뜨려
  // 즉시 재생되길 기대. window 전체 dragover/drop 리스너로 dashboard 어느 영역에서든
  // 받아 자동으로 (1) source='upload' 전환 → (2) 업로드 → (3) START 호출까지 일괄.
  const [dragActive, setDragActive] = useState(false)
  const [dropUploading, setDropUploading] = useState(false)
  // 업로드 progress — 사용자 대기 인지 시간 단축. 0~100%, 실시간 속도(KB/s) 표시.
  const [uploadProgress, setUploadProgress] = useState(null)  // { percent, speedKbps, etaSeconds, sizeReducedMb }
  const dragCounterRef = useRef(0)
  useEffect(() => {
    const handleDragEnter = (e) => {
      e.preventDefault()
      if (!e.dataTransfer || !e.dataTransfer.types?.includes('Files')) return
      dragCounterRef.current += 1
      setDragActive(true)
    }
    const handleDragLeave = (e) => {
      e.preventDefault()
      dragCounterRef.current -= 1
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0
        setDragActive(false)
      }
    }
    const handleDragOver = (e) => {
      e.preventDefault()  // drop 허용
    }
    const handleDrop = async (e) => {
      e.preventDefault()
      dragCounterRef.current = 0
      setDragActive(false)
      const rawFiles = e.dataTransfer?.files
      if (!rawFiles || rawFiles.length === 0) return
      // 이미지/영상만 필터
      const accepted = Array.from(rawFiles).filter((f) =>
        f.type.startsWith('image/') || f.type.startsWith('video/')
      )
      if (accepted.length === 0) return

      perfStart('upload-total')
      setDropUploading(true)
      setUploadProgress({ percent: 0, speedKbps: 0, etaSeconds: 0 })
      // 테스트 제어 엔드포인트(/source·/upload·/start)는 백엔드 인증 필요.
      // 토큰 누락 시 401 → 조용히 실패 → "드롭해도 아무 반응 없음" 사고. 버튼 경로와 동일하게 수동 첨부.
      const token = sessionStorage.getItem('access_token')
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {}
      try {
        // 0) 클라이언트 측 이미지 다운샘플 (4K → 1280) — 사이즈 80~95% 절감.
        // 영상은 그대로 통과(ffmpeg.wasm은 무거워서 ROI 낮음).
        perfStart('upload-downsample')
        const originalBytes = accepted.reduce((s, f) => s + f.size, 0)
        const processed = await maybeDownsampleAll(accepted)
        const finalBytes = processed.reduce((s, f) => s + f.size, 0)
        const sizeReducedMb = Math.round((originalBytes - finalBytes) / (1024 * 1024) * 10) / 10
        perfEnd('upload-downsample', { reducedMb: sizeReducedMb })

        // 1) 업로드 모드 전환 — backend stream source switch + 프론트 store 동기화
        await fetch(`${API_BASE}/api/v1/stream/test/source`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({ source: 'upload' }),
        }).catch(() => {})
        useSessionStore.getState().setTestSource('upload')

        // 2) progress 추적 업로드 (XHR — fetch는 upload progress 표준 미지원)
        perfStart('upload-network')
        const formData = new FormData()
        processed.forEach((f) => formData.append('files', f))
        const uploadRes = await uploadWithProgress(
          `${API_BASE}/api/v1/stream/test/upload`,
          formData,
          (p) => setUploadProgress({ ...p, sizeReducedMb }),
          authHeaders,
        )
        perfEnd('upload-network', {
          totalMb: Math.round(finalBytes / (1024 * 1024) * 10) / 10,
          status: uploadRes.status,
        })
        if (uploadRes.status >= 400) {
          perfEnd('upload-total', { ok: false })
          toast.error('파일 업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.')
          return
        }

        // 3) 자동 START — 게이트 리셋 + 이전 카드 제거 후 재생 시작(버튼 경로 handleStart 와 동일).
        // 프론트 testPlayState 도 'playing' 으로 동기화해야 <video>.play()·게이트·상태칩이 발화.
        useDefectStore.getState().resetTestGate()
        useDefectStore.getState().setDefects([])
        const startRes = await fetch(`${API_BASE}/api/v1/stream/test/start`, {
          method: 'POST',
          headers: authHeaders,
        }).catch(() => null)
        if (startRes && startRes.ok) {
          useSessionStore.getState().setTestPlayState('playing')
        }
        perfEnd('upload-total', { ok: true })
      } catch (err) {
        // 네트워크/다운샘플 등 예외 — 사용자에게 알리고 진행 상태 정리(무음 실패 방지).
        console.error('[Upload]', err)
        perfEnd('upload-total', { ok: false })
        toast.error('업로드 중 오류가 발생했습니다. 네트워크 상태를 확인해 주세요.')
      } finally {
        setDropUploading(false)
        setUploadProgress(null)
      }
    }
    window.addEventListener('dragenter', handleDragEnter)
    window.addEventListener('dragleave', handleDragLeave)
    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('drop', handleDrop)
    return () => {
      window.removeEventListener('dragenter', handleDragEnter)
      window.removeEventListener('dragleave', handleDragLeave)
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('drop', handleDrop)
    }
  }, [])

  // ── 미니맵 확장 상태 ─────────────────────────
  const [minimapExpanded, setMinimapExpanded] = useState(false)

  // ── 녹화 상태 ─────────────────────────────
  const [isRecording, setIsRecording] = useState(false)
  const [recElapsed, setRecElapsed] = useState(0)
  const timerRef = useRef(null)

  // 녹화 타이머: 녹화 시작 시 1초 간격으로 경과 시간 카운트
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setRecElapsed((p) => p + 1), 1000)
    } else {
      clearInterval(timerRef.current)
      setRecElapsed(0)
    }
    return () => clearInterval(timerRef.current)
  }, [isRecording])

  // 녹화 시작/중지 토글 (RGB + Thermal 동시 녹화)
  const handleRecordToggle = useCallback(async () => {
    try {
      if (!isRecording) {
        const res = await fetch(`${API_BASE}/stream/record/start`, {
          method: 'POST',
        })
        if (res.ok) setIsRecording(true)
        else toast.error('녹화를 시작하지 못했습니다.')
      } else {
        const res = await fetch(`${API_BASE}/stream/record/stop`, {
          method: 'POST',
        })
        if (res.ok) setIsRecording(false)
        else toast.error('녹화를 중지하지 못했습니다.')
      }
    } catch (err) {
      console.error('[Recording]', err)
      toast.error('녹화 처리 중 오류가 발생했습니다.')
    }
  }, [isRecording])

  // PIP 에 표시할 반대편 드론 정보 (선택되지 않은 쪽)
  const pipDroneId = otherDroneId(selectedDroneId)
  const pipMode = DRONE_CAMERA_MAP[pipDroneId]

  // //* [Modified Code] MissionControl END 클릭 → /dashboard/report 오버레이 진입 (nested route)
  const handleMissionEnd = useCallback(() => {
    navigate('/dashboard/report')
  }, [navigate])

  // ── LIVE 피드 박스 (메인 + PIP) — 데스크탑/태블릿/모바일 공통 노드 ─────────
  // //* [Modified Code] 모바일에서 PIP 비활성화 (피드 박스가 좁아 PIP 가 메인 가독성 해침)
  const liveFeedBox = (
    <div
      className="relative bg-black rounded-xl overflow-hidden border border-neutral-700/60 shadow-2xl w-full"
      style={{ aspectRatio: '16 / 9', maxHeight: '100%' }}
    >
      <LiveVideoFeed fill />

      {/* 피드 상단 좌측: 드론/카메라 컨텍스트 뱃지 */}
      <div className="absolute top-2 left-2 md:top-3 md:left-3 pointer-events-none max-w-[calc(100%-110px)]">
        <div className="flex items-center gap-2 px-2 md:px-3 py-1 rounded-full bg-neutral-900/70 border border-neutral-700/60 shadow-md">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
          <Video size={12} className="text-accent-400 shrink-0" />
          <span className="text-[10px] md:text-[11px] font-mono text-slate-200 truncate">
            {selectedDroneId.replace('drone-0', 'DRONE ')} · {isMobile ? CAMERA_LABEL_SHORT[cameraMode] : CAMERA_LABEL[cameraMode]} · LIVE
          </span>
        </div>
      </div>

      {/* 피드 상단 우측: 녹화 버튼 */}
      <div className="absolute top-2 right-2 md:top-3 md:right-3 z-10 pointer-events-auto">
        <button
          type="button"
          onClick={handleRecordToggle}
          title={isRecording ? '녹화 중지' : '녹화 시작 (RGB + Thermal 동시 저장)'}
          className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-full border shadow-lg transition-all ${
            isRecording
              ? 'bg-red-600/90 border-red-500/80 hover:bg-red-500'
              : 'bg-neutral-900/70 border-neutral-700/60 hover:bg-neutral-800/80 hover:border-accent-500/50'
          }`}
        >
          {isRecording ? (
            <>
              <span className="relative flex items-center justify-center w-3.5 h-3.5">
                <span className="absolute w-3.5 h-3.5 rounded-full bg-red-400 animate-ping opacity-50" />
                <span className="relative w-2 h-2 rounded-sm bg-white" />
              </span>
              <span className="text-[10px] md:text-[11px] font-mono font-bold text-white tracking-wider">
                REC {formatTime(recElapsed)}
              </span>
            </>
          ) : (
            <>
              <Circle size={12} className="text-slate-400" strokeWidth={2} />
              <span className="text-[10px] md:text-[11px] font-mono text-slate-400 tracking-wider">
                녹화
              </span>
            </>
          )}
        </button>
      </div>

      {/* //* [Modified Code] 피드 우하단: 반대편 드론 PIP — 모바일에서는 hide (가독성 우선) */}
      {!isMobile && (
        <button
          type="button"
          onClick={() => setSelectedDrone(pipDroneId)}
          title={`${pipDroneId.replace('drone-0', 'DRONE ')} 시점으로 전환`}
          className="group absolute bottom-2 right-2 md:bottom-3 md:right-3 z-10 w-[180px] md:w-[200px] lg:w-[260px] aspect-video rounded-lg bg-black border border-neutral-700/60 backdrop-blur-md shadow-xl overflow-hidden hover:border-accent-500/70 transition pointer-events-auto"
        >
          <LiveVideoFeed fill mode={pipMode} />

          {/* PIP 상단: 드론/카메라 라벨 */}
          <div className="absolute top-1.5 left-1.5 pointer-events-none">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-neutral-900/80 border border-neutral-700/60">
              <span className="w-1 h-1 rounded-full bg-red-500" />
              <span className="text-[9px] font-mono text-slate-200">
                {pipDroneId.replace('drone-0', 'D')} · {CAMERA_LABEL_SHORT[pipMode]}
              </span>
            </div>
          </div>

          {/* PIP 우상단: 스왑 힌트 아이콘 (hover 시 강조) */}
          <div className="absolute top-1.5 right-1.5 pointer-events-none">
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-900/60 text-slate-400 group-hover:bg-accent-500/20 group-hover:text-accent-300 transition">
              <ArrowLeftRight size={10} />
              <span className="text-[9px] font-mono">SWAP</span>
            </div>
          </div>
        </button>
      )}
    </div>
  )

  // ── AI Defect Analysis 패널 노드 — 데스크탑/태블릿/모바일 공통 ─────────
  const defectPanel = (
    <div className="flex flex-col h-full rounded-xl bg-neutral-900/90 border border-accent-500/30 backdrop-blur-sm shadow-lg overflow-hidden">
      <div className="px-3 md:px-4 py-2.5 md:py-3 border-b border-neutral-700/60 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="text-accent-400" size={16} />
          <span className="text-sm font-bold text-white">
            AI Defect Analysis
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-400" />
          <span className="text-xs text-slate-400">
            실시간 하자 탐지
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-hidden flex flex-col p-3">
        <DefectPanel />
      </div>
    </div>
  )

  // ── 3D Minimap 노드 — 데스크탑/태블릿/모바일 공통 ─────────
  const minimapPanel = (
    <div className="relative flex flex-col h-full rounded-xl bg-neutral-900/90 border border-neutral-700/60 backdrop-blur-sm shadow-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-700/60 flex-shrink-0">
        <span className="text-xs font-semibold text-slate-100">
          3D Mini Map
        </span>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-accent-300">
            <span className="w-1 h-1 rounded-full bg-accent-400 animate-pulse" />
            LIVE
          </span>
          {/* 확장 버튼은 데스크탑/태블릿 절대 배치에서만 의미 있음 */}
          {!isMobile && (
            <button
              type="button"
              onClick={() => setMinimapExpanded((v) => !v)}
              title={minimapExpanded ? '축소' : '확대'}
              className="p-1.5 rounded bg-slate-700/80 text-slate-200 hover:text-white hover:bg-accent-500/30 transition border border-slate-600"
            >
              {minimapExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 relative">
        <BuildingScene />
      </div>
    </div>
  )

  // ── 모바일 세로 스택 fallback (절대 배치 포기) ─────────
  // //* [Modified Code] 모바일은 HUD 풀스크린이 의미 없음 (패널 폭이 화면을 덮어 겹침) →
  // 단일 컬럼 + 자연 스크롤 + 핵심 우선(LIVE → AI Defect → Drones → Minimap)으로 fallback
  if (isMobile) {
    return (
      <div className="relative h-full w-full bg-dashboard-bg flex flex-col overflow-hidden">
        <DashboardTopBar onMissionEnd={handleMissionEnd} />
        {isTestMode && <TestModeBar />}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3">
          {/* 1. LIVE 피드 (가장 우선 — 작업자가 영상 먼저 봐야 함) */}
          <section className="w-full">{liveFeedBox}</section>

          {/* 2. AI Defect Analysis (검출 결과) */}
          <section className="w-full h-[55vh] min-h-[320px]">
            {defectPanel}
          </section>

          {/* 3. Drones (드론 선택/배터리) */}
          <section className="w-full">
            <DronesPanel layout="stacked" />
          </section>

          {/* 4. 3D Minimap (보조 정보) */}
          <section className="w-full h-[280px]">
            {minimapPanel}
          </section>
        </div>
      </div>
    )
  }

  // ── 데스크탑(lg+) / 태블릿(md~lg) — 기존 HUD 절대 배치 (사이즈만 단계화) ─────────
  return (
    <div className="relative h-full w-full overflow-hidden bg-dashboard-bg">
      {/* 배경: 플랫 솔리드 다크 */}

      {/* ── 상단 HUD 바 ─────────────────────────────────────── */}
      <DashboardTopBar onMissionEnd={handleMissionEnd} />

      {/* ── 테스트 모드 제어 바 (토글 + 파일 업로드) ── */}
      {isTestMode && <TestModeBar />}

      {/* ── 중앙: LIVE 카메라 피드 (16:9 유지, safe zone 안에 중앙 배치) ── */}
      <div
        className="absolute z-0 flex items-center justify-center"
        style={{
          top: isTestMode ? safe.top + 44 : safe.top,
          bottom: safe.bottom,
          left: safe.left,
          right: safe.right,
        }}
      >
        {liveFeedBox}
      </div>

      {/* ── 좌하단: Drones 패널 (DRONE 01/02 선택) ───────────── */}
      <DronesPanel />

      {/* ── 우하단: 3D 미니맵 (도면/평면도/시뮬레이션 모델링 용) ── */}
      <aside
        className="absolute right-3 lg:right-4 bottom-3 lg:bottom-4 z-20 pointer-events-auto transition-all duration-300 ease-in-out"
        style={{
          width:  minimapExpanded ? minimapBase.w * 2 : minimapBase.w,
          height: minimapExpanded ? minimapBase.h * 2 : minimapBase.h,
        }}
      >
        {minimapPanel}
      </aside>

      {/* ── 우측: AI Defect Analysis (미니맵과 겹치지 않도록 bottom offset) ── */}
      <aside
        className="absolute top-20 right-3 lg:right-4 z-20 pointer-events-auto transition-all duration-300"
        style={{
          width: isTablet ? 320 : 360,
          bottom: (minimapExpanded ? minimapBase.h * 2 : minimapBase.h) + 24,
        }}
      >
        {defectPanel}
      </aside>

      {/* ── 드래그앤드랍 오버레이 (드래그 중 또는 업로드 중에만 노출) ── */}
      {(dragActive || dropUploading) && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none bg-blue-950/70 backdrop-blur-sm"
          style={{
            outline: '4px dashed rgba(59, 130, 246, 0.7)',
            outlineOffset: '-12px',
          }}
        >
          <div className="flex flex-col items-center gap-3 px-8 py-6 rounded-2xl bg-neutral-900/90 border border-blue-500/60 shadow-2xl min-w-[360px]">
            <div className="text-5xl">{dropUploading ? '⏳' : '📥'}</div>
            <div className="text-lg font-semibold text-blue-200">
              {dropUploading
                ? `업로드 중${uploadProgress ? ` — ${uploadProgress.percent}%` : ''}`
                : '여기에 영상/이미지를 떨어뜨려 주세요'}
            </div>
            {dropUploading && uploadProgress ? (
              <>
                {/* 진행률 바 */}
                <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-200"
                    style={{ width: `${uploadProgress.percent}%` }}
                  />
                </div>
                {/* 속도 + ETA + 압축 효과 */}
                <div className="text-xs font-mono text-slate-400 flex items-center gap-3 tabular-nums">
                  <span>📡 {uploadProgress.speedKbps.toLocaleString()} KB/s</span>
                  {uploadProgress.etaSeconds > 0 && uploadProgress.percent < 100 && (
                    <span>⏱ {uploadProgress.etaSeconds}s</span>
                  )}
                  {uploadProgress.sizeReducedMb > 0 && (
                    <span className="text-emerald-400">✂ -{uploadProgress.sizeReducedMb}MB 압축</span>
                  )}
                </div>
              </>
            ) : (
              <div className="text-xs font-mono text-slate-400">
                {dropUploading
                  ? 'TEST MODE 자동 전환 + 업로드 + 자동 재생'
                  : 'image/* · video/* · 4K 이미지 자동 압축'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

