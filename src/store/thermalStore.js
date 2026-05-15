/**
 * store/thermalStore.js
 * 역할: 열화상 온도 데이터 슬라이딩 윈도우 (Zustand 모듈 싱글톤).
 *       useWebSocket('thermal.frame' / 'thermal.analysis') 에서 pushReading() 호출 →
 *       ThermalGraph 등 구독자가 readings 수신.
 *
 *   이전에는 useThermalData 가 컴포넌트별 useState 였기 때문에 WS 핸들러에서
 *   직접 푸시할 수 없었음 (인스턴스 분리). 모듈 싱글톤 store 로 옮겨서 다중 채널
 *   WS 구독과 호환되도록 정리.
 */

import { create } from 'zustand'

const MAX_SAMPLES = 120  // 슬라이딩 윈도우 크기 (초 단위 @ 1fps)

const useThermalStore = create((set, get) => ({
  readings: [],
  _counter: 0,

  pushReading: (data) => {
    if (!data) return
    const next = get()._counter + 1
    const point = {
      t: next,
      time: new Date().toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      max: data.max ?? null,
      min: data.min ?? null,
      avg: data.avg ?? null,
    }
    set((s) => {
      const updated = [...s.readings, point]
      return {
        _counter: next,
        readings: updated.length > MAX_SAMPLES ? updated.slice(-MAX_SAMPLES) : updated,
      }
    })
  },

  clearReadings: () => set({ readings: [], _counter: 0 }),
}))

export default useThermalStore
