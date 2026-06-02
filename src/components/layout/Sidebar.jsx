/**
 * components/layout/Sidebar.jsx
 * 역할: 좌측 사이드바 내비게이션 — 업무툴 진입점 (R-v1.1.18 전체 아이콘 연결)
 *       - 상단: 브랜드 로고
 *       - 중앙: 11개 아이콘 (라우트 6 + 액션 5)
 *       - 하단: 알림 + 설정 + 매뉴얼 + 로그아웃
 *
 * 아이콘 연결 정책 (R-v1.1.18):
 *   route → NavLink (활성 페이지 존재)
 *   action → button onClick (모달 또는 store dispatch)
 */

import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  Map,
  MessageSquare,
  Plane,
  Settings,
  LogOut,
  ShieldCheck,
  Users,
  Cpu,
  Building2,
  ClipboardCheck,
  TrendingUp,
  Bot,
  Bell,
  BookOpen,
} from 'lucide-react'
import useChatStore from '../../store/chatStore.js'
import useAuthStore, { selectIsAdmin } from '../../store/authStore.js'
import useNotificationStore from '../../store/notificationStore.js'
import useAiChatStore from '../../store/aiChatStore.js'
import SettingsModal from '../settings/SettingsModal.jsx'
import ManualModal from '../manual/ManualModal.jsx'
import logoWhite from '../../assets/logo/logo_white.png'

// 라우트형 내비 — 기존 페이지 활용
const ROUTE_NAV = [
  { key: 'dashboard', to: '/dashboard',          icon: LayoutDashboard, label: '대시보드' },
  { key: 'sites',     to: '/employee/sites',     icon: Building2,       label: '현장 관리' },
  { key: 'pre-work',  to: '/employee/pre-work',  icon: ClipboardCheck,  label: '사전 점검' },
  { key: 'reports',   to: '/employee/reports',   icon: FileText,        label: '하자 리포트' },
  { key: 'analytics', to: '/employee/analytics', icon: TrendingUp,      label: '통계 분석' },
  { key: 'chat',      to: '/employee/chat',      icon: MessageSquare,   label: '메신저' },
]

