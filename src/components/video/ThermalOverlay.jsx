/**
 * components/video/ThermalOverlay.jsx
 * 역할: 열화상 전용 Canvas 오버레이 컴포넌트
 *       - 온도 데이터를 Canvas에 직접 렌더링 (blend 미사용 시 활용)
 *       - 온도 범위에 따른 그라디언트 컬러맵 표시 (파랑→빨강)
 *       - 현재는 향후 확장을 위한 기본 구조 제공
 */

import { useEffect, useRef } from 'react'

export default function ThermalOverlay({ width = 640, height = 480, visible = false }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!visible || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    // TODO: WebSocket thermal.frame 데이터 수신 시 여기에 렌더링
    // 현재는 투명 오버레이만 표시
    ctx.clearRect(0, 0, width, height)
  }, [visible, width, height])

  if (!visible) return null

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 w-full h-full pointer-events-none opacity-60"
    />
  )
}
