/**
 * api/defectsApi.js
 * 역할: 하자 탐지 로그 REST API Axios 래퍼
 *       - fetchDefects: 목록 조회 (필터링 + 페이지네이션)
 *       - fetchDefectById: 단건 조회
 *       - createDefect: 신규 하자 저장
 *       - fetchDefectSummary: 대시보드 요약 통계
 *       - deleteDefect: 하자 삭제
 */

import axios from 'axios'

const BASE = '/api/v1/defects'

/**
 * 하자 목록 조회
 * @param {Object} params - { severity, area, category_code, limit, offset }
 */
export async function fetchDefects(params = {}) {
  const { data } = await axios.get(BASE, { params })
  return data  // { items, total, limit, offset }
}

/**
 * 단건 하자 조회
 * @param {string} id - UUID
 */
export async function fetchDefectById(id) {
  const { data } = await axios.get(`${BASE}/${id}`)
  return data
}

/**
 * 신규 하자 저장
 * @param {Object} payload - DefectLogCreate 스키마
 */
export async function createDefect(payload) {
  const { data } = await axios.post(BASE, payload)
  return data
}

/**
 * 대시보드 요약 통계 조회
 * @returns {{ total, by_severity, by_area, latest }}
 */
export async function fetchDefectSummary() {
  const { data } = await axios.get(`${BASE}/summary`)
  return data
}

/**
 * 하자 삭제
 * @param {string} id - UUID
 */
export async function deleteDefect(id) {
  await axios.delete(`${BASE}/${id}`)
}
