/**
 * hooks/useVideoAnalysisGate.js
 * 역할: "분석 먼저 → 동기화 재생" — 영상 업로드 후 AI 분석이 충분히 진행될 때까지 재생을
 *       보류하고, 준비되면 처음부터 재생 → 박스(DetectionOverlay)와 목록이 재생과 완벽 동기화.
 *
 * 왜: VLM 추론이 실시간보다 느려 즉시 재생하면 박스가 안 뜬다(검출이 그 순간 지난 뒤 도착).
 *     분석을 먼저 돌리고(진행률 표시) 재생하면, 재생 중 그 시점마다 박스가 뜨는 '실시간 검출'
 *     경험이 된다. 백엔드 완료 신호 없이도 동작하도록 휴리스틱 + 하드 폴백으로 안전하게.
 *
 * 준비 판정:
 *   - 1순위: 백엔드 analysis_complete 신호(active_media) — 영상 끝까지 분석 끝났다는 정확한 신호.
 *            이게 와야 재생 → 첫 재생부터 '모든' 키프레임 박스가 일관되게 뜬다(들쭉날쭉 제거).
 *   - 안전 폴백: 신호를 영영 못 받을 때만, 영상 길이 비례 hardMax 경과 시 무조건 재생.
 *   진행률: maxTs/duration 커버리지로 표시(분석이 영상을 얼마나 훑었는지).
 */
import { useEffect, useState } from 'react'
import useTestDetectionsStore from '../store/testDetectionsStore.js'

export default function useVideoAnalysisGate(enabled, duration, analysisComplete) {
  const [ready, setReady] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!enabled) { setReady(false); setProgress(0); return }
    // 1순위: 백엔드 분석 완료 신호.
    if (analysisComplete) { setProgress(1); setReady(true); return }
    const start = performance.now()
    // 신호 못 받을 때만 쓰는 안전 폴백 — 영상 길이 비례로 넉넉히(긴 영상도 잘리지 않게).
    const hardMax = Math.max(180, (duration || 0) * 4)
    let done = false
    const iv = setInterval(() => {
      if (done) return
      const dets = useTestDetectionsStore.getState().detections
      const elapsed = (performance.now() - start) / 1000
      const maxTs = dets.length ? dets[dets.length - 1].video_timestamp_sec : 0
      const cover = duration ? Math.min(1, maxTs / duration) : 0
      setProgress(Math.min(0.99, Math.max(cover, elapsed / hardMax)))
      if (elapsed > hardMax) { done = true; setProgress(1); setReady(true) }
    }, 250)
    return () => clearInterval(iv)
  }, [enabled, duration, analysisComplete])

  return { ready, progress }
}
