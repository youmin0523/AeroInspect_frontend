/**
 * components/video/LiveVideoFeed.jsx
 * 역할: MJPEG 실시간 영상 스트림 뷰어
 *       - droneStore.cameraMode에 따라 src URL 동적 전환
 *         'rgb'    → VITE_STREAM_RGB_URL
 *         'thermal'→ VITE_STREAM_THERMAL_URL
 *         'blend'  → VITE_STREAM_BLEND_URL
 *       - 브라우저의 <img> 태그가 multipart/x-mixed-replace MJPEG를 네이티브 지원
 *       - 연결 오류 시 "No Signal" 플레이스홀더 표시
 *       - //* [Modified Code] fill prop: 풀스크린/16:9 부모를 꽉 채움 모드
 *       - //* [Modified Code] mode prop: store 의 cameraMode 대신 명시 모드 사용 (PIP 멀티 피드용)
 *       - //* [Modified Code R31] 객체감지 모드 시퀀스: raw → scan → detected (SVG 오버레이).
 *         testMode/real 양쪽 source-agnostic. defectFrameUrl 만 정해지면 동일 UX 발화.
 */

import { useEffect, useRef, useState } from 'react'
import useDroneStore from '../../store/droneStore.js'
import useSessionStore from '../../store/sessionStore.js'
import useDefectStore from '../../store/defectStore.js'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

const STREAM_URLS = {
  rgb:     import.meta.env.VITE_STREAM_RGB_URL     || '/api/v1/stream/rgb',
  thermal: import.meta.env.VITE_STREAM_THERMAL_URL || '/api/v1/stream/thermal',
  blend:   import.meta.env.VITE_STREAM_BLEND_URL   || '/api/v1/stream/blend',
}

const TEST_STREAM_URLS = {
  rgb:     '/api/v1/stream/test/rgb',
  thermal: '/api/v1/stream/test/thermal',
  blend:   '/api/v1/stream/test/rgb',  // 테스트 모드에서 blend 미지원, RGB 폴백
}

const MODE_LABELS = {
  rgb:     'RGB',
  thermal: '열화상',
  blend:   '블렌드',
}

