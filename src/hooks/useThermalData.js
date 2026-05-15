/**
 * hooks/useThermalData.js
 * 역할: 열화상 온도 데이터 슬라이딩 윈도우 — thermalStore 셀렉터 래퍼.
 *
 *   실데이터는 모듈 싱글톤 store(thermalStore)에 저장되어 useWebSocket 의
 *   'thermal.frame' / 'thermal.analysis' 핸들러가 직접 push 한다.
 *   ThermalGraph 등 컴포넌트는 이 훅으로 readings 만 읽고 렌더링한다.
 */

import useThermalStore from '../store/thermalStore.js'

export default function useThermalData() {
  const readings = useThermalStore((s) => s.readings)
  const pushReading = useThermalStore((s) => s.pushReading)
  const clearReadings = useThermalStore((s) => s.clearReadings)
  return { readings, pushReading, clearReadings }
}
