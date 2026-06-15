/**
 * store/thermalScreeningStore.js
 * 역할: 열화상(Drone2) 영상의 '의사색 단열 스크리닝' 결과 타임라인 보관.
 *       - WS "thermal.screening" 이벤트(키프레임별 anomalies)를 시간순 인덱싱
 *       - ThermalScreeningOverlay 가 <video>.currentTime ± hold 로 표시 대상 선별
 *       - 영상 교체(active.filename 변경) 시 자동 clear
 *
 * 왜 testDetectionsStore / defectStore 와 분리하나?
 *   이것은 '스크리닝 보조' 표시 전용 — 보고서 DB 에 적재되지 않고 하자 카드로도 만들지 않는다.
 *   본 검출(defect.new) 파이프라인과 책임/수명주기를 섞지 않기 위해 독립 store.
 */

import { create } from 'zustand'

const MAX_ITEMS = 2000

const useThermalScreeningStore = create((set, get) => ({
  activeFilename: null,
  // 평탄화된 anomaly 배열. 각 원소: { id, video_timestamp_sec, frame_w, frame_h, bbox, kind, severity, score }
  items: [],

  /** active video 변경 시 호출. 파일명 같으면 noop, 다르면 clear. */
  setActiveFilename: (filename) => {
    if (filename === get().activeFilename) return
    set({ activeFilename: filename, items: [] })
  },

  /** WS thermal.screening 수신 — 키프레임의 anomalies 를 ts 태깅해 평탄 적재. */
  ingest: (data) => {
    const ts = data?.video_timestamp_sec
    if (typeof ts !== 'number') return
    const anomalies = Array.isArray(data?.anomalies) ? data.anomalies : []
    if (anomalies.length === 0) return
    set((state) => {
      // 같은 키프레임(ts) 재수신은 무시(WS 재연결/중복 발사 방지).
      if (state.items.some((it) => it.video_timestamp_sec === ts)) return state
      const tagged = anomalies.map((a, i) => ({
        id: `${ts.toFixed(3)}_${i}`,
        video_timestamp_sec: ts,
        frame_w: data.frame_w,
        frame_h: data.frame_h,
        bbox: a.bbox,
        kind: a.kind,
        severity: a.severity,
        score: a.score,
      }))
      const next = [...state.items, ...tagged]
      next.sort((a, b) => a.video_timestamp_sec - b.video_timestamp_sec)
      return { items: next.slice(-MAX_ITEMS) }
    })
  },

  reset: () => set({ activeFilename: null, items: [] }),
}))

export default useThermalScreeningStore
