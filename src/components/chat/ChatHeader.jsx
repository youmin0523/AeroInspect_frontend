/**
 * components/chat/ChatHeader.jsx
 * 역할: 대화방 상단 헤더 — 이름 · 참여자 수 · 온라인 상태 · 참여자 패널 토글
 */

import { Hash, Users, PanelRightOpen } from 'lucide-react'
import useChatStore from '../../store/chatStore.js'
import { USER_STATUS_CONFIG } from '../../constants/chatConstants.js'

function getCurrentUserId() {
  const stored = JSON.parse(sessionStorage.getItem('user') || 'null')
  return stored?.id || null
}

export default function ChatHeader() {
  const conversations = useChatStore((s) => s.conversations)
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const toggleParticipantPanel = useChatStore((s) => s.toggleParticipantPanel)
  const isParticipantPanelOpen = useChatStore((s) => s.isParticipantPanelOpen)

  const conv = conversations.find((c) => c.id === activeConversationId)
  if (!conv) return null

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
    <div className="h-[60px] flex items-center justify-between px-5 bg-white border-b border-gray-200">
      <div className="flex items-center gap-3">
        {/* 아이콘 */}
        {conv.type === 'channel' ? (
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
            <Hash size={14} />
          </div>
        ) : conv.type === 'dm' ? (
          <div className="relative">
            {otherMember?.profile_image_url ? (
              <img
                src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${otherMember.profile_image_url}`}
                alt={otherMember.name}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold">
                {otherMember?.initials || '??'}
              </div>
            )}
            {statusConfig && (
              <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${statusConfig.dot}`} />
            )}
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
            <Users size={14} />
          </div>
        )}

        {/* 이름 + 부가 정보 */}
        <div>
          <h2 className="font-bold text-slate-800 text-sm">
            {conv.type === 'channel' ? `# ${displayName}` : displayName}
          </h2>
          <p className="text-xs text-gray-500">
            {conv.type === 'dm'
              ? (statusConfig ? statusConfig.label : '')
              : `${conv.participants?.length || 0}명 참여 중`
            }
          </p>
        </div>
      </div>

      {/* 우측 버튼 */}
      <button
        type="button"
        onClick={toggleParticipantPanel}
        className={`p-2 rounded-lg transition ${
          isParticipantPanelOpen
            ? 'bg-blue-50 text-blue-600'
            : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
        }`}
        title="참여자 정보"
      >
        <PanelRightOpen size={18} />
      </button>
    </div>
  )
}
