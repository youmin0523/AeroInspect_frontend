/**
 * api/aiChatApi.js
 * 역할: OpenAI 챗봇 백엔드 REST + SSE 연동
 *
 *   백엔드 엔드포인트(/api/v1/ai-chat):
 *     GET    /threads                대화방 목록
 *     POST   /threads                대화방 생성
 *     PATCH  /threads/{id}           제목 수정
 *     DELETE /threads/{id}           soft delete (?hard=true 면 영구)
 *     GET    /threads/{id}/messages  히스토리 (커서 페이지네이션)
 *     POST   /threads/{id}/messages  SSE 스트리밍 응답
 *
 *   SSE 파서: fetch + ReadableStream 으로 라인 단위 파싱.
 *             EventSource 는 GET 전용 + 커스텀 헤더 미지원이라 사용 X.
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

const BASE = '/api/v1/ai-chat'

/* ── Threads CRUD ─────────────────────────────────────── */

/** GET /threads — 대화방 목록 (커서 페이지네이션) */
export async function listThreads({ limit = 30, before } = {}) {
  const { data } = await API.get(`${BASE}/threads`, {
    params: { limit, before },
  })
  return data // { threads, has_more }
}

/** POST /threads — 대화방 생성 */
export async function createThread({ title } = {}) {
  const { data } = await API.post(`${BASE}/threads`, { title })
  return data // ThreadResponse
}

/** PATCH /threads/{id} — 제목 수정 */
export async function renameThread(threadId, title) {
  const { data } = await API.patch(`${BASE}/threads/${threadId}`, { title })
  return data
}

/** DELETE /threads/{id} — soft delete (hard=true 면 영구) */
export async function deleteThread(threadId, { hard = false } = {}) {
  await API.delete(`${BASE}/threads/${threadId}`, { params: { hard } })
}

/** GET /threads/{id}/messages — 히스토리 */
export async function listMessages(threadId, { limit = 50, before } = {}) {
  const { data } = await API.get(`${BASE}/threads/${threadId}/messages`, {
    params: { limit, before },
  })
  return data // { messages, has_more }
}

/* ── SSE 메시지 전송 ─────────────────────────────────── */

/**
 * POST /threads/{id}/messages (SSE)
 *
 * 백엔드는 `data: {json}\n\n` 라인 단위 청크를 보냅니다.
 * json 형태:
 *   - { delta: "...텍스트..." }
 *   - { done: true, message_id: "<uuid>" }
 *   - { error: "..." }
 *
 * 사용 예:
 *   const ctl = new AbortController()
 *   await sendMessageStream(threadId, '안녕', {
 *     onDelta: (text) => append(text),
 *     onDone:  (msgId) => save(msgId),
 *     onError: (err) => toast(err),
 *     signal:  ctl.signal,
 *   })
 *
 * @returns {Promise<void>} 스트림 완료/오류 시 resolve
 */
export async function sendMessageStream(threadId, content, callbacks = {}) {
  const { onDelta, onDone, onError, signal } = callbacks
  const baseUrl = import.meta.env.VITE_API_BASE_URL || ''
  const url = `${baseUrl}${BASE}/threads/${threadId}/messages`

  const token = sessionStorage.getItem('access_token')
  const currentOrg = JSON.parse(sessionStorage.getItem('current_org') || 'null')

  let response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(currentOrg?.id ? { 'X-Organization-Id': currentOrg.id } : {}),
      },
      body: JSON.stringify({ content }),
      signal,
    })
  } catch (err) {
    onError?.(err)
    return
  }

  if (!response.ok) {
    // 429/401/403/404 등은 JSON detail 추출 후 전달
    let detail = `요청 실패 (${response.status})`
    try {
      const text = await response.text()
      const json = JSON.parse(text)
      if (json?.detail) detail = json.detail
    } catch {
      // ignore
    }
    onError?.(new Error(detail))
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let assistantMessageId = null

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // 라인 단위 split — SSE 는 "\n\n" 으로 이벤트 구분
      let sepIdx
      while ((sepIdx = buffer.indexOf('\n\n')) >= 0) {
        const raw = buffer.slice(0, sepIdx)
        buffer = buffer.slice(sepIdx + 2)
        // raw 는 한 줄 또는 여러 줄("data: ...\n...") 가능. data: 만 추출.
        for (const line of raw.split('\n')) {
          if (!line.startsWith('data:')) continue
          const payload = line.slice(5).trim()
          if (!payload) continue
          try {
            const evt = JSON.parse(payload)
            if (evt.delta) {
              onDelta?.(evt.delta)
            } else if (evt.error) {
              onError?.(new Error(evt.error))
            } else if (evt.done) {
              assistantMessageId = evt.message_id ?? null
            }
          } catch {
            // 파싱 실패는 무시 (heartbeat 등)
          }
        }
      }
    }
  } catch (err) {
    if (err?.name !== 'AbortError') {
      onError?.(err)
    }
  } finally {
    onDone?.(assistantMessageId)
  }
}
