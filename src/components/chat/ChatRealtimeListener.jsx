/**
 * components/chat/ChatRealtimeListener.jsx
 * 역할: 전역 채팅 실시간 리스너 — `user:{userId}` 개인 채널에 항상 연결되어
 *       페이지 어디에 있든 새 메시지 수신 시 chatStore와 notificationStore를 갱신.
 *
 *   - chatStore.receiveMessage()로 미읽음 카운트/대화 목록 갱신
 *   - 현재 보고 있지 않은 대화의 메시지에 한해 notificationStore.pushChatNotification()
 *     호출 → 알림 벨에 "(보낸 사람)님께서 메시지를 보냈습니다." 항목 즉시 추가
 *
 *   기존 Chat.jsx 의 user 채널 WS 는 본 리스너로 이관(중복 연결 방지). Chat.jsx 는
 *   활성 대화방의 chat:{convId} 채널만 유지.
 *
 *   App.jsx 에서 /employee/* 경로에서만 마운트하여 비로그인/공개 페이지에서는 비용 0.
 */

import { useEffect, useRef } from 'react'
import useAuthStore from '../../store/authStore.js'
import useChatStore from '../../store/chatStore.js'
import useNotificationStore from '../../store/notificationStore.js'

const WS_BASE = (import.meta.env.VITE_WS_URL || 'ws://localhost:8000/api/v1/ws').replace('/ws', '')
const RETRY_DELAY = 300       // 0.3초
const MAX_RETRY_DELAY = 2000  // 2초

export default function ChatRealtimeListener() {
  const userId = useAuthStore((s) => s.user?.id)
  const wsRef = useRef(null)
  const retryDelayRef = useRef(RETRY_DELAY)
  const retryTimerRef = useRef(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    if (!userId) return
    mountedRef.current = true

    function connect() {
      if (!mountedRef.current) return

      const ws = new WebSocket(`${WS_BASE}/ws?channel=user:${userId}`)
      wsRef.current = ws

      ws.onopen = () => {
        retryDelayRef.current = RETRY_DELAY  // 연결 성공 시 딜레이 초기화
      }

      ws.onmessage = (event) => {
        try {
          const { type, data } = JSON.parse(event.data)

          if (type === 'chat.new_message' && data) {
            if (data.sender_id === userId) return

            useChatStore.getState().receiveMessage(data)

            const activeId = useChatStore.getState().activeConversationId
            if (data.conversation_id !== activeId) {
              useNotificationStore.getState().pushChatNotification({
                id: `chat-${data.id}`,
                message_id: data.id,
                sender_id: data.sender_id,
                sender_name: data.sender_name,
                conversation_id: data.conversation_id,
                text: data.text,
                file_name: data.file_name,
                created_at: data.created_at,
              })
            }
            return
          }

          if (type === 'chat.read' && data) {
            const activeId = useChatStore.getState().activeConversationId
            if (data.conversation_id === activeId) {
              useChatStore.getState().refreshMessages(activeId)
            }
            return
          }

          if (type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }))
          }
        } catch {
          // 파싱 실패 등은 무시 — 네트워크 노이즈로 간주
        }
      }

      ws.onerror = () => {}
      ws.onclose = () => {
        if (!mountedRef.current) return
        // 지수 백오프 자동 재연결
        retryTimerRef.current = setTimeout(() => {
          retryDelayRef.current = Math.min(retryDelayRef.current * 2, MAX_RETRY_DELAY)
          connect()
        }, retryDelayRef.current)
      }
    }

    connect()

    return () => {
      mountedRef.current = false
      clearTimeout(retryTimerRef.current)
      wsRef.current?.close()
    }
  }, [userId])

  return null
}
