/**
 * store/chatStore.js
 * 역할: 사내 메신저 상태 관리 — chatApi 래퍼 (Zustand, persist 없음)
 *
 *   백엔드 REST API 연동 — JWT 토큰으로 현재 사용자 자동 식별.
 *   CURRENT_USER 는 fallback 용도로만 유지 (authStore.user 우선).
 */

import { create } from 'zustand'
import {
  listConversations,
  getMessages,
  sendMessage as sendTextMessage,
  sendFileMessage,
  createConversation,
  markConversationRead,
  getUnreadCounts,
  findDMConversation,
  leaveConversation as leaveConvApi,
} from '../api/chatApi.js'
import useNotificationStore from './notificationStore.js'

/** authStore에서 현재 사용자 가져오기 (store 순환 import 방지) */
function getCurrentUser() {
  const stored = JSON.parse(sessionStorage.getItem('user') || 'null')
  return stored || { id: null, name: '사용자', initials: '??' }
}

const useChatStore = create((set, get) => ({
// //* [Modified Code] 대화방 전환 시 로딩 지연(깜빡임) 완전 제거를 위한 메모리 캐싱 변수 추가
  // State
  conversations: [],
  activeConversationId: null,
  messages: [],
  messageCache: {}, // 캐시 메모리
  unreadTotal: 0,
  unreadPerConv: {},
  loading: false,
  messagesLoading: false,
  error: null,
  isParticipantPanelOpen: false,
  isNewChatModalOpen: false,
  searchQuery: '',
  filterType: 'all',

  /** 대화방 목록 동기화 */
  fetchConversations: async () => {
    set({ loading: true, error: null })
    try {
      const [convs, { total, per_conversation }] = await Promise.all([
        listConversations(),
        getUnreadCounts(),
      ])
      set({ conversations: convs, unreadTotal: total, unreadPerConv: per_conversation || {}, loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  // //! [Original Code] 메시지 조회와 읽음 처리를 병렬 대기(Promise.all)하여 로딩시간 증가
  // selectConversation: async (convId) => {
  //   set({ activeConversationId: convId, messagesLoading: true })
  //   // 알림 벨 안의 해당 대화방 채팅 알림도 같이 읽음 처리 (UX 일관성)
  //   useNotificationStore.getState().markChatNotificationsReadByConversation(convId)
  //   try {
  //     const [msgs] = await Promise.all([
  //       getMessages(convId),
  //       markConversationRead(convId),
  //     ])
  //     set({ messages: msgs, messagesLoading: false })
  //     // 읽음 처리 후 미읽음 카운트만 갱신 (비동기, UI 블로킹 안 함)
  //     getUnreadCounts().then(({ total, per_conversation }) =>
  //       set({ unreadTotal: total, unreadPerConv: per_conversation || {} })
  //     ).catch(() => {})
  //   } catch (err) {
  //     set({ error: err.message, messagesLoading: false })
  //   }
  // },

  // //* [Modified Code] 캐시를 사전 조회하여 빈틈없이 메시지를 그리고(Zero-Delay), 새 데이터는 Background Fetch로 교체
  selectConversation: async (convId) => {
    const cachedMsgs = get().messageCache[convId] || []
    
    // 캐시가 있으면 로딩 없이 즉시 렌더링, 없으면 초반 로딩만 표출 (깜빡임 최소화)
    set({ 
      activeConversationId: convId, 
      messages: cachedMsgs, 
      messagesLoading: cachedMsgs.length === 0 
    })
    
    useNotificationStore.getState().markChatNotificationsReadByConversation(convId)
    
    // 1. 메시지 백그라운드 갱신 및 캐시 최신화
    getMessages(convId)
      .then((msgs) => {
        set((s) => ({ messageCache: { ...s.messageCache, [convId]: msgs } }))
        if (get().activeConversationId === convId) {
          set({ messages: msgs, messagesLoading: false })
        }
      })
      .catch((err) => {
        if (get().activeConversationId === convId) {
          set({ error: err.message, messagesLoading: false })
        }
      })

    // 2. 서버 측 읽음 처리 및 카운트 갱신 (UI 블로킹 없음)
    markConversationRead(convId)
      .then(() => getUnreadCounts())
      .then(({ total, per_conversation }) => {
        set({ unreadTotal: total, unreadPerConv: per_conversation || {} })
      })
      .catch(() => {})
  },

  /** 메시지 전송 (텍스트 / 파일 / 텍스트+파일) */
  sendMessage: async ({ text, files }) => {
    const { activeConversationId, conversations } = get()
    if (!activeConversationId) return
    if (!text?.trim() && (!files || files.length === 0)) return

    let lastMsg
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        lastMsg = await sendFileMessage({
          conversation_id: activeConversationId,
          file: files[i],
          text: i === 0 && text?.trim() ? text.trim() : null,
        })
        set((s) => ({ messages: [...s.messages, lastMsg] }))
      }
    } else {
      lastMsg = await sendTextMessage({
        conversation_id: activeConversationId,
        text: text.trim(),
      })
      set((s) => ({ messages: [...s.messages, lastMsg] }))
    }

    // 대화방 목록 로컬 업데이트 (API 호출 없이 즉시 반영)
    if (lastMsg) {
      const updatedConvs = conversations.map((c) => {
        if (c.id === activeConversationId) {
          return {
            ...c,
            updated_at: lastMsg.created_at,
            last_message: { text: lastMsg.text, file_name: lastMsg.file_name, sender_name: lastMsg.sender_name, created_at: lastMsg.created_at },
          }
        }
        return c
      }).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      set({ conversations: updatedConvs })
    }
  },

  /** 새 대화방 생성 */
  createConversation: async ({ type, name, participants }) => {
    const user = getCurrentUser()
    const conv = await createConversation({
      type,
      name,
      participant_ids: [...participants, user.id].filter(Boolean),
    })
    const convs = await listConversations()
    set({ conversations: convs, isNewChatModalOpen: false })
    // 생성 후 바로 선택
    get().selectConversation(conv.id)
    return conv
  },

  /** DM 시작 (기존 DM 있으면 선택, 없으면 생성) */
  startDM: async (targetUserId) => {
    const user = getCurrentUser()
    const existing = await findDMConversation(user.id, targetUserId)
    if (existing) {
      get().selectConversation(existing.id)
      return existing
    }
    return get().createConversation({
      type: 'dm',
      name: null,
      participants: [targetUserId],
    })
  },

  /** 읽음 처리 */
  markRead: async (convId) => {
    await markConversationRead(convId)
    const { total, per_conversation } = await getUnreadCounts()
    set({ unreadTotal: total, unreadPerConv: per_conversation || {} })
  },

  /** 대화방 나가기 */
  leaveConversation: async (convId) => {
    try {
      await leaveConvApi(convId)
      const convs = await listConversations()
      set({ conversations: convs, activeConversationId: null, messages: [] })
    } catch (err) {
      set({ error: err.message })
    }
  },

  /** 읽음 카운트 갱신용 메시지 재로드 — markConversationRead 없이 messages 만 갱신 */
  refreshMessages: async (convId) => {
    try {
      const msgs = await getMessages(convId)
      if (get().activeConversationId === convId) {
        set({ messages: msgs })
      }
    } catch {}
  },

  // 필터 / 검색
  setFilter: (type) => set({ filterType: type }),
  setSearch: (query) => set({ searchQuery: query }),

  // UI 상태
  toggleParticipantPanel: () => set((s) => ({ isParticipantPanelOpen: !s.isParticipantPanelOpen })),
  openNewChatModal: () => set({ isNewChatModalOpen: true }),
  closeNewChatModal: () => set({ isNewChatModalOpen: false }),

  /** 미읽음 카운트 갱신 (사이드바 뱃지용) */
  refreshUnreadCounts: async () => {
    try {
      const { total, per_conversation } = await getUnreadCounts()
      set({ unreadTotal: total, unreadPerConv: per_conversation || {} })
    } catch {}
  },

  /** WebSocket으로 수신된 실시간 메시지 처리 — API 호출 최소화 */
  receiveMessage: (msg) => {
    const { activeConversationId, messages, conversations, unreadPerConv, unreadTotal } = get()
    const currentUser = getCurrentUser()

    // 내가 보낸 메시지는 sendMessage에서 이미 추가했으므로 중복 방지
    if (msg.sender_id === currentUser?.id) return

    // 현재 보고 있는 대화방이면 메시지 목록에 즉시 추가 + 읽음 처리
    if (msg.conversation_id === activeConversationId) {
      const isDuplicate = messages.some((m) => m.id === msg.id)
      if (!isDuplicate) {
        set((s) => ({ messages: [...s.messages, msg] }))
        markConversationRead(activeConversationId).catch(() => {})
      }
    } else {
      // 다른 대화방 → 미읽음 카운트 로컬 증가 (API 호출 없이 즉시 반영)
      const convId = msg.conversation_id
      const newPerConv = { ...unreadPerConv, [convId]: (unreadPerConv[convId] || 0) + 1 }
      set({ unreadPerConv: newPerConv, unreadTotal: unreadTotal + 1 })
    }

    // 대화방 목록 로컬 업데이트 (순서 변경 + 마지막 메시지 — API 호출 없음)
    const updatedConvs = conversations.map((c) => {
      if (c.id === msg.conversation_id) {
        return {
          ...c,
          updated_at: msg.created_at,
          last_message: { text: msg.text, file_name: msg.file_name, sender_name: msg.sender_name, created_at: msg.created_at },
        }
      }
      return c
    }).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    set({ conversations: updatedConvs })
  },
}))

export default useChatStore
