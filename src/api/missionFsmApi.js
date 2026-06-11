/**
 * api/missionApi.js
 * 역할: 자율비행 미션 제어 REST 클라이언트
 *
 * 백엔드 엔드포인트(/api/v1/mission/*):
 *   POST   /start       → 미션 생성 + FSM 시작
 *   POST   /abort
 *   POST   /estop       → 비상정지 (즉시 LAND)
 *   POST   /rtl
 *   POST   /pause
 *   GET    /state       → 현재 인메모리 FSM 상태
 *   GET    /{id}/state  → 특정 미션 DB 상태
 *
 * 커버리지 / 면적:
 *   GET /api/v1/coverage/mission/{id}/grid
 *   GET /api/v1/coverage/mission/{id}/summary
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

const PREFIX = '/api/v1/mission'
const COVERAGE = '/api/v1/coverage'

export const missionApi = {
  start: (body) => API.post(`${PREFIX}/start`, body).then((r) => r.data),
  abort: () => API.post(`${PREFIX}/abort`).then((r) => r.data),
  estop: () => API.post(`${PREFIX}/estop`).then((r) => r.data),
  rtl: () => API.post(`${PREFIX}/rtl`).then((r) => r.data),
  pause: () => API.post(`${PREFIX}/pause`).then((r) => r.data),
  state: () => API.get(`${PREFIX}/state`).then((r) => r.data),
  missionState: (missionId) =>
    API.get(`${PREFIX}/${missionId}/state`).then((r) => r.data),
  coverageGrid: (missionId) =>
    API.get(`${COVERAGE}/mission/${missionId}/grid`).then((r) => r.data),
  coverageSummary: (missionId) =>
    API.get(`${COVERAGE}/mission/${missionId}/summary`).then((r) => r.data),
}

export default missionApi
