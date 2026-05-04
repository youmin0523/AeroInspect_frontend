/**
 * store/notificationStore.js
 * 역할: 알림 상태 관리 — notificationApi 래퍼 (Zustand, persist 없음)
 *
 *   persist 를 쓰지 않는 이유: 저장소 SoT(Source of Truth) 는 api/notificationApi.js 의 localStorage 키
 *   (그리고 향후 백엔드 DB). 이 store 는 그 데이터의 "메모리 캐시" 일 뿐.
 *
 *   백엔드 연결 시: notificationApi 만 교체하면 여기는 변경 없음.
 */

import { create } from 'zustand'
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
} from '../api/notificationApi.js'

/**
 * 채팅 실시간 알림: 백엔드 영속화 없이 프론트 인메모리로만 유지.
 *   - 새 메시지가 다른 대화방(=현재 보고 있지 않은 대화)에 도착할 때마다 1건씩 push
 *   - 클릭 시 해당 대화로 이동 → markChatNotificationRead로 단건 읽음
 *   - "모두 읽음"은 백엔드 알림과 함께 일괄 처리
 *   - 50건 초과 시 오래된 항목부터 FIFO 제거(메모리 캡)
 */
const CHAT_NOTIF_CAP = 50

const useNotificationStore = create((set, get) => ({
  // State
  notifications: [],
  unreadCount: 0,
  chatNotifications: [],
  chatUnreadCount: 0,
  loading: false,
  error: null,
  isDropdownOpen: false,

  /** 전체 목록 동기화 — 드롭다운 열릴 때 호출 */
  fetchAll: async (filters = {}) => {
    set({ loading: true, error: null })
    try {
      const { items } = await listNotifications(filters)
      set({ notifications: items, loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  /** 미읽음 카운트 — 뱃지 표시용 */
  fetchUnreadCount: async () => {
    try {
      const { count } = await getUnreadCount()
      set({ unreadCount: count })
    } catch (err) {
      console.warn('[notificationStore] unread count fetch failed:', err)
    }
  },

  /** 단건 읽음 처리 */
  markRead: async (id) => {
    await markAsRead(id)
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, is_read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }))
  },

  /** 전체 읽음 처리 (백엔드 알림 + 채팅 인메모리 알림 모두) */
  markAllRead: async () => {
    await markAllAsRead()
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
      chatNotifications: state.chatNotifications.map((n) => ({ ...n, is_read: true })),
      chatUnreadCount: 0,
    }))
  },

  /** 단건 삭제 */
  remove: async (id) => {
    const wasUnread = get().notifications.find((n) => n.id === id && !n.is_read)
    await deleteNotification(id)
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
      unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
    }))
  },

  /** 전체 삭제 (백엔드 알림 + 채팅 인메모리 알림 모두 비움) */
  removeAll: async () => {
    await deleteAllNotifications()
    set({
      notifications: [],
      unreadCount: 0,
      chatNotifications: [],
      chatUnreadCount: 0,
    })
  },

  // Dropdown UI state
  toggleDropdown: () => set((s) => ({ isDropdownOpen: !s.isDropdownOpen })),
  closeDropdown: () => set({ isDropdownOpen: false }),

  /** WebSocket push handler — 백엔드 연결 시 useWebSocket.js 에서 호출 */
  pushNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }))
  },

  /**
   * 채팅 실시간 알림 추가
   *   payload: { id, message_id, sender_id, sender_name, conversation_id, text, file_name, created_at }
   *   id가 동일한 항목은 중복으로 간주하여 무시(WS 재연결 등에 의한 동일 메시지 재수신 대비).
   */
  pushChatNotification: (payload) => {
    set((state) => {
      if (state.chatNotifications.some((n) => n.id === payload.id)) return state
      const next = [{ ...payload, is_read: false }, ...state.chatNotifications].slice(0, CHAT_NOTIF_CAP)
      return {
        chatNotifications: next,
        chatUnreadCount: state.chatUnreadCount + 1,
      }
    })
  },

  /** 채팅 알림 단건 읽음 — 미읽음 항목일 때만 카운트 차감 */
  markChatNotificationRead: (id) => {
    set((state) => {
      const target = state.chatNotifications.find((n) => n.id === id)
      if (!target || target.is_read) return state
      return {
        chatNotifications: state.chatNotifications.map((n) =>
          n.id === id ? { ...n, is_read: true } : n
        ),
        chatUnreadCount: Math.max(0, state.chatUnreadCount - 1),
      }
    })
  },

  /** 특정 대화방의 채팅 알림 일괄 읽음 — selectConversation 시 호출 */
  markChatNotificationsReadByConversation: (conversationId) => {
    set((state) => {
      let removedUnread = 0
      const updated = state.chatNotifications.map((n) => {
        if (n.conversation_id === conversationId && !n.is_read) {
          removedUnread += 1
          return { ...n, is_read: true }
        }
        return n
      })
      if (removedUnread === 0) return state
      return {
        chatNotifications: updated,
        chatUnreadCount: Math.max(0, state.chatUnreadCount - removedUnread),
      }
    })
  },
}))

export default useNotificationStore
