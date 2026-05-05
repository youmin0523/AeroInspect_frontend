/**
 * components/layout/Header.jsx
 * 역할: 상단 헤더 컴포넌트 (레퍼런스 톤 반영)
 *       - 좌측: DRONE INSPECT 로고 + 브랜드
 *       - 중앙: 검색바 (Global Search)
 *       - 우측: 탐지 심각도 요약 + WebSocket 연결 상태 + 알림 + 프로필
 *       - //! [Original Code] 기존: 드론 텔레메트리(고도/속도/배터리/모드)가 헤더에 있었음
 *       - //* [Modified Code] 텔레메트리는 별도 컴포넌트(DroneStatusCard)로 이동 — 헤더는 가볍게
 */

import { useEffect } from 'react'
import { Search, Bell } from 'lucide-react'
import useDroneStore from '../../store/droneStore.js'
import useDefectStore from '../../store/defectStore.js'
import useNotificationStore from '../../store/notificationStore.js'
import NotificationDropdown from '../notification/NotificationDropdown.jsx'

const STATUS_CONFIG = {
  connected:    { label: '연결됨',    dotClass: 'bg-accent-400 animate-pulse' },
  connecting:   { label: '연결 중...', dotClass: 'bg-yellow-400 animate-pulse' },
  disconnected: { label: '연결 끊김',  dotClass: 'bg-gray-400' },
  error:        { label: '오류',      dotClass: 'bg-red-400 animate-pulse' },
}

export default function Header() {
  const connectionStatus = useDroneStore((s) => s.connectionStatus)
  const { unreadCount, chatUnreadCount, toggleDropdown, isDropdownOpen } = useNotificationStore()
  const totalUnreadCount = unreadCount + chatUnreadCount
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount)

  useEffect(() => { fetchUnreadCount() }, [fetchUnreadCount])

  const defects = useDefectStore((s) => s.defects)
  const severityCounts = defects.reduce(
    (acc, d) => {
      acc[d.severity] = (acc[d.severity] || 0) + 1
      return acc
    },
    { HIGH: 0, MED: 0, LOW: 0 }
  )

  const status = STATUS_CONFIG[connectionStatus] ?? STATUS_CONFIG.disconnected

  return (
    <header className="relative z-50 flex items-center justify-between h-14 px-5 border-b border-slate-700 bg-dashboard-surface shadow-lg flex-shrink-0">
      {/* 좌측: 브랜드 */}
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-accent-500 rounded-md">
          <span className="text-white text-sm" aria-hidden>🚁</span>
        </div>
        <span className="font-extrabold text-white tracking-tight uppercase text-lg">
          DRONE INSPECT
        </span>
        <span className="text-[10px] text-slate-500 ml-1 font-mono">v1.3</span>
      </div>

      {/* 중앙: 검색바 */}
      <div className="relative hidden md:block">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          size={16}
        />
        <input
          type="text"
          placeholder="Global Search..."
          className="bg-dashboard-panel border border-slate-600 rounded-full py-1.5 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-500 w-64"
        />
      </div>

      {/* 우측: 심각도 요약 + 연결 상태 + 알림 + 프로필 */}
      <div className="flex items-center gap-3">
        {/* 심각도 카운터 */}
        <div className="hidden lg:flex items-center gap-2 text-xs">
          <span className="badge-high">{severityCounts.HIGH} HIGH</span>
          <span className="badge-med">{severityCounts.MED} MED</span>
          <span className="badge-low">{severityCounts.LOW} LOW</span>
        </div>

        {/* WS 연결 상태 */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 px-2">
          <span className={`w-2 h-2 rounded-full ${status.dotClass}`} />
          <span>{status.label}</span>
        </div>

        {/* 알림 */}
        <div className="relative">
          <button
            type="button"
            className="icon-btn relative"
            aria-label="알림"
            onClick={toggleDropdown}
          >
            <Bell size={18} />
            {totalUnreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 border-2 border-dashboard-surface">
                {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
              </span>
            )}
          </button>
          <NotificationDropdown theme="dark" />
        </div>

        {/* 프로필 (TODO: 로그인 연동 시 실제 사용자 정보 바인딩) */}
        <div
          className="w-8 h-8 rounded-full bg-slate-600 border border-slate-500 flex items-center justify-center text-xs font-bold text-white"
          title="프로필"
        >
          U
        </div>
      </div>
    </header>
  )
}
