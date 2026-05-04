/**
 * components/chat/ParticipantPanel.jsx
 * 역할: 우측 패널 — 참여자 정보, 멤버 목록, 온라인 상태, 조직 내 부서/직위 표시
 */

import { useState, useEffect } from 'react'
import { X, LogOut } from 'lucide-react'
import useChatStore from '../../store/chatStore.js'
import { USER_STATUS_CONFIG } from '../../constants/chatConstants.js'
import { listOrganizationMembers } from '../../api/organizationApi.js'

export default function ParticipantPanel() {
  const conversations = useChatStore((s) => s.conversations)
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const toggleParticipantPanel = useChatStore((s) => s.toggleParticipantPanel)
  const leaveConversation = useChatStore((s) => s.leaveConversation)

  const [orgMembers, setOrgMembers] = useState([])

  // 조직 멤버 로드 (부서/직위 정보 포함)
  useEffect(() => {
    listOrganizationMembers().then(({ members }) => setOrgMembers(members)).catch(() => {})
  }, [])

  const conv = conversations.find((c) => c.id === activeConversationId)
  if (!conv) return null

  // participants 는 {user_id, name, initials} 객체 배열 — 조직 멤버와 매칭하여 부서/직위 보강
  const members = (conv.participants || [])
    .map((p) => {
      const orgMatch = orgMembers.find((m) => m.user_id === p.user_id)
      return orgMatch || { user_id: p.user_id, name: p.name, initials: p.initials }
    })
    .filter(Boolean)

  const typeLabel = conv.type === 'channel' ? '채널' : conv.type === 'group' ? '그룹' : '1:1 대화'

  return (
    <aside className="w-64 bg-white border-l border-gray-200 flex flex-col shrink-0">
      {/* 헤더 */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-bold text-sm text-slate-800">참여자 정보</h3>
        <button
          type="button"
          onClick={toggleParticipantPanel}
          className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
        >
          <X size={16} />
        </button>
      </div>

      {/* 대화 정보 */}
      <div className="px-4 py-4 border-b border-gray-100">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">대화 정보</p>
        <p className="text-sm font-medium text-slate-800 mt-1">
          {conv.type === 'channel' ? `# ${conv.name}` : conv.name || '1:1 대화'}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{typeLabel}</p>
      </div>

      {/* 멤버 목록 */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-3">
          멤버 ({members.length}명)
        </p>
        <div className="space-y-1">
          {members.map((m) => {
            const status = USER_STATUS_CONFIG[m.online_status] || USER_STATUS_CONFIG.offline
            return (
              <div key={m.user_id} className="flex items-center gap-2.5 py-2 px-2 rounded-lg hover:bg-gray-50 transition">
                <div className="relative">
                  {m.profile_image_url ? (
                    <img
                      src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${m.profile_image_url}`}
                      alt={m.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold">
                      {m.initials}
                    </div>
                  )}
                  <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${status.dot}`} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{m.name}</p>
                    {m.role === 'owner' && (
                      <span className="text-[8px] font-bold bg-amber-100 text-amber-700 px-1 py-0.5 rounded shrink-0">소유자</span>
                    )}
                    {m.role === 'admin' && (
                      <span className="text-[8px] font-bold bg-blue-100 text-blue-700 px-1 py-0.5 rounded shrink-0">관리자</span>
                    )}
                  </div>
                  {(m.position || m.department) && (
                    <p className="text-xs text-gray-500">{[m.position, m.department].filter(Boolean).join(' · ')}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 대화 나가기 */}
      <div className="px-4 py-3 border-t border-gray-100">
        <button
          type="button"
          onClick={() => {
            if (window.confirm('이 대화방을 나가시겠습니까?')) {
              leaveConversation(activeConversationId)
            }
          }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
        >
          <LogOut size={14} />
          대화 나가기
        </button>
      </div>
    </aside>
  )
}
