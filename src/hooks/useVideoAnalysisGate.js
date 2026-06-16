/**
 * hooks/useVideoAnalysisGate.js
 * 역할: "분석 먼저 → 동기화 재생" — 영상 업로드 후 AI 분석이 충분히 진행될 때까지 재생을
 *       보류하고, 준비되면 처음부터 재생 → 박스(DetectionOverlay)와 목록이 재생과 완벽 동기화.
 *
 * 왜: VLM 추론이 실시간보다 느려 즉시 재생하면 박스가 안 뜬다(검출이 그 순간 지난 뒤 도착).
 *     분석을 먼저 돌리고(진행률 표시) 재생하면, 재생 중 그 시점마다 박스가 뜨는 '실시간 검출'
 *     경험이 된다. 백엔드 완료 신호 없이도 동작하도록 휴리스틱 + 하드 폴백으로 안전하게.
 *
 * 준비 판정(게이트 완화 — "전체 분석 대기" → "리드 버퍼 확보 시 즉시 재생"):
 *   - 분석 프런티어(maxTs) = 본 검출(testDetections) + 의사색 스크리닝(thermalScreening)의
 *     최신 timestamp 중 큰 값. 열화상 영상은 본 검출이 드물어도 스크리닝이 키프레임마다 떠서
 *     프런티어가 빠르게 전진 → 체감 지연 제거.
 *   - 즉시 출발: 프런티어가 재생 헤드(0초)보다 READY_LEAD_SEC 만큼 앞서면 바로 재생.
 *   - 짧은 영상: 리드가 영상 길이보다 길면 커버리지 일부(SHORT_COVER)만 확보돼도 출발.
 *   - 1순위 즉시통과: 백엔드 analysis_complete 신호가 이미 와 있으면 무조건 즉시 ready.
 *   - 안전 폴백: 검출이 영영 안 와도 멈추지 않도록 hardMax 경과 시 무조건 재생(짧게 — 오버레이가
 *     hold+fade 로 늦게 도착하는 박스를 흡수하므로, 길게 기다릴 이유가 없다).
 *   진행률: maxTs/duration 커버리지로 표시(분석이 영상을 얼마나 훑었는지).
 *
 * 주의: 한 번 ready=true 가 되면 다시 false 로 내리지 않는다(재생 중 깜빡임 방지). 재생이
 *   분석 프런티어를 추월하면 그 구간 박스는 잠시 비지만, 분석이 곧 따라잡아 복구된다.
 */
import { useEffect, useState } from 'react'
import useTestDetectionsStore from '../store/testDetectionsStore.js'
import useThermalScreeningStore from '../store/thermalScreeningStore.js'

// 재생 시작 전 확보할 분석 리드(초). 재생 헤드가 분석 프런티어를 곧장 추월하지 않을 만큼.
const READY_LEAD_SEC = 3
// 짧은 영상(리드 확보 불가)에서 출발을 허용할 최소 커버리지.
const SHORT_COVER = 0.5

export default function useVideoAnalysisGate(enabled, duration, analysisComplete) {
  const [ready, setReady] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!enabled) { setReady(false); setProgress(0); return }
    // 1순위: 백엔드 분석 완료 신호가 이미 와 있으면 즉시 통과.
    if (analysisComplete) { setProgress(1); setReady(true); return }
    const start = performance.now()
    // 안전 폴백(검출 0건이어도 멈추지 않게) — 짧게. 늦게 오는 박스는 오버레이가 hold+fade 로 흡수.
    const hardMax = Math.max(6, (duration || 0) * 0.5)
    // 짧은 영상은 리드를 영상 길이의 절반 이내로 제한(리드 > 길이면 영영 출발 못 함).
    const leadTarget = duration ? Math.min(READY_LEAD_SEC, duration * SHORT_COVER) : READY_LEAD_SEC
    let done = false
    const iv = setInterval(() => {
      if (done) return
      // 분석 프런티어 = 본 검출 + 의사색 스크리닝의 최신 video_timestamp 중 큰 값.
      const dets = useTestDetectionsStore.getState().detections
      const scr = useThermalScreeningStore.getState().items
      const detMax = dets.length ? dets[dets.length - 1].video_timestamp_sec : 0
      const scrMax = scr.length ? scr[scr.length - 1].video_timestamp_sec : 0
      const maxTs = Math.max(detMax, scrMax)
      const elapsed = (performance.now() - start) / 1000
      const cover = duration ? Math.min(1, maxTs / duration) : 0
      setProgress(Math.min(0.99, Math.max(cover, elapsed / hardMax)))
      // 리드 버퍼 확보 → 즉시 출발(전체 분석을 기다리지 않음).
      if (maxTs >= leadTarget) { done = true; setProgress(1); setReady(true); return }
      // 안전 폴백: 검출이 영영 안 와도 멈추지 않도록.
      if (elapsed > hardMax) { done = true; setProgress(1); setReady(true) }
    }, 200)
    return () => clearInterval(iv)
  }, [enabled, duration, analysisComplete])

  return { ready, progress }
}
