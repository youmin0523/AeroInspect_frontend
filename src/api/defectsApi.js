/**
 * api/defectsApi.js
 * 역할: 하자 탐지 로그 REST API Axios 래퍼
 *       - fetchDefects: 목록 조회 (필터링 + 페이지네이션)
 *       - fetchDefectById: 단건 조회
 *       - createDefect: 신규 하자 저장
 *       - fetchDefectSummary: 대시보드 요약 통계
 *       - deleteDefect: 하자 삭제
 *       - reviewDefect: 인라인 검수 (approved/rejected/flagged_false_positive/pending)
 *       - getDefectAuditTrail: 감사 이력 페이지네이션 조회
 *
 *   //* [Modified Code v2] (2026-05-27) backend R-v1.1.x 인라인 검수 + 감사 이력 엔드포인트 연동.
 *     기존 함수는 default axios 인스턴스를 그대로 사용했지만, 신규 review/audit 엔드포인트는
 *     인증(Bearer + X-Organization-Id) 가 강제이므로 전용 axios 인스턴스를 도입하여 모든 호출에
 *     동일 헤더 인터셉터를 적용한다. baseURL 은 sitesApi/notificationApi 등과 같은 규칙.
 */

import axios from 'axios'

const BASE = '/api/v1/defects'

// 전용 axios 인스턴스 — 인증 헤더 인터셉터 자동 적용
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
 * 하자 목록 조회
 * @param {Object} params - { severity, area, category_code, limit, offset }
 */
export async function fetchDefects(params = {}) {
  const { data } = await API.get(BASE, { params })
  return data  // { items, total, limit, offset }
}

/**
 * 단건 하자 조회
 * @param {string} id - UUID
 */
export async function fetchDefectById(id) {
  const { data } = await API.get(`${BASE}/${id}`)
  return data
}

/**
 * 신규 하자 저장
 * @param {Object} payload - DefectLogCreate 스키마
 */
export async function createDefect(payload) {
  const { data } = await API.post(BASE, payload)
  return data
}

/**
 * 대시보드 요약 통계 조회
 * @returns {{ total, by_severity, by_area, latest }}
 */
export async function fetchDefectSummary() {
  const { data } = await API.get(`${BASE}/summary`)
  return data
}

/**
 * 하자 삭제
 * @param {string} id - UUID
 */
export async function deleteDefect(id) {
  await API.delete(`${BASE}/${id}`)
}

/**
 * 인라인 검수 — 현장 검수자가 카드 1클릭으로 하자를 승인/반려/오탐 처리.
 *
 *   백엔드 계약 (PATCH /api/v1/defects/{id}/review):
 *     body: { review_status, review_note? }
 *       review_status: 'approved' | 'rejected' | 'flagged_false_positive' | 'pending'
 *       rejected / flagged_false_positive 는 review_note 필수 (백엔드 422 방지를 위해 호출 측에서 가드 권장)
 *     응답: 갱신된 DefectLogResponse (review_status / reviewed_by_user_id / reviewed_at / review_note 포함)
 *     WS broadcast: "defects" 채널로 { type: "defect.reviewed", data: DefectLogResponse } 전파됨.
 *
 *   [feedback_strict_all_defects] — 오탐 가능성이 큰 클래스(단열 등) 일수록 검수자가 즉시 거부해야 신뢰가 유지된다.
 *
 * @param {string} defectId - UUID
 * @param {{ review_status: string, review_note?: string }} payload
 * @returns {Promise<Object>} 갱신된 DefectLogResponse
 */
export async function reviewDefect(defectId, { review_status, review_note } = {}) {
  if (!defectId) throw new Error('defectId 가 비어 있습니다.')
  if (!review_status) throw new Error('review_status 가 비어 있습니다.')
  const body = { review_status }
  if (typeof review_note === 'string' && review_note.length > 0) {
    body.review_note = review_note
  }
  const { data } = await API.patch(`${BASE}/${defectId}/review`, body)
  return data
}

/**
 * 감사 이력 조회 — 카드별 검수 변경 내역(누가/언제/무엇을) 시간순 표시.
 *
 *   백엔드 계약 (GET /api/v1/defects/{id}/audit-trail):
 *     query: limit (default 50), offset (default 0)
 *     응답: { items: AuditLogEntry[], total, limit, offset }
 *
 * @param {string} defectId - UUID
 * @param {{ limit?: number, offset?: number }} params
 * @returns {Promise<{items: Array, total: number, limit: number, offset: number}>}
 */
export async function getDefectAuditTrail(defectId, { limit = 50, offset = 0 } = {}) {
  if (!defectId) throw new Error('defectId 가 비어 있습니다.')
  const { data } = await API.get(`${BASE}/${defectId}/audit-trail`, {
    params: { limit, offset },
  })
  return data
}
