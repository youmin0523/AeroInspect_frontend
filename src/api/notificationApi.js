/**
 * api/notificationApi.js
 * 역할: 알림 CRUD — ��엔드 REST API 연동
 *
 *   백엔드 엔드포인트:
 *     GET    /api/v1/notifications              → list (paginated, filterable)
 *     GET    /api/v1/notifications/unread-count  → badge count
 *     PATCH  /api/v1/notifications/{id}/read     → mark single read
 *     PATCH  /api/v1/notifications/read-all      → mark all read
 *     DELETE /api/v1/notifications/{id}          → delete
 */

import axios from 'axios'

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
})

API.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/* ── Public API ���─────────────────────────────────────── */

/** GET /api/v1/notifications */
export async function listNotifications({ category, is_read, limit = 20, offset = 0 } = {}) {
  const params = { limit, offset }
  if (category != null) params.category = category
  if (is_read != null) params.is_read = is_read
  const { data } = await API.get('/api/v1/notifications', { params })
  return data
}

/** GET /api/v1/notifications/unread-count */
export async function getUnreadCount() {
  const { data } = await API.get('/api/v1/notifications/unread-count')
  return data
}

/** PATCH /api/v1/notifications/{id}/read */
export async function markAsRead(id) {
  const { data } = await API.patch(`/api/v1/notifications/${id}/read`)
  return data
}

/** PATCH /api/v1/notifications/read-all */
export async function markAllAsRead() {
  const { data } = await API.patch('/api/v1/notifications/read-all')
  return data
}

/** DELETE /api/v1/notifications/{id} */
export async function deleteNotification(id) {
  await API.delete(`/api/v1/notifications/${id}`)
  return { ok: true }
}

/** DELETE /api/v1/notifications — 현재 사용자 알림 전체 삭제 */
export async function deleteAllNotifications() {
  const { data } = await API.delete('/api/v1/notifications')
  return data
}
