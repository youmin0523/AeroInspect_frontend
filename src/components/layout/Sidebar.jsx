/**
 * components/layout/Sidebar.jsx
 * 역할: 좌측 사이드바 내비게이션
 *       - 상단: 브랜드 로고 (logo_white.png — 다크 사이드바에 맞춰 흰 배경용)
 *       - 중앙: 아이콘 내비 (현재는 대시보드만 활성, 나머지는 "준비 중" placeholder)
 *       - 하단: 로그아웃 버튼 (TEMP — DB 연결 전 실제 세션 연동 미구현)
 *       - //* [Modified Code] 에메랄드 🚁 박스 → 실제 로고 이미지로 교체
 *       - //* [Modified Code] NAV_ITEMS 확장: 하자 리포트 / 비행 경로 / 드론 관리 / 설정 placeholder
 */

import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  Map,
  MessageSquare,
  Plane,
  Settings,
  LogOut,
} from 'lucide-react'
import useChatStore from '../../store/chatStore.js'
import logoWhite from '../../assets/logo/logo_white.png'

// 내비 항목. disabled: true → "준비 중" placeholder (클릭 시 무동작, 툴팁만 표시).
// //* [Modified Code] 2026-04-16: /employee/reports 페이지 실제 구축 → 하자 리포트 활성화
const NAV_ITEMS = [
  { key: 'dashboard', to: '/dashboard',        icon: LayoutDashboard, label: '대시보드' },
  { key: 'reports',   to: '/employee/reports', icon: FileText,        label: '하자 리포트' },
  { key: 'chat',      to: '/employee/chat',    icon: MessageSquare,   label: '메신저' },
  { key: 'flights',   to: '#',                 icon: Map,             label: '비행 경로',  disabled: true },
  { key: 'drones',    to: '#',                 icon: Plane,           label: '드론 관리',  disabled: true },
  { key: 'settings',  to: '#',                 icon: Settings,        label: '설정',       disabled: true },
]

export default function Sidebar() {
  const chatUnread = useChatStore((s) => s.unreadTotal)

  return (
    <aside className="flex flex-col w-14 bg-dashboard-surface border-r border-neutral-700 flex-shrink-0">
      {/* 브랜드 로고 — 사이드바 상단 */}
      <div className="flex items-center justify-center h-14 border-b border-neutral-700">
        <img
          src={logoWhite}
          alt="DRONE INSPECT"
          className="w-11 h-11 object-contain"
        />
      </div>

      {/* 내비게이션 (active: emerald accent) */}
      <nav className="flex flex-col items-center gap-1 pt-3 flex-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          if (item.disabled) {
            return (
              <button
                key={item.key}
                type="button"
                title={`${item.label} — 준비 중`}
                className="flex items-center justify-center w-10 h-10 rounded-lg text-slate-600 opacity-60 cursor-not-allowed"
                aria-disabled="true"
              >
                <Icon size={18} />
              </button>
            )
          }
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
      </nav>

      {/* 하단: 로그아웃 (TEMP — 세션 연동 전) */}
      <div className="flex flex-col items-center pb-3 border-t border-neutral-700 pt-3">
        <button
          type="button"
          title="로그아웃 — 세션 연동 전 임시 버튼"
          className="flex items-center justify-center w-10 h-10 rounded-lg text-slate-400 hover:bg-neutral-700/60 hover:text-white transition"
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  )
}
