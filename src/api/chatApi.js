/**
 * api/chatApi.js
 * 역할: 사내 메신저 CRUD — 백엔드 REST API 연동
 *
 *   백엔드 엔드포인트:
 *     GET    /api/v1/chat/conversations                   → 대화방 목록
 *     POST   /api/v1/chat/conversations                   → 새 대화방 생성
 *     GET    /api/v1/chat/conversations/{id}/messages      → 메시지 목록
 *     POST   /api/v1/chat/conversations/{id}/messages      → 메시지 전송
 *     PATCH  /api/v1/chat/conversations/{id}/read          → 읽음 처리
 *     GET    /api/v1/chat/unread-counts                    → 미읽음 카운트
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

/* ── Public API ──────────────────────────────────────── */

/** GET /api/v1/chat/conversations */
export async function listConversations() {
  const { data } = await API.get('/api/v1/chat/conversations')
  return data.items ?? data
}

/** GET /api/v1/chat/conversations/{id}/messages */
export async function getMessages(conversationId, { limit = 50, offset = 0 } = {}) {
  const { data } = await API.get(`/api/v1/chat/conversations/${conversationId}/messages`, {
    params: { limit, offset },
  })
  return data.items ?? data
}

/** POST /api/v1/chat/conversations/{id}/messages */
export async function sendMessage({ conversation_id, text }) {
  const { data } = await API.post(`/api/v1/chat/conversations/${conversation_id}/messages`, { text })
  return data
}

/** POST /api/v1/chat/conversations/{id}/messages/file (multipart) */
export async function sendFileMessage({ conversation_id, file, text }) {
  const formData = new FormData()
  formData.append('file', file)
  if (text) formData.append('text', text)
  const { data } = await API.post(
    `/api/v1/chat/conversations/${conversation_id}/messages/file`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
  return data
}

/** POST /api/v1/chat/conversations */
export async function createConversation({ type, name, participant_ids }) {
  const { data } = await API.post('/api/v1/chat/conversations', {
    type,
    name: name || null,
    participant_ids,
  })
  return data
}

/** PATCH /api/v1/chat/conversations/{id}/read */
export async function markConversationRead(conversationId) {
  const { data } = await API.patch(`/api/v1/chat/conversations/${conversationId}/read`)
  return data
}

/** DELETE /api/v1/chat/conversations/{id}/leave */
export async function leaveConversation(conversationId) {
  await API.delete(`/api/v1/chat/conversations/${conversationId}/leave`)
}

/** GET /api/v1/chat/unread-counts */
export async function getUnreadCounts() {
  const { data } = await API.get('/api/v1/chat/unread-counts')
  return data
}

/**
 * 첨부파일 다운로드 — blob 으로 받아 same-origin object URL 로 트리거.
 * StaticFiles 의 Content-Disposition 누락 + cross-origin <a download> 무시 문제를 한꺼번에 우회.
 * 백엔드는 RFC 5987 로 한글 파일명까지 헤더에 인코딩해 준다.
 */
export async function downloadMessageFile(messageId, fallbackName) {
  const res = await API.get(`/api/v1/chat/messages/${messageId}/download`, {
    responseType: 'blob',
  })

  // Content-Disposition 헤더에서 파일명 추출 (RFC 5987 우선, fallback 으로 plain filename)
  const cd = res.headers['content-disposition'] || ''
  let filename = fallbackName || 'download'
  const star = cd.match(/filename\*\s*=\s*UTF-8''([^;]+)/i)
  if (star) {
    try { filename = decodeURIComponent(star[1].trim()) } catch { /* keep fallback */ }
  } else {
    const plain = cd.match(/filename\s*=\s*"?([^";]+)"?/i)
    if (plain) filename = plain[1].trim()
  }

  const url = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // 다음 마이크로태스크에서 해제 (즉시 revoke 시 일부 브라우저에서 다운로드 취소되는 케이스 방지)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** 기존 DM 대화방 검색 (대화방 목록에서 필터링) — 두 사용자 모두 참여해야 매칭 */
export async function findDMConversation(userId1, userId2) {
  const convs = await listConversations()
  return convs.find(
    (c) =>
      c.type === 'dm' &&
      c.participants?.length === 2 &&
      c.participants.some((p) => p.user_id === userId1) &&
      c.participants.some((p) => p.user_id === userId2)
  ) || null
}
