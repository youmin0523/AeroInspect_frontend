/**
 * components/chat/FloatingChatButton.jsx
 * 역할: 우하단 고정 Floating Action Button — 어디서든 메신저 빠른 접근
 *       - Slack/Salesforce/Jira 의 FAB 패턴 참고
 *       - 미읽음 뱃지 표시 + hover 시 "메신저" 라벨 확장
 *       - /employee/chat 페이지에서는 자동 숨김
 */

import { Link, useLocation } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import useChatStore from '../../store/chatStore.js'

export default function FloatingChatButton() {
  const chatUnread = useChatStore((s) => s.unreadTotal)
  const location = useLocation()

  // 채팅 페이지에서는 FAB 숨김
  if (location.pathname === '/employee/chat') return null

  return (
    <Link
      to="/employee/chat"
      className="fixed bottom-6 right-6 z-50 group flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 pl-4 pr-4 py-3 hover:pr-5"
      title="메신저 열기"
    >
      <MessageSquare size={20} className="shrink-0" />
      <span className="text-sm font-semibold max-w-0 overflow-hidden group-hover:max-w-[80px] transition-all duration-200 whitespace-nowrap">
        메신저
      </span>

      {/* 미읽음 뱃지 */}
      {chatUnread > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] flex items-center justify-center bg-red-500 text-white text-[11px] font-bold rounded-full px-1 border-2 border-white shadow-sm">
          {chatUnread > 99 ? '99+' : chatUnread}
        </span>
      )}
    </Link>
  )
}
