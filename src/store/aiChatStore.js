/**
 * store/aiChatStore.js
 * 역할: OpenAI 챗봇 상태 관리 (Zustand, persist 없음 — 서버 영속화에 의존)
 *
 *   상태 모델:
 *     isOpen, view ('list' | 'thread')        UI 패널 토글 + 현재 모드
 *     threads: ThreadResponse[]                대화방 목록
 *     activeThreadId                           현재 선택된 thread
 *     messagesByThread: { [tid]: Message[] }   thread 별 메시지 캐시
 *     streaming: bool                          현재 SSE 스트림 중
 *     streamingDraft: string                   현재 어시스턴트 응답 누적
 *     abortController                          진행 중 fetch 중단용
 *     error: string | null
 *
 *   액션:
 *     toggle/open/close
 *     fetchThreads, createThread, selectThread, renameThread, deleteThread
 *     fetchMessages, sendMessage, stopStreaming
 */

import { create } from 'zustand'
import {
  listThreads,
  createThread as createThreadApi,
  renameThread as renameThreadApi,
  deleteThread as deleteThreadApi,
  listMessages,
  sendMessageStream,
} from '../api/aiChatApi.js'

const useAiChatStore = create((set, get) => ({
  // ── UI 상태 ───────────────────────────────
  isOpen: false,
  view: 'list', // 'list' | 'thread'

  // ── 데이터 ────────────────────────────────
  threads: [],
  threadsLoading: false,
  activeThreadId: null,
  messagesByThread: {},
  messagesLoading: false,

  // ── 스트리밍 ──────────────────────────────
  streaming: false,
  streamingDraft: '',
  abortController: null,

  error: null,

  // ── UI 토글 ───────────────────────────────
  open: () => {
    set({ isOpen: true })
    // 열 때마다 목록 최신화 (다른 기기/탭에서 추가됐을 수 있음)
    get().fetchThreads()
  },
  close: () => set({ isOpen: false }),
  toggle: () => {
    if (get().isOpen) {
      get().close()
    } else {
      get().open()
    }
  },
  setView: (view) => set({ view }),

  // ── 대화방 목록 ───────────────────────────
  fetchThreads: async () => {
    set({ threadsLoading: true, error: null })
    try {
      const data = await listThreads({ limit: 50 })
      set({ threads: data.threads || [], threadsLoading: false })
    } catch (err) {
      set({ threadsLoading: false, error: err.message || '대화방 목록을 불러오지 못했습니다.' })
    }
  },

  createThread: async ({ title } = {}) => {
    try {
      const t = await createThreadApi({ title })
      set((s) => ({ threads: [t, ...s.threads], activeThreadId: t.id, view: 'thread' }))
      // 새 thread 는 메시지 없음 — 빈 배열로 캐시
      set((s) => ({ messagesByThread: { ...s.messagesByThread, [t.id]: [] } }))
      return t
    } catch (err) {
      set({ error: err.message || '대화방 생성에 실패했습니다.' })
      return null
    }
  },

  selectThread: (threadId) => {
    set({ activeThreadId: threadId, view: 'thread', error: null })
    // 캐시 없으면 페치
    if (!get().messagesByThread[threadId]) {
      get().fetchMessages(threadId)
    }
  },

  renameThread: async (threadId, title) => {
    try {
      const updated = await renameThreadApi(threadId, title)
      set((s) => ({
        threads: s.threads.map((t) => (t.id === threadId ? { ...t, ...updated } : t)),
      }))
    } catch (err) {
      set({ error: err.message || '제목 수정에 실패했습니다.' })
    }
  },

  deleteThread: async (threadId) => {
    try {
      await deleteThreadApi(threadId)
      set((s) => {
        const next = { ...s.messagesByThread }
        delete next[threadId]
        return {
          threads: s.threads.filter((t) => t.id !== threadId),
          messagesByThread: next,
          activeThreadId: s.activeThreadId === threadId ? null : s.activeThreadId,
          view: s.activeThreadId === threadId ? 'list' : s.view,
        }
      })
    } catch (err) {
      set({ error: err.message || '삭제에 실패했습니다.' })
    }
  },

  // ── 메시지 ────────────────────────────────
  fetchMessages: async (threadId) => {
    set({ messagesLoading: true, error: null })
    try {
      const data = await listMessages(threadId, { limit: 50 })
      set((s) => ({
        messagesByThread: { ...s.messagesByThread, [threadId]: data.messages || [] },
        messagesLoading: false,
      }))
    } catch (err) {
      set({ messagesLoading: false, error: err.message || '메시지를 불러오지 못했습니다.' })
    }
  },

  sendMessage: async (content) => {
    const threadId = get().activeThreadId
    if (!threadId) return
    if (get().streaming) return // 동시 전송 방지

    // 1) 낙관적 user 메시지 추가
    const tempUserMsg = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    }
    set((s) => ({
      messagesByThread: {
        ...s.messagesByThread,
        [threadId]: [...(s.messagesByThread[threadId] || []), tempUserMsg],
      },
      streaming: true,
      streamingDraft: '',
      error: null,
    }))

    const ctl = new AbortController()
    set({ abortController: ctl })

    await sendMessageStream(threadId, content, {
      signal: ctl.signal,
      onDelta: (text) => {
        set((s) => ({ streamingDraft: s.streamingDraft + text }))
      },
      onError: (err) => {
        set({ error: err.message || '응답 생성 중 오류가 발생했습니다.' })
      },
      onDone: (assistantMsgId) => {
        // 누적 응답을 메시지 캐시에 영속(서버 동기화 효과)
        const draft = get().streamingDraft
        set((s) => {
          const list = s.messagesByThread[threadId] || []
          const next = [...list]
          // 어시스턴트 응답 (빈 응답이면 추가 안 함)
          if (draft.trim()) {
            next.push({
              id: assistantMsgId || `temp-asst-${Date.now()}`,
              role: 'assistant',
              content: draft,
              created_at: new Date().toISOString(),
            })
          }
          // thread.last_message_at 갱신을 위해 목록에서 thread 를 최상단으로
          const threads = [...s.threads]
          const idx = threads.findIndex((t) => t.id === threadId)
          if (idx >= 0) {
            const t = { ...threads[idx], last_message_at: new Date().toISOString() }
            threads.splice(idx, 1)
            threads.unshift(t)
          }
          return {
            messagesByThread: { ...s.messagesByThread, [threadId]: next },
            threads,
            streaming: false,
            streamingDraft: '',
            abortController: null,
          }
        })
      },
    })
  },

  stopStreaming: () => {
    const ctl = get().abortController
    if (ctl) ctl.abort()
    set({ streaming: false, abortController: null })
  },

  clearError: () => set({ error: null }),
}))

export default useAiChatStore