// admin 전용 라우트
const ADMIN_NAV = [
  { key: 'admin-members', to: '/employee/admin/members', icon: Users, label: '조직원 관리' },
  { key: 'admin-gpu',     to: '/employee/admin/gpu',     icon: Cpu,   label: 'GPU 모니터' },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const chatUnread = useChatStore((s) => s.unreadTotal)
  const isAdmin = useAuthStore(selectIsAdmin)
  const logout = useAuthStore((s) => s.logout)
  const notifUnread = useNotificationStore((s) => s.unreadCount) ?? 0
  const toggleNotifDropdown = useNotificationStore((s) => s.toggleDropdown)
  const openChatbot = useAiChatStore((s) => s.open)

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)

  // 액션형 내비 — 모달/스토어 디스패치/외부 라우트
  // (handlers는 컴포넌트 내부 — closures 필요)
  const ACTION_NAV = [
    {
      key: 'flights',
      icon: Map,
      label: '비행 경로 설계',
      title: '세션 셋업으로 이동 — 비행 경로/하자 검출 영역 지정',
      onClick: () => navigate('/session/setup'),
    },
    {
      key: 'drones',
      icon: Plane,
      label: '드론 관리',
      title: isAdmin ? 'GPU 모니터로 이동 — 드론 컨트롤러 인스턴스 관리' : '드론 관리 (관리자 전용)',
      onClick: () => {
        if (isAdmin) {
          navigate('/employee/admin/gpu')
        } else {
          alert('드론 관리는 관리자 전용입니다. 조직 관리자에게 문의해 주세요.')
        }
      },
    },
    {
      key: 'ai-chat',
      icon: Bot,
      label: 'AI 어시스턴트',
      title: 'AI 챗봇 열기 — 운영/검출 문의',
      onClick: () => openChatbot(),
    },
    {
      key: 'manual',
      icon: BookOpen,
      label: '운영 매뉴얼',
      title: '운영 매뉴얼 — 빠른 시작/안전 수칙',
      onClick: () => setManualOpen(true),
    },
  ]

  const handleLogout = () => {
    if (!confirm('로그아웃 하시겠습니까?')) return
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      <aside className="flex flex-col w-14 bg-dashboard-surface border-r border-neutral-700 flex-shrink-0">
        {/* 브랜드 로고 */}
        <div className="flex items-center justify-center h-14 border-b border-neutral-700">
          <img
            src={logoWhite}
            alt="DRONE INSPECT"
            className="w-11 h-11 object-contain"
          />
        </div>

        {/* 내비게이션 */}
        <nav className="flex flex-col items-center gap-1 pt-3 flex-1 overflow-y-auto pb-2">
          {/* 라우트형 — NavLink */}
          {ROUTE_NAV.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.key}
                to={item.to}
                title={item.label}
                className={({ isActive }) =>
                  `relative flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-accent-500/20 text-accent-400 border border-accent-500/40'
                      : 'text-slate-400 hover:bg-neutral-700/60 hover:text-white'
                  }`
                }
              >
                <Icon size={18} />
                {item.key === 'chat' && chatUnread > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full px-0.5">
                    {chatUnread > 9 ? '9+' : chatUnread}
                  </span>
                )}
              </NavLink>
            )
          })}

          {/* 구분선 — 액션형 진입 */}
          <div className="w-6 h-px bg-neutral-700 my-1.5" aria-hidden />

          {/* 액션형 — button */}
          {ACTION_NAV.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.key}
                type="button"
                onClick={item.onClick}
                title={item.title}
                className="flex items-center justify-center w-10 h-10 rounded-lg text-slate-400 hover:bg-neutral-700/60 hover:text-white transition-colors"
              >
                <Icon size={18} />
              </button>
            )
          })}

          {/* admin 전용 — owner/admin/superadmin */}
          {isAdmin && (
            <>
              <div
                className="my-2 flex flex-col items-center gap-0.5 text-amber-400/80"
                title="관리자 전용"
              >
                <ShieldCheck size={12} />
                <span className="w-6 h-px bg-amber-400/30" aria-hidden />
              </div>
              {ADMIN_NAV.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.key}
                    to={item.to}
                    title={`${item.label} — 관리자 전용`}
                    className={({ isActive }) =>
                      `relative flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'text-amber-400/70 hover:bg-amber-500/10 hover:text-amber-300'
                      }`
                    }
                  >
                    <Icon size={18} />
                  </NavLink>
                )
              })}
            </>
          )}
        </nav>

        {/* 하단: 알림 + 설정 + 로그아웃 */}
        <div className="flex flex-col items-center pb-3 border-t border-neutral-700 pt-3 gap-1">
          {/* 알림 */}
          <button
            type="button"
            title="알림 — 미확인 알림이 있으면 빨간 뱃지"
            onClick={() => toggleNotifDropdown && toggleNotifDropdown()}
            className="relative flex items-center justify-center w-10 h-10 rounded-lg text-slate-400 hover:bg-neutral-700/60 hover:text-white transition"
          >
            <Bell size={18} />
            {notifUnread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full px-0.5">
                {notifUnread > 9 ? '9+' : notifUnread}
              </span>
            )}
          </button>

          {/* 설정 */}
          <button
            type="button"
            title="설정 — 알림 권한/테스트 모드/캐시 정리"
            onClick={() => setSettingsOpen(true)}
            className="flex items-center justify-center w-10 h-10 rounded-lg text-slate-400 hover:bg-neutral-700/60 hover:text-white transition"
          >
            <Settings size={18} />
          </button>

          {/* 로그아웃 */}
          <button
            type="button"
            title="로그아웃 — 세션 종료 후 로그인 화면으로 이동"
            onClick={handleLogout}
            className="flex items-center justify-center w-10 h-10 rounded-lg text-slate-400 hover:bg-red-500/15 hover:text-red-300 transition"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* 모달 — Sidebar 외부에 portal-like 렌더 */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ManualModal isOpen={manualOpen} onClose={() => setManualOpen(false)} />
    </>
  )
}
