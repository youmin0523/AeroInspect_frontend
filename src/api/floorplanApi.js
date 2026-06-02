/**
 * api/floorplanApi.js
 * 역할: 평면도(도면) 업로드·분석 REST 클라이언트
 *
 * 백엔드 엔드포인트(/api/v1/floorplan/*):
 *   POST /analyze            → 이미지 벽체 추출 (stateless, JPG/PNG/WEBP)
 *   POST /upload             → 파일 업로드 + DB 기록 (JPG/PNG/PDF/DXF)
 *   POST /{id}/process       → 업로드된 도면 OpenCV 처리
 *
 * 사용처: src/pages/employee/PreWork.jsx
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

/** 업로드 진행률 핸들러 빌더 */
function progressConfig(onProgress) {
  if (!onProgress) return {}
  return {
    onUploadProgress: (e) => {
      if (e.total) onProgress(Math.round((e.loaded / e.total) * 100))
    },
  }
}

// 허용 확장자/용량 (클라이언트 사전 검증용)
const MAX_SIZE_MB = 50
const ACCEPT = {
  image: { ext: ['jpg', 'jpeg', 'png', 'webp'], label: '이미지(JPG/PNG/WEBP)' },
  cad: { ext: ['dwg', 'dxf', 'ifc', 'pdf'], label: 'CAD(DWG/DXF/IFC/PDF)' },
}

/**
 * 클라이언트 사전 검증 — 백엔드 도달 전 파일 형식/용량 거름망.
 * @param {File} file
 * @param {'image'|'cad'} kind
 * @returns {{ok:boolean, error?:string}}
 */
export function preflightFloorplanFile(file, kind) {
  if (!file) return { ok: false, error: '파일을 선택해 주세요.' }
  const rule = ACCEPT[kind] || ACCEPT.image
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  if (!rule.ext.includes(ext)) {
    return { ok: false, error: `${rule.label} 형식만 업로드할 수 있습니다.` }
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return { ok: false, error: `파일이 너무 큽니다. (최대 ${MAX_SIZE_MB}MB)` }
  }
  return { ok: true }
}

/**
 * 평면도 이미지 품질 검증 (백엔드 /validate).
 * @param {File} file
 * @returns {Promise<object>} { valid, reasons, ... }
 */
export async function validateFloorplan(file) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await API.post('/api/v1/floorplan/validate', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

/**
 * 평면도 이미지 → 벽체 라인 추출 (stateless).
 * @param {File} file  JPG/PNG/WEBP 이미지
 * @param {(pct:number)=>void} [onProgress]
 * @returns {Promise<object>} { walls, outline, image_width, image_height, ... }
 */
export async function analyzeFloorplan(file, onProgress) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await API.post('/api/v1/floorplan/analyze', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    ...progressConfig(onProgress),
  })
  return data
}

/**
 * CAD/도면 파일 업로드 + 처리 (upload → process 2단계).
 * @param {File} file  JPG/PNG/PDF/DXF
 * @param {(pct:number)=>void} [onProgress]
 * @returns {Promise<object>} 처리 결과 (walls 포함)
 */
export async function uploadAndProcessCad(file, onProgress) {
  const form = new FormData()
  form.append('file', file)
  const up = await API.post('/api/v1/floorplan/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    ...progressConfig(onProgress),
  })
  const floorplanId = up.data?.id
  if (!floorplanId) return up.data
  // 업로드 직후 처리 트리거
  const { data } = await API.post(`/api/v1/floorplan/${floorplanId}/process`)
  return { ...up.data, ...data }
}

/**
 * 도면 API 에러 → 사용자용 한국어 메시지 변환.
 * @param {unknown} err  axios 에러
 * @returns {string}
 */
export function describeFloorplanError(err) {
  const status = err?.response?.status
  const detail = err?.response?.data?.detail
  if (detail) return String(detail)
  if (status === 400) return '지원하지 않는 파일 형식입니다. (JPG/PNG/WEBP/PDF/DXF)'
  if (status === 401) return '로그인이 필요합니다. 다시 로그인해 주세요.'
  if (status === 403) return '이 작업을 수행할 권한이 없습니다.'
  if (status === 413) return '파일이 너무 큽니다. (최대 50MB)'
  if (status === 422) return '도면 처리에 실패했습니다. 다른 도면으로 시도해 주세요.'
  if (status >= 500) return '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
  if (err?.code === 'ERR_NETWORK') return '네트워크 연결을 확인해 주세요.'
  return '알 수 없는 오류가 발생했습니다.'
}

export default {
  preflightFloorplanFile,
  validateFloorplan,
  analyzeFloorplan,
  uploadAndProcessCad,
  describeFloorplanError,
}
