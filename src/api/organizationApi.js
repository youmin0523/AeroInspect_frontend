/**
 * api/organizationApi.js
 * 역할: 조직(회사) 멤버 관리 — 백엔드 REST API 연동
 *
 *   백엔드 엔드포인트:
 *     GET    /api/v1/organizations/my                → 내 조직 정보
 *     GET    /api/v1/organizations/members            → 같은 조직 멤버 목록
 *     POST   /api/v1/organizations                    → 조직 생성
 *     POST   /api/v1/organizations/members/invite      → 멤버 초대
 *     PATCH  /api/v1/organizations/members/{user_id}   → 멤버 정보 수정
 *     DELETE /api/v1/organizations/members/{user_id}   → 멤버 제거
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

/* ── Public API ─��────────────────────────────────────── */

/** GET /api/v1/organizations/my */
export async function getMyOrganization() {
  const { data } = await API.get('/api/v1/organizations/my')
  return data
}

/** GET /api/v1/organizations/members */
export async function listOrganizationMembers() {
  const { data } = await API.get('/api/v1/organizations/members')
  return data
}

/** POST /api/v1/organizations/members/invite */
export async function inviteMember({ email, role = 'member', department, position }) {
  const { data } = await API.post('/api/v1/organizations/members/invite', {
    email,
    role,
    department: department || null,
    position: position || null,
  })
  return data
}

/** PATCH /api/v1/organizations/members/{user_id} */
export async function updateMember(userId, patch) {
  const { data } = await API.patch(`/api/v1/organizations/members/${userId}`, patch)
  return data
}

/** DELETE /api/v1/organizations/members/{user_id} */
export async function removeMember(userId) {
  await API.delete(`/api/v1/organizations/members/${userId}`)
  return { ok: true }
}
