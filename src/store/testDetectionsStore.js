/**
 * store/testDetectionsStore.js
 * 역할: test_mode 영상 직접재생 모드용 detection 타임라인 보관.
 *       - WS "defect.new" 의 video_timestamp_sec 가 채워진 detection을 시간순 인덱싱
 *       - DetectionOverlay 가 <video>.currentTime 과 ±window 비교로 표시 대상 선별
 *       - 영상 교체(active.filename 변경) 시 자동 clear
 *
 * 왜 defectStore 와 분리하나?
 *   defectStore.defects 는 카드 패널용 누적 목록(최근 500건, 신규가 상단).
 *   여기는 <video> 시간축 동기화용 — duplicate id 가 들어와도 timestamp 순으로 정렬돼야 함.
 *   책임을 섞으면 카드 표시/오버레이 표시가 한 store 의 정렬에 종속되어 깨지기 쉽다.
 */

import { create } from 'zustand'

const MAX_DETECTIONS = 1000   // 영상 길이 × fps 고려해도 1000건이면 충분

const useTestDetectionsStore = create((set, get) => ({
  // 현재 active video 파일명 — 바뀌면 detections clear.
  activeFilename: null,
  // 시간 정렬된 detection 배열. 각 원소: { id, video_timestamp_sec, bbox, frame_w, frame_h, ... }
  detections: [],

  /** active video 메타 변경 시 호출. 파일명 같으면 noop, 다르면 clear. */
  setActiveFilename: (filename) => {
    if (filename === get().activeFilename) return
    set({ activeFilename: filename, detections: [] })
  },

  /** WS defect.new 수신 시 timestamp 가 있는 detection만 수집. */
  ingest: (data) => {
    if (typeof data?.video_timestamp_sec !== 'number') return
    if (!data?.bbox) return
    set((state) => {
      // 더블 발사(WS 재연결/StrictMode)만 차단 — (id + 같은 timestamp) 일 때만 중복으로 간주.
      // ⚠️ id 만으로 dedup 하면, 시간적 합의(_track_video_defect)가 같은 하자에 id 를 재사용하므로
      //    지속 검출되는 하자(예: 균열)의 2번째 키프레임부터 전부 버려져 → 첫 박스만 잠깐 뜨고 사라짐.
      //    timestamp 까지 비교해 같은 하자의 '각 시점' 검출을 모두 타임라인에 남긴다(연속 오버레이).
      if (state.detections.some(
        (d) => d.id === data.id && d.video_timestamp_sec === data.video_timestamp_sec
      )) return state
      const next = [...state.detections, data]
      // timestamp 오름차순 정렬 — 검색 시 binary search 또는 단순 filter 모두 OK.
      next.sort((a, b) => a.video_timestamp_sec - b.video_timestamp_sec)
      return { detections: next.slice(-MAX_DETECTIONS) }
    })
  },

  /** 현재 video.currentTime 기준 ±window 안의 detection 반환. */
  getActiveAt: (currentTime, windowSec = 0.4) => {
    const dets = get().detections
    return dets.filter(
      (d) => Math.abs(d.video_timestamp_sec - currentTime) <= windowSec,
    )
  },

  reset: () => set({ activeFilename: null, detections: [] }),
}))

export default useTestDetectionsStore
