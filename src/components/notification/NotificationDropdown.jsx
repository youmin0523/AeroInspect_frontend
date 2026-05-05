/**
 * components/notification/NotificationDropdown.jsx
 * 역할: 벨 아이콘 클릭 시 열리는 알림 드롭다운 패널
 *       - theme='light' (EmployeeLanding) / 'dark' (Header, DashboardTopBar) 양쪽 대응
 *       - 클릭 바깥 / ESC → 닫기
 *       - 드롭다운 열릴 때 fetchAll + fetchUnreadCount 호출
 */

import { useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { BellOff } from 'lucide-react'
import useNotificationStore from '../../store/notificationStore.js'
import useChatStore from '../../store/chatStore.js'
import NOTIFICATION_CATEGORIES from '../../constants/notificationCategories.js'

/* ── 상대 시간 포맷 ───────────────────────────────────── */

// //! [Original Code] 기존 NaN개월 전 표기 관련 원본 시간 포맷 로직
// function formatRelativeTime(timestamp) {
//   const diff = Date.now() - timestamp
//   const minutes = Math.floor(diff / 60000)
//   if (minutes < 1) return '방금 전'
//   if (minutes < 60) return `${minutes}분 전`
//   const hours = Math.floor(minutes / 60)
//   if (hours < 24) return `${hours}시간 전`
//   const days = Math.floor(hours / 24)
//   if (days < 7) return `${days}일 전`
//   const weeks = Math.floor(days / 7)
//   if (weeks < 5) return `${weeks}주 전`
//   const months = Math.floor(days / 30)
//   return `${months}개월 전`
// }

// //* [Modified Code] timestamp 문자열 파싱 처리 및 7일 이후 'YYYY.MM.DD' 표기 로직 반영
function formatRelativeTime(timestamp) {
  const timeValue = new Date(timestamp).getTime()
  if (isNaN(timeValue)) return ''
  
  const diff = Date.now() - timeValue
  const minutes = Math.floor(diff / 60000)
  
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}일 전`
  
  const d = new Date(timeValue)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}.${month}.${day}`
}

/* ── 테마별 클래스 ────────────────────────────────────── */

const THEME = {
  light: {
    container: 'bg-white border-gray-200 shadow-xl text-slate-800',
    header: 'border-b border-gray-100',
    headerTitle: 'text-slate-800',
    badge: 'bg-blue-600 text-white',
    markAllBtn: 'text-blue-600 hover:text-blue-800 hover:bg-blue-50',
    deleteAllBtn: 'text-red-600 hover:text-red-800 hover:bg-red-50',
    item: 'hover:bg-gray-50',
    itemTitle: 'text-slate-800',
    itemTitleRead: 'text-slate-500',
    itemMessage: 'text-gray-500',
    itemTime: 'text-gray-400',
    unreadDot: 'bg-blue-500',
    footer: 'border-t border-gray-100 text-blue-600 hover:bg-gray-50',
    empty: 'text-gray-400',
    categoryBg: (cat) => cat.lightBg,
    categoryText: (cat) => cat.lightText,
  },
  dark: {
    container: 'bg-neutral-900/95 border-neutral-700/60 backdrop-blur-md shadow-2xl text-slate-200',
    header: 'border-b border-neutral-700/60',
    headerTitle: 'text-white',
    badge: 'bg-accent-500 text-white',
    markAllBtn: 'text-accent-400 hover:text-accent-300 hover:bg-neutral-800',
    deleteAllBtn: 'text-red-400 hover:text-red-300 hover:bg-neutral-800',
    item: 'hover:bg-neutral-800/60',
    itemTitle: 'text-slate-200',
    itemTitleRead: 'text-slate-500',
    itemMessage: 'text-slate-400',
    itemTime: 'text-slate-500',
    unreadDot: 'bg-accent-400',
    footer: 'border-t border-neutral-700/60 text-accent-400 hover:bg-neutral-800/60',
    empty: 'text-slate-500',
    categoryBg: (cat) => cat.darkBg,
    categoryText: (cat) => cat.darkText,
  },
}

/* ── 메인 컴포넌트 ────────────────────────────────────── */