export default function LiveVideoFeed({ fill = false, mode }) {
  const storeCameraMode = useDroneStore((s) => s.cameraMode)
  const isTestMode = useSessionStore((s) => s.isTestMode)
  const testPlayState = useSessionStore((s) => s.testPlayState)
  const selectedDefect = useDefectStore((s) => s.selectedDefect)
  const markTestMediaReady = useDefectStore((s) => s.markTestMediaReady)
  // mode prop 이 주어지면 store 무시 — 멀티 피드(메인 + PIP 다른 드론) 렌더링 용도.
  const cameraMode = mode ?? storeCameraMode
  const [hasError, setHasError] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  const urls = isTestMode ? TEST_STREAM_URLS : STREAM_URLS
  const streamUrl = urls[cameraMode] || STREAM_URLS.rgb

  // 하자 선택 시 → 해당 시점 프레임 표시. testMode/real 양쪽에서 동일 패턴.
  // R31 시점: real 경로는 영상 수신기 도착 후 활성. 그때 backend가 동일한 defect endpoint
  // (`/api/v1/stream/defect/{id}/{channel}?mode=...`) 를 노출하면 아래 로직만 stub URL을
  // 풀어주면 즉시 동작 (source-agnostic 설계).
  const testDetectionMode = useSessionStore((s) => s.testDetectionMode)
  const channel = cameraMode === 'thermal' ? 'thermal' : 'rgb'
  const isDetectionMode = testDetectionMode === 'detection'

  // detection 모드는 SVG 자체 오버레이 → 백엔드에 raw 요청. bbox 모드는 backend burned-in.
  const backendRenderMode = isDetectionMode ? 'raw' : testDetectionMode

  const defectFrameUrl = (() => {
    if (!selectedDefect?.id) return null
    if (isTestMode) {
      return `${API_BASE}/api/v1/stream/test/defect/${selectedDefect.id}/${channel}?mode=${backendRenderMode}`
    }
    // 진짜 현장점검 경로 (영상 수신기 도착 후). 백엔드 미구현이라 현재 null;
    // 구현 시 위 testMode 라인과 동일 형태로 `${API_BASE}/api/v1/stream/defect/...` 반환.
    return null
  })()
  const displayUrl = defectFrameUrl || streamUrl
  const isDefectView = !!defectFrameUrl

  // ── 객체감지 모드 시퀀스 페이즈 ─────────────────────────
  // raw(1.0s) → scan(1.2s) → detected(보존) — 사용자가 "AI가 방금 찾아냈다"고 느끼게 하는 모션.
  // 정적 도장 느낌(burned-in box)을 대체. selectedDefect 변경 시 매번 재시작.
  const [detectionPhase, setDetectionPhase] = useState('idle')
  useEffect(() => {
    if (!isDefectView || !isDetectionMode) {
      setDetectionPhase('idle')
      return
    }
    setDetectionPhase('raw')
    const t1 = setTimeout(() => setDetectionPhase('scan'), 1000)
    const t2 = setTimeout(() => setDetectionPhase('detected'), 2200)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [selectedDefect?.id, isDefectView, isDetectionMode])

  // ── img naturalWidth/Height 캡처 (SVG viewBox 매칭용) ──
  const imgRef = useRef(null)
  const [imgNatural, setImgNatural] = useState(null)

  // ── confidence 카운트업 (detected 페이즈 진입 시 0 → target) ──
  const [animatedConf, setAnimatedConf] = useState(0)
  useEffect(() => {
    if (detectionPhase !== 'detected' || typeof selectedDefect?.confidence !== 'number') {
      setAnimatedConf(0)
      return
    }
    const target = selectedDefect.confidence * 100
    const start = performance.now()
    const dur = 700
    let raf = 0
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setAnimatedConf(target * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [detectionPhase, selectedDefect?.id, selectedDefect?.confidence])

  // src가 바뀌면 에러/로드 플래그 리셋 — 그렇지 않으면 이전 src에서 발생한 onError가
  // 영구적으로 No-Signal 플레이스홀더에 고정되어, TEST MODE 진입(/stream/rgb → /stream/test/rgb)
  // 후에도 새 스트림이 마운트되지 못함.
  useEffect(() => {
    setHasError(false)
    setIsLoaded(false)
    setImgNatural(null)
  }, [displayUrl])

  // TEST MODE 게이트 fallback: playing 진입 후 5초 안에 첫 프레임 onLoad가 발화되지 않으면
  // 게이트를 강제로 열어 큐 잔존을 방지. 스트림 실패 시 디버깅 단서가 됨.
  useEffect(() => {
    if (!isTestMode || !fill || cameraMode !== 'rgb') return
    if (testPlayState !== 'playing') return
    if (isDefectView) return
    const timer = setTimeout(() => {
      if (!useDefectStore.getState().testMediaReady) {
        console.warn('[TestMode] 첫 프레임 onLoad 미발화 — 게이트 강제 open')
        useDefectStore.getState().markTestMediaReady()
      }
    }, 5000)
    return () => clearTimeout(timer)
  }, [isTestMode, fill, cameraMode, testPlayState, isDefectView])

  const handleImgLoad = (e) => {
    setIsLoaded(true)
    // 이미지 원본 해상도 캡처 — SVG viewBox = naturalWidth/Height 로 두면 bbox 좌표가
    // 그대로 매핑됨 (display 크기/aspect 변해도 SVG preserveAspectRatio 가 자동 정렬).
    const t = e?.currentTarget
    if (t && t.naturalWidth && t.naturalHeight) {
      setImgNatural({ w: t.naturalWidth, h: t.naturalHeight })
    }
    // RGB 메인 큰 피드 + 라이브 스트림(하자 정지프레임 X)일 때만 게이트 열기.
    // PIP/Thermal 등 보조 피드는 무시 — 1차 신호는 RGB 메인 1회로 충분.
    if (isTestMode && fill && cameraMode === 'rgb' && !isDefectView) {
      markTestMediaReady()
    }
  }

  // ── 객체감지 SVG 색상 (심각도 기반) ──
  const severity = selectedDefect?.severity || 'HIGH'
  const severityHex = {
    HIGH: '#ef4444',  // red-500
    MED:  '#f97316',  // orange-500
    LOW:  '#eab308',  // yellow-500
  }[severity] || '#ef4444'

  // bbox 좌표 (원본 픽셀). naturalWidth 기반 SVG viewBox 와 1:1 매핑.
  const bbox = selectedDefect?.bbox
  const hasBbox = bbox && ['x1','y1','x2','y2'].every(k => typeof bbox[k] === 'number')
  // SVG preserveAspectRatio: img 의 object-cover/contain 과 일치시켜야 정렬 정확.
  const svgPreserveAspect = fill ? 'xMidYMid slice' : 'xMidYMid meet'

  // fill 모드: 부모(풀스크린 컨테이너) 를 꽉 채움. 일반 모드: 16/9 고정.
  const containerClass = fill
    ? 'relative w-full h-full bg-black overflow-hidden'
    : 'relative w-full bg-black rounded overflow-hidden'
  const containerStyle = fill ? undefined : { aspectRatio: '16/9' }
  const imgClass = fill
    ? 'w-full h-full object-cover'
    : 'w-full h-full object-contain'

  // fill 모드일 때 No-Signal 플레이스홀더는 "radar grid" 톤으로 — 풀스크린을 까맣게 두지 않기 위함.
  const noSignalBg = fill
    ? 'bg-[radial-gradient(ellipse_at_center,_rgba(15,23,42,0.9)_0%,_rgba(2,6,23,1)_100%)]'
    : ''

  return (
    <div className={containerClass} style={containerStyle}>
      {/* MJPEG 스트림 또는 하자 시점 정지 프레임 */}
      {!hasError ? (
        <>
          <img
            ref={imgRef}
            key={displayUrl}
            src={displayUrl}
            alt="드론 카메라 피드"
            className={imgClass}
            onLoad={handleImgLoad}
            onError={() => { if (!isDefectView) setHasError(true) }}
          />

          {/* ── R31 객체감지 모드: 스캔 sweep 오버레이 (scan 페이즈) ── */}
          {isDefectView && isDetectionMode && detectionPhase === 'scan' && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
              {/* 격자 (스캔 중 배경 그리드) */}
              <div
                className="absolute inset-0 bg-[linear-gradient(0deg,transparent_24%,rgba(34,211,238,0.4)_25%,rgba(34,211,238,0.4)_26%,transparent_27%,transparent_74%,rgba(34,211,238,0.4)_75%,rgba(34,211,238,0.4)_76%,transparent_77%),linear-gradient(90deg,transparent_24%,rgba(34,211,238,0.4)_25%,rgba(34,211,238,0.4)_26%,transparent_27%,transparent_74%,rgba(34,211,238,0.4)_75%,rgba(34,211,238,0.4)_76%,transparent_77%)] bg-[size:48px_48px]"
                style={{ animation: 'scanGridPulse 1.2s ease-in-out infinite' }}
              />
              {/* 스캔 라인 (위→아래 sweep) */}
              <div
                className="absolute left-0 right-0 h-[3px] bg-gradient-to-r from-cyan-400/0 via-cyan-300 to-cyan-400/0"
                style={{
                  animation: 'scanSweep 1.2s ease-in-out forwards',
                  boxShadow: '0 0 24px 8px rgba(34,211,238,0.55), 0 0 4px 2px rgba(34,211,238,0.9)',
                }}
              />
              {/* 우상단 SCANNING 라벨 */}
              <div className="absolute top-3 right-3 flex items-center gap-2 px-2.5 py-1 rounded bg-cyan-950/80 border border-cyan-400/60 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-ping" />
                <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-cyan-200">
                  SCANNING · AI DETECT
                </span>
              </div>
            </div>
          )}

          {/* ── R31 객체감지 모드: SVG bbox 오버레이 (detected 페이즈) ── */}
          {isDefectView && isDetectionMode && detectionPhase === 'detected' && hasBbox && imgNatural && (
            <svg
              className="absolute inset-0 pointer-events-none z-10"
              viewBox={`0 0 ${imgNatural.w} ${imgNatural.h}`}
              preserveAspectRatio={svgPreserveAspect}
              style={{ width: '100%', height: '100%', color: severityHex }}
            >
              {(() => {
                const x = bbox.x1
                const y = bbox.y1
                const w = bbox.x2 - bbox.x1
                const h = bbox.y2 - bbox.y1
                // 화면 전반 두께를 자연스럽게 — 원본 해상도 비례.
                const sw = Math.max(3, Math.round(imgNatural.w * 0.0035))
                // 코너 마커 길이.
                const cm = Math.max(20, Math.min(w, h) * 0.18)
                // 라벨 폰트 — 원본 해상도 기준 (SVG가 viewport 로 스케일).
                const fs = Math.max(18, Math.round(imgNatural.w * 0.018))
                const labelText = `${selectedDefect?.category_code || ''} ${selectedDefect?.defect_type || ''}`.trim()
                const labelPadX = fs * 0.6
                const labelPadY = fs * 0.4
                // 라벨 폭 추정 (한글 평균 1.0×fs, 영문/숫자 0.55×fs — 단순 추정).
                const labelW = labelText.length * fs * 0.85 + labelPadX * 2
                const labelH = fs + labelPadY * 2
                // 라벨이 위쪽으로 화면 밖이면 bbox 아래쪽으로.
                const labelY = (y - labelH - 6 < 0) ? (y + h + 6) : (y - labelH - 6)

                return (
                  <>
                    {/* 반투명 마스크 (영역 강조) */}
                    <rect
                      x={x} y={y} width={w} height={h}
                      fill={severityHex} fillOpacity="0.12"
                    />
                    {/* 메인 박스 — 펄스 + glow */}
                    <rect
                      x={x} y={y} width={w} height={h}
                      fill="none"
                      stroke={severityHex}
                      strokeWidth={sw}
                      style={{
                        animation: 'detectPulse 1.6s ease-in-out infinite, detectGlow 1.6s ease-in-out infinite',
                      }}
                    />
                    {/* 4 코너 마커 (브래킷 스타일) */}
                    <g
                      stroke={severityHex} strokeWidth={sw * 1.4} fill="none"
                      strokeLinecap="round"
                      strokeDasharray={cm * 2}
                      style={{ animation: 'detectCornerIn 0.5s ease-out forwards' }}
                    >
                      {/* TL */}
                      <polyline points={`${x},${y + cm} ${x},${y} ${x + cm},${y}`} />
                      {/* TR */}
                      <polyline points={`${x + w - cm},${y} ${x + w},${y} ${x + w},${y + cm}`} />
                      {/* BL */}
                      <polyline points={`${x},${y + h - cm} ${x},${y + h} ${x + cm},${y + h}`} />
                      {/* BR */}
                      <polyline points={`${x + w - cm},${y + h} ${x + w},${y + h} ${x + w},${y + h - cm}`} />
                    </g>
                    {/* 라벨 (bbox 위 또는 아래) */}
                    <g style={{ animation: 'detectLabelIn 0.5s ease-out 0.15s both' }}>
                      <rect
                        x={x} y={labelY} width={labelW} height={labelH}
                        fill={severityHex} rx={fs * 0.2}
                      />
                      <text
                        x={x + labelPadX} y={labelY + labelPadY + fs * 0.85}
                        fill="white" fontSize={fs} fontWeight="700"
                        style={{ fontFamily: 'system-ui, "Pretendard Variable", sans-serif' }}
                      >
                        {labelText}
                      </text>
                    </g>
                  </>
                )
              })()}
            </svg>
          )}

          {/* 하자 조회 모드 표시 배지 + confidence 카운트업 (detection 모드는 confidence chip 강조) */}
          {isDefectView && fill && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600/80 border border-red-400/60 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-[11px] font-mono font-bold text-white tracking-wider">
                  DEFECT VIEW — {selectedDefect?.category_code} {selectedDefect?.defect_type}
                </span>
              </div>
              {isDetectionMode && detectionPhase === 'detected' && typeof selectedDefect?.confidence === 'number' && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-emerald-900/80 border border-emerald-400/50 shadow-lg">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-300/80">conf</span>
                  <span className="text-[12px] font-mono font-bold text-emerald-200 tabular-nums">
                    {animatedConf.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          )}
        </>
      ) : fill ? (
        /* 풀스크린 No-Signal — 레이더 스캔/격자/타이포 */
        <div className={`relative flex flex-col items-center justify-center w-full h-full text-slate-500 ${noSignalBg}`}>
          {/* 배경 격자 */}
          <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(0deg,transparent_24%,rgba(99,102,241,0.8)_25%,rgba(99,102,241,0.8)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.8)_75%,rgba(99,102,241,0.8)_76%,transparent_77%),linear-gradient(90deg,transparent_24%,rgba(99,102,241,0.8)_25%,rgba(99,102,241,0.8)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.8)_75%,rgba(99,102,241,0.8)_76%,transparent_77%)] bg-[size:56px_56px]" />

          {/* 레이더 원 + 스캔 라인 */}
          <div className="relative w-40 h-40 mb-5">
            <div className="absolute inset-0 rounded-full border border-accent-500/20" />
            <div className="absolute inset-[15%] rounded-full border border-accent-500/25" />
            <div className="absolute inset-[32%] rounded-full border border-accent-500/30" />
            <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-accent-500/15" />
            <div className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 bg-accent-500/15" />
            <div className="absolute inset-0 rounded-full overflow-hidden">
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full w-px h-1/2 origin-bottom bg-gradient-to-t from-accent-400/70 to-transparent"
                style={{ animation: 'spin 3.5s linear infinite' }}
              />
            </div>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <span className="block w-2 h-2 rounded-full bg-accent-400" />
              <span className="absolute inset-0 w-2 h-2 rounded-full bg-accent-400 animate-ping opacity-60" />
            </div>
          </div>

          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse" />
            <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-accent-300">
              Awaiting Signal
            </span>
          </div>
          <div className="text-sm font-semibold text-slate-300 mb-1">
            {MODE_LABELS[cameraMode]} 스트림 대기 중
          </div>
          <div className="text-[10px] font-mono text-slate-600 tracking-wider">
            CAM · {cameraMode.toUpperCase()} · /api/v1/stream/{cameraMode}
          </div>

          <div className="mt-5 flex items-center gap-3 text-[10px] font-mono text-slate-600">
            <span className="flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-neutral-600" />
              ENCODER IDLE
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-neutral-600" />
              WS PENDING
            </span>
          </div>
          <button
            className="mt-4 text-[11px] font-mono uppercase tracking-widest text-accent-400 hover:text-accent-300 border-b border-accent-500/30 hover:border-accent-500/60 pb-0.5 transition"
            onClick={() => setHasError(false)}
          >
            재연결 시도
          </button>
        </div>
      ) : (
        /* 컴팩트 No-Signal (PIP 등 작은 박스) */
        <div className="flex flex-col items-center justify-center w-full h-full text-slate-500">
          <span className="text-2xl mb-1 opacity-60">📷</span>
          <span className="text-xs font-mono tracking-wider">No Signal</span>
          <button
            className="mt-2 text-[10px] text-brand-500 hover:underline"
            onClick={() => setHasError(false)}
          >
            재연결
          </button>
        </div>
      )}

      {/* 로딩 오버레이 */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* fill 모드에서는 상단 뱃지/LIVE 표시는 Dashboard 의 자체 HUD 에서 처리 — 여기서는 숨김 */}
      {!fill && (
        <>
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 rounded text-xs text-white font-mono">
            {MODE_LABELS[cameraMode]}
          </div>
          <div className="absolute top-2 right-2 flex items-center gap-1">
            {isDefectView ? (
              <>
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs text-red-400 font-mono">DEFECT</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs text-white/70">LIVE</span>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
