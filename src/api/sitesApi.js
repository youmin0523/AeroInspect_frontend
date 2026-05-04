/**
 * api/sitesApi.js
 * 역할: 현장 관리 CRUD — 백���드 REST API 연동
 *
 *   백엔�� 엔드포인트:
 *     GET    /api/v1/sites/           → list (filterable, paginated)
 *     GET    /api/v1/sites/{id}       → detail
 *     POST   /api/v1/sites/           → create
 *     PATCH  /api/v1/sites/{id}       → update
 *     DELETE /api/v1/sites/{id}       → delete
 */

import axios from 'axios'

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
})

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  const currentOrg = JSON.parse(localStorage.getItem('current_org') || 'null')
  if (currentOrg?.id) config.headers['X-Organization-Id'] = currentOrg.id
  return config
})

/* ── Public API ────────────────���─────────────────────── */

/** GET /api/v1/sites/ */
export async function listSites({ status, building_type, client_type, search, limit = 50, offset = 0 } = {}) {
  const params = { limit, offset }
  if (status) params.status = status
  if (building_type) params.building_type = building_type
  if (client_type) params.client_type = client_type
  if (search) params.search = search
  const { data } = await API.get('/api/v1/sites/', { params })
  return data.items ?? data
}

/** GET /api/v1/sites/{id} */
export async function getSite(id) {
  const { data } = await API.get(`/api/v1/sites/${id}`)
  return data
}

/** POST /api/v1/sites/ */
export async function createSite(payload) {
  const { data } = await API.post('/api/v1/sites/', payload)
  return data
}

/** PATCH /api/v1/sites/{id} */
export async function updateSite(id, patch) {
  const { data } = await API.patch(`/api/v1/sites/${id}`, patch)
  return data
}

/** DELETE /api/v1/sites/{id} */
export async function deleteSite(id) {
  await API.delete(`/api/v1/sites/${id}`)
  return { ok: true }
}
