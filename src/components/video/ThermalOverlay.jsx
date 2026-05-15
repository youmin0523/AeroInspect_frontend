/**
 * components/video/ThermalOverlay.jsx
 * 역할: 열화상 모드일 때 영상 위에 표시되는 컴팩트 온도 HUD
 *       - thermalStore 의 최신 readings 에서 max/avg/min 추출
 *       - max - avg 편차가 alertThreshold(기본 +3°C) 이상이면 경고 펄스
 *       - 데이터가 아직 없으면 "대기 중" 플레이스홀더
 *
 *   데이터 출처: useWebSocket 이 thermal 채널에서 받은 thermal.frame /
 *   thermal.analysis 이벤트를 thermalStore.pushReading() 으로 push.
 */

import useThermalStore from '../../store/thermalStore.js'

const fmtTemp = (v) => (typeof v === 'number' ? `${v.toFixed(1)}°C` : '—')

export default function ThermalOverlay({ visible = false, alertThreshold = 3 }) {
  const readings = useThermalStore((s) => s.readings)

  if (!visible) return null

  const latest = readings.length > 0 ? readings[readings.length - 1] : null

  if (!latest) {
    return (
      <div className="absolute top-3 right-3 z-20 pointer-events-none px-2.5 py-1.5 rounded bg-slate-950/70 border border-slate-700/60 backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            THERMAL · 데이터 대기 중
          </span>
        </div>
      </div>
    )
  }

  const { max, avg, min } = latest
  const hasDelta = typeof max === 'number' && typeof avg === 'number'
  const delta = hasDelta ? max - avg : null
  const isAlert = delta !== null && delta >= alertThreshold

  return (
    <div
      className={`absolute top-3 right-3 z-20 pointer-events-none flex flex-col gap-0.5 px-2.5 py-1.5 rounded bg-slate-950/75 backdrop-blur-sm border ${
        isAlert
          ? 'border-red-500/60 shadow-[0_0_18px_rgba(239,68,68,0.45)]'
          : 'border-slate-700/60'
      }`}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isAlert ? 'bg-red-400 animate-pulse' : 'bg-emerald-400'
          }`}
        />
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-300">
          THERMAL{isAlert ? ' · ALERT' : ''}
        </span>
        {delta !== null && (
          <span
            className={`text-[10px] font-mono tabular-nums ml-auto ${
              isAlert ? 'text-red-300' : 'text-slate-500'
            }`}
          >
            Δ{delta >= 0 ? '+' : ''}{delta.toFixed(1)}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2 font-mono tabular-nums">
        <span className="text-[10px] w-7 text-red-300/80">MAX</span>
        <span className="text-sm font-bold text-red-300">{fmtTemp(max)}</span>
      </div>
      <div className="flex items-baseline gap-2 font-mono tabular-nums">
        <span className="text-[10px] w-7 text-orange-300/80">AVG</span>
        <span className="text-sm text-orange-300">{fmtTemp(avg)}</span>
      </div>
      <div className="flex items-baseline gap-2 font-mono tabular-nums">
        <span className="text-[10px] w-7 text-sky-300/80">MIN</span>
        <span className="text-sm text-sky-300">{fmtTemp(min)}</span>
      </div>
    </div>
  )
}
