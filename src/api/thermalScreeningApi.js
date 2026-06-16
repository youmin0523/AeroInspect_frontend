/**
 * api/thermalScreeningApi.js
 * 역할: 의사색 단열 스크리닝(보조) 검수 피드백 REST 래퍼.
 *       - reviewThermalScreening: 스크리닝 항목을 확인/무시/오탐으로 검수 → 백엔드 audit_logs 적재.
 *
 *   백엔드 계약 (POST /api/v1/thermal-screening/review):
 *     body: 스크리닝 정체성(video_timestamp_sec 필수 + filename/frame/bbox/kind/severity/score/client_item_id)
 *           + { review_status: 'confirmed'|'dismissed'|'flagged_false_positive', review_note? }
 *           flagged_false_positive 는 review_note 필수.
 *     응답: { ok, client_item_id, review_status, review_note, reviewed_by_user_id, reviewed_at }
 *     WS broadcast: "defects" 채널로 { type: "thermal.screening.reviewed", data } 전파.
 *
 *   스크리닝은 DB 영속 레코드가 없어(WS 방출 전용) 검수는 피드백 회수 목적 — 본 검출과 동일한
 *   인증 규칙(Bearer + X-Organization-Id)을 따른다.
 */

import axios from 'axios'

const BASE = '/api/v1/thermal-screening'

// defectsApi 와 동일한 전용 인스턴스 패턴 — 인증 헤더 자동 첨부.
const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
})

API.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  const currentOrg = JSON.parse(sessionStorage.getItem('current_org') || 'null')
  if (currentOrg?.id) config.headers['X-Organization-Id'] = currentOrg.id
  return config
})

/**
 * 단열 스크리닝 항목 검수.
 * @param {Object} item - thermalScreeningStore item ({ id, video_timestamp_sec, frame_w, frame_h, bbox, kind, severity, score })
 * @param {{ review_status: string, review_note?: string, filename?: string }} opts
 * @returns {Promise<Object>} 접수 결과(에코)
 */
export async function reviewThermalScreening(item, { review_status, review_note, filename } = {}) {
  if (!item || typeof item.video_timestamp_sec !== 'number') {
    throw new Error('스크리닝 항목(video_timestamp_sec)이 비어 있습니다.')
  }
  if (!review_status) throw new Error('review_status 가 비어 있습니다.')

  const body = {
    video_timestamp_sec: item.video_timestamp_sec,
    filename: filename ?? null,
    frame_w: item.frame_w ?? null,
    frame_h: item.frame_h ?? null,
    bbox: item.bbox
      ? { x1: item.bbox.x1, y1: item.bbox.y1, x2: item.bbox.x2, y2: item.bbox.y2 }
      : null,
    kind: item.kind ?? null,
    severity: item.severity ?? null,
    score: typeof item.score === 'number' ? item.score : null,
    client_item_id: item.id ?? null,
    review_status,
  }
  if (typeof review_note === 'string' && review_note.length > 0) {
    body.review_note = review_note
  }
  const { data } = await API.post(`${BASE}/review`, body)
  return data
}
