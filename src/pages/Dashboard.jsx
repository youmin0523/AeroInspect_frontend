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
      } else {
        const res = await fetch(`${API_BASE}/stream/record/stop`, {
          method: 'POST',
        })
        if (res.ok) setIsRecording(false)
      }
    } catch (err) {
      console.error('[Recording]', err)
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
    </div>
  )
}

