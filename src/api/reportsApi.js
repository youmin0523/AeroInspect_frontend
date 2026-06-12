/**
 * api/reportsApi.js
 * 역할: 완료된 점검 리포트 아카이브 CRUD — 백엔드 REST API 연동
 *
 *   백엔드 엔드포인트:
 *     GET    /api/v1/report            → list (org-scoped)
 *     GET    /api/v1/report/{id}       → detail
 *     POST   /api/v1/report/save       → create (save)
 *     DELETE /api/v1/report/{id}       → delete
 *     GET    /api/v1/report/{id}/download → markdown download
 */

import axios from 'axios'

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

/* ��─ Public API ──��────────────────────────���──────────── */

/** GET /api/v1/report */
export async function listReports() {
  const { data } = await API.get('/api/v1/report')
  return data.items ?? data
}

/** GET /api/v1/report/{id} */
export async function getReport(id) {
  const { data } = await API.get(`/api/v1/report/${id}`)
  return data
}

/** POST /api/v1/report/save */
export async function createReport(payload) {
  const { data } = await API.post('/api/v1/report/save', payload)
  return data
}

/** DELETE /api/v1/report/{id} */
export async function deleteReport(id) {
  await API.delete(`/api/v1/report/${id}`)
  return { ok: true }
}

/**
 * POST /api/v1/report/excel — 검출 하자(이미지 포함) → 제출용 엑셀 양식 다운로드
 * defects: [{category_code, defect_type, severity, confidence, image_crop}]
 * meta: {site_name, unit, inspector, inspect_area}
 */
export async function generateExcelReport(defects, meta = {}) {
  const response = await API.post(
    '/api/v1/report/excel',
    { defects, ...meta },
    { responseType: 'blob' },
  )
  // 파일명 추출 (RFC5987 UTF-8'' 우선, 없으면 기본)
  const cd = response.headers['content-disposition'] || ''
  let filename = `하자점검_결과보고서.xlsx`
  const star = cd.match(/filename\*\s*=\s*UTF-8''([^;]+)/i)
  if (star) {
    try { filename = decodeURIComponent(star[1].trim()) } catch { /* keep default */ }
  }
  const url = window.URL.createObjectURL(response.data)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

/** GET /api/v1/report/{id}/download — 마크다운 파일 다운로드 */
export async function downloadReport(id) {
  const response = await API.get(`/api/v1/report/${id}/download`, {
    responseType: 'blob',
  })
  // 브라우저 다운로드 트리거
  const disposition = response.headers['content-disposition'] || ''
  const filenameMatch = disposition.match(/filename="?(.+?)"?$/)
  const filename = filenameMatch ? filenameMatch[1] : `report_${id}.md`

  const url = window.URL.createObjectURL(response.data)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}
