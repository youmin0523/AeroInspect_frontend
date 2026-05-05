/**
 * components/chat/ConversationItem.jsx
 * 역할: 대화방 목록의 단일 행 — Slack 스타일 (#채널 prefix, 아바타, 미리보기, 미읽음 뱃지)
 */

import { Hash, Users } from 'lucide-react'
import useChatStore from '../../store/chatStore.js'
import { USER_STATUS_CONFIG } from '../../constants/chatConstants.js'

function getCurrentUserId() {
  const stored = JSON.parse(sessionStorage.getItem('user') || 'null')
  return stored?.id || null
}

function formatRelativeTime(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '방금'
  if (min < 60) return `${min}분`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간`
  const d = Math.floor(hr / 24)
  return `${d}일`
}

export default function ConversationItem({ conv }) {
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const selectConversation = useChatStore((s) => s.selectConversation)
  const unreadPerConv = useChatStore((s) => s.unreadPerConv)
  const isActive = activeConversationId === conv.id
  const unread = unreadPerConv[conv.id] || 0

  const currentUserId = getCurrentUserId()
  // participants 는 {user_id, name, initials} 객체 배열
  const otherMember = conv.type === 'dm'
    ? conv.participants?.find((p) => p.user_id !== currentUserId)
    : null

  const displayName = conv.type === 'dm'
    ? (otherMember?.name || '알 수 없음')
    : conv.name

  const statusConfig = otherMember ? USER_STATUS_CONFIG[otherMember.online_status] : null

  return (
    <button
      type="button"
      onClick={() => selectConversation(conv.id)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition rounded-lg ${
        isActive
          ? 'bg-blue-50 border-l-2 border-blue-600 pl-2.5'
          : 'hover:bg-gray-50 border-l-2 border-transparent'
      }`}
    >
      {/* 아바타 */}
      {conv.type === 'dm' ? (
        <div className="relative shrink-0">
          {otherMember?.profile_image_url ? (
            <img
              src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${otherMember.profile_image_url}`}
              alt={otherMember.name}
              className="w-9 h-9 rounded-full object-cover"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold">
              {otherMember?.initials || '??'}
            </div>
          )}
          {statusConfig && (
            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${statusConfig.dot}`} />
          )}
        </div>
      ) : conv.type === 'channel' ? (
        <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
          <Hash size={16} />
        </div>
      ) : (
        <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
          <Users size={14} />
        </div>
      )}

      {/* 내용 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={`text-sm truncate ${isActive || unread > 0 ? 'font-bold text-slate-800' : 'font-medium text-slate-700'}`}>
            {conv.type === 'channel' ? `# ${displayName}` : displayName}
          </span>
          {conv.last_message && (
            <span className="text-[11px] text-gray-400 shrink-0 ml-2">
              {formatRelativeTime(conv.last_message.created_at)}
            </span>
          )}
        </div>
        {conv.last_message && (
          <p className={`text-xs truncate mt-0.5 ${unread > 0 ? 'text-slate-600 font-medium' : 'text-gray-400'}`}>
            {conv.type !== 'dm' && `${conv.last_message.sender_name}: `}
            {conv.last_message.text || (conv.last_message.file_name ? `\ud83d\udcce ${conv.last_message.file_name}` : '')}
          </p>
        )}
      </div>

      {/* 미읽음 뱃지 */}
      {unread > 0 && (
        <span className="min-w-[20px] h-5 flex items-center justify-center bg-blue-600 text-white text-[10px] font-bold rounded-full px-1.5 shrink-0">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  )
}
