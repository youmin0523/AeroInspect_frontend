/**
 * components/video/DetectionOverlay.jsx
 * 역할: test_mode 영상 직접재생 모드에서 <video> 위에 SVG bbox 오버레이.
 *       - testDetectionsStore 의 detections 를 video.currentTime ± window 로 선별
 *       - viewBox = frame_w × frame_h 로 두면 원본 좌표가 그대로 매핑됨
 *       - preserveAspectRatio="xMidYMid slice" 로 <video>의 object-cover 와 일치
 *       - requestAnimationFrame 으로 currentTime 폴링(33ms 간격) — 영상 fps 와 무관하게 부드러운 표시
 *
 * Why SVG (not Canvas)?
 *   - GPU 컴포지트로 그려져 fps 부담이 거의 없음
 *   - LiveVideoFeed 의 detection 모드 SVG 와 디자인 통일성(코너 마커, glow)
 */

import { useEffect, useRef, useState } from 'react'
import useTestDetectionsStore from '../../store/testDetectionsStore.js'

// 검출 카드를 그릴 시간 윈도우(초). 너무 좁으면 깜빡임, 너무 넓으면 여러 박스 겹침.
const TIME_WINDOW_SEC = 0.4

const SEVERITY_HEX = {
  HIGH: '#ef4444',
  MED:  '#f97316',
  LOW:  '#eab308',
}

export default function DetectionOverlay({ videoRef, frameW, frameH }) {
  const detections = useTestDetectionsStore((s) => s.detections)
  const [activeAt, setActiveAt] = useState([])

  // ── currentTime 폴링 (rAF) ────────────────────────
  // <video> timeupdate 이벤트는 250ms 정도 간격이라 끊겨 보임 → rAF 로 33ms 갱신.
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const v = videoRef.current
      if (v && !v.paused && !v.ended) {
        const t = v.currentTime
        const hits = detections.filter(
          (d) => Math.abs(d.video_timestamp_sec - t) <= TIME_WINDOW_SEC,
        )
        setActiveAt(hits)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [detections, videoRef])

  // frame 크기를 모르면 viewBox 매핑 불가 — 첫 detection 의 frame_w/h 폴백
  const vbW = frameW || activeAt[0]?.frame_w
  const vbH = frameH || activeAt[0]?.frame_h
  if (!vbW || !vbH || activeAt.length === 0) return null

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-10"
      viewBox={`0 0 ${vbW} ${vbH}`}
      preserveAspectRatio="xMidYMid slice"
      style={{ width: '100%', height: '100%' }}
    >
      {activeAt.map((d) => {
        const b = d.bbox || {}
        const x = b.x1, y = b.y1
        const w = (b.x2 ?? 0) - (b.x1 ?? 0)
        const h = (b.y2 ?? 0) - (b.y1 ?? 0)
        if (!w || !h) return null
        const color = SEVERITY_HEX[d.severity] || SEVERITY_HEX.HIGH
        // 두께/코너 길이/폰트는 원본 해상도 비례 — viewBox 가 곧 scale.
        const sw = Math.max(3, Math.round(vbW * 0.0035))
        const cm = Math.max(20, Math.min(w, h) * 0.18)
        const fs = Math.max(18, Math.round(vbW * 0.018))
        const label = `${d.category_code || ''} ${d.defect_type || ''}`.trim()
        const padX = fs * 0.6
        const padY = fs * 0.4
        const labelW = label.length * fs * 0.85 + padX * 2
        const labelH = fs + padY * 2
        const labelY = (y - labelH - 6 < 0) ? (y + h + 6) : (y - labelH - 6)
        return (
          <g key={d.id}>
            {/* 반투명 마스크 */}
            <rect x={x} y={y} width={w} height={h} fill={color} fillOpacity="0.12" />
            {/* 메인 박스 */}
            <rect
              x={x} y={y} width={w} height={h}
              fill="none" stroke={color} strokeWidth={sw}
            />
            {/* 4 코너 브래킷 */}
            <g stroke={color} strokeWidth={sw * 1.4} fill="none" strokeLinecap="round">
              <polyline points={`${x},${y + cm} ${x},${y} ${x + cm},${y}`} />
              <polyline points={`${x + w - cm},${y} ${x + w},${y} ${x + w},${y + cm}`} />
              <polyline points={`${x},${y + h - cm} ${x},${y + h} ${x + cm},${y + h}`} />
              <polyline points={`${x + w - cm},${y + h} ${x + w},${y + h} ${x + w},${y + h - cm}`} />
            </g>
            {/* 라벨 */}
            <rect x={x} y={labelY} width={labelW} height={labelH} fill={color} rx={fs * 0.2} />
            <text
              x={x + padX} y={labelY + padY + fs * 0.85}
              fill="white" fontSize={fs} fontWeight="700"
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
