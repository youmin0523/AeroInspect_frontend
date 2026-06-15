/**
 * components/video/ThermalScreeningOverlay.jsx
 * 역할: 열화상(Drone2) 직접재생 영상 위에 '의사색 단열 스크리닝' 결과를 SVG 오버레이.
 *       - thermalScreeningStore.items 를 video.currentTime ± hold 로 선별(키프레임 sparse → hold+fade)
 *       - 본 검출(DetectionOverlay)과 구분되는 시안 점선 + "단열 의심" 태그 (보고서 미적재 표시)
 *       - viewBox = frame_w × frame_h, preserveAspectRatio="xMidYMid slice" (video object-cover 일치)
 *
 * ⚠️ 스크리닝 보조 — 컬러바 부재/압축 한계로 상대 색이상 기반. 확정 진단 아님(점검자 수동 채택).
 */

import { useEffect, useState } from 'react'
import useThermalScreeningStore from '../../store/thermalScreeningStore.js'

// 키프레임 sparse 검출 hold+fade (DetectionOverlay 와 동일 정책).
const LEAD_SEC = 0.25
const HOLD_SEC = 1.8
const FADE_START_SEC = 1.0

function opacityForAge(age) {
  if (age < -LEAD_SEC || age > HOLD_SEC) return 0
  if (age <= FADE_START_SEC) return 1
  return Math.max(0, 1 - (age - FADE_START_SEC) / (HOLD_SEC - FADE_START_SEC))
}

const SCREEN_HEX = '#22d3ee'  // cyan-400 — 본 검출(심각도 색)과 구분

export default function ThermalScreeningOverlay({ videoRef, frameW, frameH }) {
  const items = useThermalScreeningStore((s) => s.items)
  const [active, setActive] = useState([])

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const v = videoRef.current
      if (v && !v.ended) {
        const t = v.currentTime
        const hits = []
        for (const a of items) {
          const op = opacityForAge(t - a.video_timestamp_sec)
          if (op > 0) hits.push({ ...a, _opacity: op })
        }
        setActive(hits)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [items, videoRef])

  const vbW = frameW || active[0]?.frame_w
  const vbH = frameH || active[0]?.frame_h
  if (!vbW || !vbH || active.length === 0) return null

  const sw = Math.max(2, Math.round(vbW * 0.0028))
  const dash = Math.max(8, Math.round(vbW * 0.014))
  const fs = Math.max(15, Math.round(vbW * 0.015))

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-10"
      viewBox={`0 0 ${vbW} ${vbH}`}
      preserveAspectRatio="xMidYMid slice"
      style={{ width: '100%', height: '100%' }}
    >
      {active.map((a) => {
        const b = a.bbox || {}
        const x = b.x1, y = b.y1
        const w = (b.x2 ?? 0) - (b.x1 ?? 0)
        const h = (b.y2 ?? 0) - (b.y1 ?? 0)
        if (!w || !h) return null
        const isSpot = a.kind === 'spot'
        const label = isSpot ? '단열 의심·점' : '단열 의심·면'
        const labelW = label.length * fs * 0.95 + fs * 0.8
        const labelH = fs + fs * 0.5
        const labelY = (y - labelH - 4 < 0) ? (y + h + 4) : (y - labelH - 4)
        return (
          <g key={a.id} opacity={a._opacity ?? 1} style={{ transition: 'opacity 80ms linear' }}>
            {isSpot ? (
              <ellipse
                cx={x + w / 2} cy={y + h / 2} rx={w / 2 + sw} ry={h / 2 + sw}
                fill={SCREEN_HEX} fillOpacity="0.08"
                stroke={SCREEN_HEX} strokeWidth={sw} strokeDasharray={`${dash} ${dash * 0.7}`}
              />
            ) : (
              <rect
                x={x} y={y} width={w} height={h}
                fill={SCREEN_HEX} fillOpacity="0.07"
                stroke={SCREEN_HEX} strokeWidth={sw} strokeDasharray={`${dash} ${dash * 0.7}`}
              />
            )}
            <rect x={x} y={labelY} width={labelW} height={labelH} fill={SCREEN_HEX} rx={fs * 0.2} />
            <text
              x={x + fs * 0.4} y={labelY + fs * 0.5 + fs * 0.78}
              fill="#06283d" fontSize={fs} fontWeight="700"
              style={{ fontFamily: 'system-ui, "Pretendard Variable", sans-serif' }}
            >
              {label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
