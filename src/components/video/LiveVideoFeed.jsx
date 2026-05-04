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
 */

import { useState } from 'react'
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
  const selectedDefect = useDefectStore((s) => s.selectedDefect)
  // mode prop 이 주어지면 store 무시 — 멀티 피드(메인 + PIP 다른 드론) 렌더링 용도.
  const cameraMode = mode ?? storeCameraMode
  const [hasError, setHasError] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  const urls = isTestMode ? TEST_STREAM_URLS : STREAM_URLS
  const streamUrl = urls[cameraMode] || STREAM_URLS.rgb

  // 테스트 모드 + 하자 선택 시 → 해당 시점 프레임(bbox/detection 오버레이 포함) 표시
  const testDetectionMode = useSessionStore((s) => s.testDetectionMode)
  const channel = cameraMode === 'thermal' ? 'thermal' : 'rgb'
  const defectFrameUrl =
    isTestMode && selectedDefect?.id
      ? `${API_BASE}/api/v1/stream/test/defect/${selectedDefect.id}/${channel}?mode=${testDetectionMode}`
      : null
  const displayUrl = defectFrameUrl || streamUrl
  const isDefectView = !!defectFrameUrl

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
            key={displayUrl}
            src={displayUrl}
            alt="드론 카메라 피드"
            className={imgClass}
            onLoad={() => setIsLoaded(true)}
            onError={() => { if (!isDefectView) setHasError(true) }}
          />
          {/* 하자 조회 모드 표시 배지 */}
          {isDefectView && fill && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600/80 border border-red-400/60 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-[11px] font-mono font-bold text-white tracking-wider">
                  DEFECT VIEW — {selectedDefect?.category_code} {selectedDefect?.defect_type}
                </span>
              </div>
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
