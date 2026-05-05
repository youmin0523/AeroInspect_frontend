/**
 * components/dashboard/DashboardTopBar.jsx
 * 역할: 풀스크린 HUD 상단 바 — 레퍼런스 "Global Search / Satellite Map / Flightpaths" 톤
 *       - 맵 위에 떠있는 반투명 바 (pointer-events는 자식 요소에만 허용)
 *       - 좌측: 브랜드 로고 + Global Search
 *       - 중앙: Satellite Map 토글 (UI only, 추후 Mapbox 도입 시 실제 베이스맵 전환)
 *       - 우측: Flightpaths 필터 + WS 연결 상태 + 알림 + 프로필
 */

import { useEffect } from 'react'
import { Search, Satellite, Route, Bell } from 'lucide-react'
import useDroneStore from '../../store/droneStore.js'
import useDefectStore from '../../store/defectStore.js'
import useSessionStore from '../../store/sessionStore.js'
import useNotificationStore from '../../store/notificationStore.js'
import MissionControl from './MissionControl.jsx'
import NotificationDropdown from '../notification/NotificationDropdown.jsx'

const STATUS_CONFIG = {
  connected:    { label: 'LIVE',     dotClass: 'bg-accent-400 animate-pulse' },
  connecting:   { label: 'SYNC',     dotClass: 'bg-yellow-400 animate-pulse' },
  disconnected: { label: 'OFFLINE',  dotClass: 'bg-neutral-500' },
  error:        { label: 'ERROR',    dotClass: 'bg-red-400 animate-pulse' },
}

// //* [Modified Code] onMissionEnd prop — Dashboard 가 /dashboard/report 네비게이션을 주입
export default function DashboardTopBar({ onMissionEnd }) {
  const connectionStatus = useDroneStore((s) => s.connectionStatus)
  const defects = useDefectStore((s) => s.defects)
  const highCount = defects.filter((d) => d.severity === 'HIGH').length
  const status = STATUS_CONFIG[connectionStatus] ?? STATUS_CONFIG.disconnected
  const { unreadCount, chatUnreadCount, toggleDropdown } = useNotificationStore()
  const totalUnreadCount = unreadCount + chatUnreadCount
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount)

  useEffect(() => { fetchUnreadCount() }, [fetchUnreadCount])

  // //* [Modified Code] 세션 컨텍스트 구독 — 좌측 브랜드 옆에 "현장 · 운용자 · Lv" 라벨
  const siteName = useSessionStore((s) => s.siteName)
  const operatorName = useSessionStore((s) => s.operatorName)
  const level = useSessionStore((s) => s.level)

  return (
    <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between gap-3 px-5 py-3 pointer-events-none">
      {/* 좌측: 브랜드 + 세션 컨텍스트 + 검색 */}
      <div className="flex items-center gap-3 pointer-events-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-900/70 border border-neutral-700/60 backdrop-blur-sm shadow-md">
          <div className="p-1 bg-accent-500 rounded-md">
            <span className="text-white text-xs" aria-hidden>🚁</span>
          </div>
          <span className="font-extrabold text-white tracking-tight uppercase text-sm">
            DRONE INSPECT
          </span>
        </div>

        {/* //* [Modified Code] 세션 컨텍스트 라벨 */}
        {siteName && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-900/70 border border-accent-500/30 backdrop-blur-sm shadow-md">
            <span className="text-xs text-slate-400">Session</span>
            <span className="text-xs text-white font-semibold truncate max-w-[240px]">{siteName}</span>
            <span className="text-[10px] text-slate-500">·</span>
            <span className="text-xs text-slate-300">{operatorName}</span>
            <span className="text-xs font-medium text-accent-400 bg-accent-500/10 px-1.5 py-0.5 rounded">
              L{level}
            </span>
          </div>
        )}

        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={14}
          />
          <input
            type="text"
            placeholder="Global Search..."
            className="bg-neutral-900/70 border border-neutral-700/60 backdrop-blur-md rounded-lg py-2 pl-9 pr-4 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-500 w-60 shadow-lg"
          />
        </div>
      </div>

      {/* //* [Modified Code] 중앙: MissionControl (START/END) + Satellite Map 토글 */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <MissionControl onEnd={onMissionEnd} />
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-900/70 border border-accent-500/40 backdrop-blur-md text-xs text-accent-300 font-semibold shadow-lg hover:bg-accent-500/10 transition"
          title="위성 맵 (데모 — Mapbox 도입 전)"
        >
          <Satellite size={14} />
          Satellite Map
        </button>
      </div>

      {/* 우측: Flightpaths + 상태 + 알림 + 프로필 */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-900/70 border border-neutral-700/60 backdrop-blur-md text-xs text-slate-200 font-semibold shadow-lg hover:border-neutral-500 transition"
          title="비행 경로 필터"
        >
          <Route size={14} />
          Flightpaths
        </button>

        <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-900/70 border border-neutral-700/60 backdrop-blur-md text-xs text-slate-300 shadow-lg">
          <span className={`w-2 h-2 rounded-full ${status.dotClass}`} />
          <span className="font-mono">{status.label}</span>
        </div>

        <div className="relative">
          <button
            type="button"
            className="relative p-2 rounded-lg bg-neutral-900/70 border border-neutral-700/60 backdrop-blur-md text-slate-300 hover:text-white shadow-lg transition"
            aria-label="알림"
            onClick={toggleDropdown}
          >
            <Bell size={14} />
            {totalUnreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 border-2 border-neutral-900">
                {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
              </span>
            )}
          </button>
          <NotificationDropdown theme="dark" />
        </div>

        <div
          className="w-9 h-9 rounded-lg bg-neutral-900/70 border border-neutral-700/60 backdrop-blur-md flex items-center justify-center text-xs font-bold text-white shadow-lg"
          title="프로필 (TEMP — DB 연결 전)"
        >
          U
        </div>
      </div>
    </div>
  )
}
