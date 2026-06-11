/**
 * hooks/useVideoAnalysisGate.js
 * 역할: "분석 먼저 → 동기화 재생" — 영상 업로드 후 AI 분석이 충분히 진행될 때까지 재생을
 *       보류하고, 준비되면 처음부터 재생 → 박스(DetectionOverlay)와 목록이 재생과 완벽 동기화.
 *
 * 왜: VLM 추론이 실시간보다 느려 즉시 재생하면 박스가 안 뜬다(검출이 그 순간 지난 뒤 도착).
 *     분석을 먼저 돌리고(진행률 표시) 재생하면, 재생 중 그 시점마다 박스가 뜨는 '실시간 검출'
 *     경험이 된다. 백엔드 완료 신호 없이도 동작하도록 휴리스틱 + 하드 폴백으로 안전하게.
 *
 * 준비 판정(아래 중 하나):
 *   - 커버리지: 마지막 검출의 video_timestamp_sec 가 영상 길이의 COVER_RATIO 이상
 *   - stall: 첫 검출 후 STALL_SEC 동안 새 검출 없음(분석이 사실상 끝남)
 *   - 하드 폴백: MAX_WAIT_SEC 경과(분석이 멈췄거나 신호 못 받아도 무조건 재생)
 */
import { useEffect, useState } from 'react'
import useTestDetectionsStore from '../store/testDetectionsStore.js'

const MAX_WAIT_SEC = 90    // 하드 폴백 — 이 시간 지나면 무조건 재생
const STALL_SEC = 12       // 마지막 검출 후 이만큼 새 검출 없으면 분석 끝으로 간주
const MIN_WAIT_SEC = 6     // 최소 대기(첫 검출 도착 전 stall 오판 방지)
const COVER_RATIO = 0.85   // maxTs 가 길이의 이 비율 넘으면 충분

export default function useVideoAnalysisGate(enabled, duration) {
  const [ready, setReady] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!enabled) { setReady(false); setProgress(0); return }
    const start = performance.now()
    let lastCount = 0
    let lastChange = start
    let done = false
    const iv = setInterval(() => {
      if (done) return
      const dets = useTestDetectionsStore.getState().detections
      const now = performance.now()
      const elapsed = (now - start) / 1000
      if (dets.length !== lastCount) { lastCount = dets.length; lastChange = now }
      const sinceChange = (now - lastChange) / 1000
      // detections 는 video_timestamp_sec 오름차순 정렬 → 마지막이 최대.
      const maxTs = dets.length ? dets[dets.length - 1].video_timestamp_sec : 0
      const cover = duration ? Math.min(1, maxTs / duration) : 0
      setProgress(duration ? Math.min(0.99, cover) : Math.min(0.99, elapsed / MAX_WAIT_SEC))
      if (
        (duration && cover >= COVER_RATIO) ||
        (elapsed > MIN_WAIT_SEC && dets.length > 0 && sinceChange > STALL_SEC) ||
        (elapsed > MAX_WAIT_SEC)
      ) {
        done = true
        setProgress(1)
        setReady(true)
      }
    }, 250)
    return () => clearInterval(iv)
  }, [enabled, duration])

  return { ready, progress }
}
