/**
 * hooks/useVideoDetectionReveal.js
 * 역할: 영상 직접재생(test) 모드에서 하자 카드 목록을 <video> 재생 시간에 게이팅.
 *       - testDetectionsStore 의 검출(시간 인덱싱)을 currentTime 이 검출 시점에 도달할 때
 *         defectStore.addDefect 로 노출 → "목록이 영상보다 앞서가는" 현상 제거.
 *       - DetectionOverlay(박스)와 동일 타임라인 기준 → 박스와 카드가 함께 등장.
 *       - active video(파일명) 바뀌면 reveal 추적 초기화.
 *
 * 왜 필요한가: backend 영상 추론(_video_inference_loop)은 실시간보다 빠르게 끝나 모든 검출을
 *   즉시 WS broadcast 한다. 목록을 수신 즉시 채우면 영상보다 한참 앞서 카드가 쌓인다.
 *   사용자 기대 흐름: 스트리밍 중 그 시점에 bbox·검출·카드가 함께 등장 → 재생 시간으로 게이팅.
 */
import { useEffect, useRef } from 'react'
import useTestDetectionsStore from '../store/testDetectionsStore.js'
import useDefectStore from '../store/defectStore.js'

// 카드가 박스와 함께 등장하도록 검출 시점 직전(LEAD)부터 노출. DetectionOverlay.LEAD_SEC 와 일치.
const REVEAL_LEAD_SEC = 0.25

export default function useVideoDetectionReveal(videoRef, enabled) {
  const revealedRef = useRef(new Set())
  const lastFilenameRef = useRef(null)

  useEffect(() => {
    if (!enabled) return
    let raf = 0
    const tick = () => {
      const store = useTestDetectionsStore.getState()
      // active video 교체 시 reveal 추적 초기화 — 새 영상은 처음부터 다시 게이팅.
      if (store.activeFilename !== lastFilenameRef.current) {
        lastFilenameRef.current = store.activeFilename
        revealedRef.current = new Set()
      }
      const v = videoRef.current
      if (v) {
        const t = v.currentTime
        const defectStore = useDefectStore.getState()
        // detections 는 video_timestamp_sec 오름차순 정렬 → 시점 지난 것만 노출, 넘으면 break.
        for (const d of store.detections) {
          if (d.video_timestamp_sec > t + REVEAL_LEAD_SEC) break
          if (revealedRef.current.has(d.id)) continue
          revealedRef.current.add(d.id)
          // autoSelect=false: 목록에만 추가(선택 미변경) — 카드클릭→seek 오발동 방지.
          defectStore.addDefect(d, false) // id 중복은 addDefect 가 차단

        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [enabled, videoRef])
}
