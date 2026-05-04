/**
 * hooks/useThermalData.js
 * 역할: 열화상 온도 데이터 누적 관리 훅 (Recharts 그래프용)
 *       - WebSocket "thermal.frame" 이벤트 수신 시 데이터 추가
 *       - 슬라이딩 윈도우(최근 120개 샘플)로 그래프 데이터 유지
 *       - max/min/avg 3개 라인 데이터 제공
 */

import { useState, useEffect, useRef } from 'react'

const MAX_SAMPLES = 120  // 슬라이딩 윈도우 크기 (초 단위 @ 1fps)

/**
 * 열화상 온도 데이터 슬라이딩 윈도우 훅.
 * WebSocket 이벤트를 직접 구독하지 않고 외부에서 pushReading()을 호출하는 방식.
 */
export default function useThermalData() {
  const [readings, setReadings] = useState([])
  const counterRef = useRef(0)

  /** 새 온도 데이터 추가 (WS 이벤트 핸들러에서 호출) */
  const pushReading = (data) => {
    counterRef.current += 1
    const point = {
      t: counterRef.current,
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      max: data.max ?? null,
      min: data.min ?? null,
      avg: data.avg ?? null,
    }
    setReadings((prev) => {
      const updated = [...prev, point]
      return updated.length > MAX_SAMPLES ? updated.slice(-MAX_SAMPLES) : updated
    })
  }

  /** 데이터 초기화 */
  const clearReadings = () => {
    setReadings([])
    counterRef.current = 0
  }

  return { readings, pushReading, clearReadings }
}