export default function NotificationDropdown({ theme = 'light' }) {
  const navigate = useNavigate()
  const dropdownRef = useRef(null)
  const t = THEME[theme] || THEME.light

  const {
    notifications,
    unreadCount,
    chatNotifications,
    chatUnreadCount,
    loading,
    isDropdownOpen,
    fetchAll,
    fetchUnreadCount,
    markRead,
    markChatNotificationRead,
    markAllRead,
    removeAll,
    closeDropdown,
  } = useNotificationStore()

  const selectConversation = useChatStore((s) => s.selectConversation)

  // 백엔드 알림 + 채팅 인메모리 알림 → 단일 리스트로 머지 (created_at 내림차순)
  const mergedNotifications = useMemo(() => {
    const chatItems = chatNotifications.map((n) => {
      const previewLen = 40
      const preview = n.text
        ? (n.text.length > previewLen ? `${n.text.slice(0, previewLen)}...` : n.text)
        : (n.file_name ? `📎 ${n.file_name}` : '')
      return {
        id: n.id,
        category: 'chat',
        title: `${n.sender_name || '알 수 없음'}님께서 메시지를 보냈습니다.`,
        message: preview,
        created_at: typeof n.created_at === 'string' ? new Date(n.created_at).getTime() : n.created_at,
        is_read: n.is_read,
        _isChat: true,
        _conversationId: n.conversation_id,
      }
    })
    return [...chatItems, ...notifications].sort((a, b) => (b.created_at || 0) - (a.created_at || 0))
  }, [notifications, chatNotifications])

  const totalUnread = unreadCount + chatUnreadCount

  // 열릴 때 데이터 새로 가져오기 (백엔드 알림만 — 채팅 알림은 WS push 로 실시간 갱신)
  useEffect(() => {
    if (isDropdownOpen) {
      fetchAll()
      fetchUnreadCount()
    }
  }, [isDropdownOpen, fetchAll, fetchUnreadCount])

  // 클릭 바깥 → 닫기
  useEffect(() => {
    if (!isDropdownOpen) return
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        closeDropdown()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isDropdownOpen, closeDropdown])

  // ESC → 닫기
  useEffect(() => {
    if (!isDropdownOpen) return
    const handleEsc = (e) => {
      if (e.key === 'Escape') closeDropdown()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isDropdownOpen, closeDropdown])

  if (!isDropdownOpen) return null

  const handleItemClick = async (notif) => {
    // 채팅 알림: 인메모리 읽음 처리 + 해당 대화방으로 이동
    if (notif._isChat) {
      markChatNotificationRead(notif.id)
      closeDropdown()
      // selectConversation이 activeConversationId 동기 set + 메시지 fetch + 백엔드 read 처리
      selectConversation(notif._conversationId)
      navigate('/employee/chat')
      return
    }
    // 일반(백엔드) 알림: 기존 동작 유지
    if (!notif.is_read) await markRead(notif.id)
    if (notif.metadata?.link) {
      closeDropdown()
      navigate(notif.metadata.link)
    }
  }

  return (
    <div
      ref={dropdownRef}
      className={`absolute right-0 top-full mt-2 w-96 rounded-xl border z-[100] overflow-hidden ${t.container}`}
    >
      {/* 헤더 */}
      <div className={`px-4 py-3 flex items-center justify-between gap-2 ${t.header}`}>
        <div className="flex items-center gap-2 min-w-0">
          <h3 className={`font-bold text-sm ${t.headerTitle}`}>알림</h3>
          {totalUnread > 0 && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${t.badge}`}>
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {totalUnread > 0 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); markAllRead() }}
              className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md transition ${t.markAllBtn}`}
              title="전체 읽음"
            >
              <i className="ri-check-double-line text-base leading-none" aria-hidden="true" />
              전체 읽음
            </button>
          )}
          {mergedNotifications.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (window.confirm('모든 알림을 삭제하시겠습니까?')) removeAll()
              }}
              className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md transition ${t.deleteAllBtn}`}
              title="전체 삭제"
            >
              <i className="ri-delete-bin-line text-base leading-none" aria-hidden="true" />
              전체 삭제
            </button>
          )}
        </div>
      </div>

      {/* 알림 리스트 */}
      <div className="max-h-[400px] overflow-y-auto">
        {loading && mergedNotifications.length === 0 ? (
          <div className={`py-12 text-center text-sm ${t.empty}`}>
            불러오는 중...
          </div>
        ) : mergedNotifications.length === 0 ? (
          <div className={`py-12 text-center ${t.empty}`}>
            <BellOff size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">새로운 알림이 없습니다</p>
          </div>
        ) : (
          <ul>
            {mergedNotifications.map((notif) => {
              const cat = NOTIFICATION_CATEGORIES[notif.category] || NOTIFICATION_CATEGORIES.system
              const Icon = cat.icon
              return (
                <li
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={`flex items-start gap-3 px-4 py-3 border-l-4 ${cat.border} cursor-pointer transition ${t.item}`}
                >
                  {/* 카테고리 아이콘 */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${t.categoryBg(cat)} ${t.categoryText(cat)}`}>
                    <Icon size={14} />
                  </div>

                  {/* 내용 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${t.categoryBg(cat)} ${t.categoryText(cat)}`}>
                        {cat.label}
                      </span>
                    </div>
                    <p className={`text-sm break-keep leading-snug ${notif.is_read ? t.itemTitleRead : `font-semibold ${t.itemTitle}`}`}>
                      {notif.title}
                    </p>
                    {notif.message && (
                      <p className={`text-xs mt-0.5 line-clamp-1 ${t.itemMessage}`}>
                        {notif.message}
                      </p>
                    )}
                    <p className={`text-[11px] mt-1 ${t.itemTime}`}>
                      {formatRelativeTime(notif.created_at)}
                    </p>
                  </div>

                  {/* 미읽음 표시 */}
                  {!notif.is_read && (
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${t.unreadDot}`} />
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* 푸터 */}
      <div className={`px-4 py-2.5 text-center ${t.footer}`}>
        <button
          type="button"
          onClick={() => { closeDropdown() }}
          className="text-xs font-semibold"
        >
          전체 알림 보기
        </button>
      </div>
    </div>
  )
}
