/**
 * components/chat/MessageThread.jsx
 * 역할: 중앙 패널 — ChatHeader + 메시지 영역 + 날짜 구분선 + MessageInput
 */

import { useEffect, useRef, useMemo } from 'react'
import { MessageSquare } from 'lucide-react'
import useChatStore from '../../store/chatStore.js'
import ChatHeader from './ChatHeader.jsx'
import MessageBubble from './MessageBubble.jsx'
import MessageInput from './MessageInput.jsx'

const KR_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function formatDateLabel(timestamp) {
  const date = new Date(timestamp)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return '오늘'
  if (date.toDateString() === yesterday.toDateString()) return '어제'

  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  const w = KR_WEEKDAYS[date.getDay()]
  return `${y}년 ${m}월 ${d}일 ${w}요일`
}

function DateDivider({ label }) {
  return (
    <div className="flex items-center gap-3 my-4 px-4">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-[11px] text-gray-400 font-medium bg-gray-50 px-2 py-0.5 rounded-full">
        {label}
      </span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  )
}

export default function MessageThread() {
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const messages = useChatStore((s) => s.messages)
  const messagesLoading = useChatStore((s) => s.messagesLoading)
  const scrollRef = useRef(null)

  // 날짜별 그룹핑
  const grouped = useMemo(() => {
    const groups = []
    let currentDate = ''

    messages.forEach((msg) => {
      const dateStr = new Date(msg.created_at).toDateString()
      if (dateStr !== currentDate) {
        currentDate = dateStr
        groups.push({ type: 'date', label: formatDateLabel(msg.created_at), key: `date-${dateStr}` })
      }
      groups.push({ type: 'message', data: msg, key: msg.id })
    })

    return groups
  }, [messages])

  // //* [Modified Code] DOM 렌더 및 레이아웃 완료 후 스크롤 하단 이동 보장을 위해 setTimeout 사용
  useEffect(() => {
    const timer = setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
    }, 50)
    return () => clearTimeout(timer)
  }, [messages, messagesLoading])

  if (!activeConversationId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50">
        <MessageSquare size={48} className="text-gray-300 mb-3" />
        <p className="text-gray-400 font-medium">대화를 선택하세요</p>
        <p className="text-xs text-gray-400 mt-1">좌측에서 대화방을 선택하거나 새 대화를 시작하세요</p>
      </div>
    )
  }

  // //* [Modified Code] 지루한 로딩 텍스트 대신 스켈레톤(Skeleton UI)을 렌더링하고, 깜빡임을 최소화
  return (
    <div className="flex-1 flex flex-col min-w-0">
      <ChatHeader />

      {/* 메시지 영역 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-blue-50/30 py-4">
        {messagesLoading ? (
          <div className="flex flex-col gap-5 p-4 opacity-60">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse border border-white shrink-0" />
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="w-10 h-3 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="w-56 h-10 bg-gray-200 rounded-2xl rounded-tl-sm animate-pulse" />
              </div>
            </div>
            <div className="flex items-start gap-3 flex-row-reverse">
              <div className="flex flex-col gap-1.5 items-end">
                <div className="w-10 h-3 bg-gray-200 rounded animate-pulse" />
                <div className="w-40 h-10 bg-blue-200 rounded-2xl rounded-tr-sm animate-pulse" />
              </div>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">아직 메시지가 없습니다. 첫 메시지를 보내보세요!</p>
        ) : (
          grouped.map((item, idx) => {
            if (item.type === 'date') {
              return <DateDivider key={item.key} label={item.label} />
            }
            // 연속 메시지: 같은 발신자의 이전 메시지가 있으면 아바타 생략
            const prevItem = grouped[idx - 1]
            const showAvatar = !prevItem || prevItem.type === 'date' || prevItem.data?.sender_id !== item.data.sender_id
            return (
              <MessageBubble
                key={item.key}
                message={item.data}
                showAvatar={showAvatar}
              />
            )
          })
        )}
      </div>

      <MessageInput />
    </div>
  )
}
