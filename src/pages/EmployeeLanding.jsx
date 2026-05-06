/**
 * EmployeeLanding.jsx  (v2 — 사무실 허브형)
 * 역할: 직원 전용 관제 허브 — "현장 나가기 전/후 사무실에서 쓰는 작업 홈"
 *       - `/employee` 진입 시 최초로 보이는 페이지. `/session/setup` 은 **실제 현장** 에서 쓰는 플로우라 별도.
 *       - 도면 사전 작업 · 보고서 작성 · 현장 관리 · 팀 할당 · 알림 · KPI 요약을 한눈에.
 *       - 랜딩(`/`) 과 톤온톤: `bg-gray-50` 전체 배경 + 흰 카드 + slate-900 배너 + blue/yellow/green accent.
 *
 * //! [Original Code] v1 "Interior Inspection Dashboard" 풀 JSX 목업(실시간 드론 HUD + 평면도 핀 + 결함 분석 사이드패널)
 *   은 이 페이지의 목적(사무실 허브)과 맞지 않아 v2 로 전면 교체함.
 *   v1 원본 전체는 `Vibe_Coding_Log.md` 의 "⏱ 2026-04-16 17:20" 라운드 블록에 아카이브 보관.
 *   (현장 작업용 실시간 HUD 는 `/dashboard` 영역 소관이며, v1 목업의 실내 버전은 추후 `/dashboard/indoor` 신설 시 재활용 예정)
 *
 * 데이터 출처:
 *   - 실데이터(store): 현재 세션 siteName / operatorName / level (sessionStore), defects.length·severity (defectStore),
 *                     mission 시간(droneStore)
 *   - 목업 데이터(MOCK_*): 이번 달 누적치 / 오늘 일정 / 알림 / 팀원 / 최근 활동
 *     → DB 연결 시 MOCK_* 상수를 각 API 훅 호출로 교체 (키·타입 동일하게 유지)
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bell,
  Building,
  Calendar,
  Camera,
  CheckCircle,
  Clock,
  FileText,
  LogOut,
  MapPin,
  Play,
  Trash2,
  TrendingUp,
  Upload,
  UserCheck,
  Users,
  Activity,
  MessageSquare,
  Shield,
  FlaskConical,
  Cpu,
} from 'lucide-react'
import useAuthStore from '../store/authStore.js'
import useDefectStore from '../store/defectStore.js'
import useDroneStore from '../store/droneStore.js'
import useSessionStore from '../store/sessionStore.js'
import useNotificationStore from '../store/notificationStore.js'
import useChatStore from '../store/chatStore.js'
import NotificationDropdown from '../components/notification/NotificationDropdown.jsx'
import NOTIFICATION_CATEGORIES from '../constants/notificationCategories.js'

/* ──────────────────────────────────────────────────────────────
   상수
   ────────────────────────────────────────────────────────────── */

// 영상 수신기 도착 후 true 로 토글하면 진짜 현장점검(/session/setup) 진입 카드가 즉시 복구됨.
// 함께 testModeCard 의 라벨/색상도 'TEST MODE'/빨강 으로 되돌릴 것.
const FIELD_INSPECTION_ENABLED = false


// 요일 한국어 매핑
const KR_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

// API 기본 URL (Vite env)
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// KPI 비어있을 때 (API 실패/조직 미배정 등) 0 으로 떨어지지 않게 안전한 fallback.
// 운영 환경에서는 시드된 데이터가 채워주므로 거의 사용되지 않음.
const EMPTY_MONTHLY_KPI = {
  inspectionsCompleted: 0,
  reportsPublished: 0,
  averageFlightMinutes: 0,
}

/* ──────────────────────────────────────────────────────────────
   메인 컴포넌트
   ────────────────────────────────────────────────────────────── */

export default function EmployeeLanding() {
  // 실데이터: 현재 세션
  const siteName = useSessionStore((s) => s.siteName)
  const operatorName = useSessionStore((s) => s.operatorName)
  const level = useSessionStore((s) => s.level)

  // 실데이터: 현재 세션 하자
  const defects = useDefectStore((s) => s.defects)
  const severityCounts = useMemo(
    () =>
      defects.reduce(
        (acc, d) => {
          acc[d.severity] = (acc[d.severity] || 0) + 1
          return acc
        },
        { HIGH: 0, MED: 0, LOW: 0 }
      ),
    [defects]
  )

  // 실데이터: 비행 상태
  const missionStatus = useDroneStore((s) => s.missionStatus)
  const missionStartedAt = useDroneStore((s) => s.missionStartedAt)
  const missionEndedAt = useDroneStore((s) => s.missionEndedAt)

  // 파생: 오늘 날짜 포맷 ("2026-04-16 수요일")
  const { dateStr, weekdayLabel } = useMemo(() => {
    const today = new Date()
    return {
      dateStr: today.toISOString().slice(0, 10),
      weekdayLabel: KR_WEEKDAYS[today.getDay()] + '요일',
    }
  }, [])

  // 파생: 현재 세션 비행 지속 시간(분)
  const currentFlightMinutes = useMemo(() => {
    if (!missionStartedAt) return null
    const end = missionEndedAt ?? Date.now()
    return Math.round((end - missionStartedAt) / 60000)
  }, [missionStartedAt, missionEndedAt])

  // 알림 데이터 — 초기 로드만 트리거 (실제 구독은 NotificationsSection 내부에서)
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const fetchAll = useNotificationStore((s) => s.fetchAll)
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount)

  useEffect(() => { fetchAll(); fetchUnreadCount() }, [fetchAll, fetchUnreadCount])

  // ── 백엔드 데이터: 오늘 일정 / 월간 KPI / 팀원 / 최근 활동 ──
  const token = useAuthStore((s) => s.token)
  const [todaySchedule, setTodaySchedule] = useState([])
  const [monthlyKpi, setMonthlyKpi] = useState(EMPTY_MONTHLY_KPI)
  const [teamMembers, setTeamMembers] = useState([])
  const [recentActivities, setRecentActivities] = useState([])

  useEffect(() => {
    if (!token) return
    const headers = { Authorization: `Bearer ${token}` }

    // 4개 API 병렬 호출. 하나가 실패해도 나머지는 표시.
    axios.get(`${API_BASE}/api/v1/employee/schedule/today`, { headers })
      .then((r) => setTodaySchedule(r.data || []))
      .catch(() => setTodaySchedule([]))

    axios.get(`${API_BASE}/api/v1/employee/kpi/monthly`, { headers })
      .then((r) => setMonthlyKpi({
        inspectionsCompleted: r.data?.inspections_completed ?? 0,
        reportsPublished: r.data?.reports_published ?? 0,
        averageFlightMinutes: r.data?.average_flight_minutes ?? 0,
      }))
      .catch(() => setMonthlyKpi(EMPTY_MONTHLY_KPI))

    axios.get(`${API_BASE}/api/v1/employee/activities`, { headers, params: { limit: 5 } })
      .then((r) => setRecentActivities(r.data || []))
      .catch(() => setRecentActivities([]))

    axios.get(`${API_BASE}/api/v1/organizations/members`, { headers })
      .then((r) => setTeamMembers((r.data?.members || []).map((m) => ({
        id: m.user_id,
        name: m.name,
        role: m.position || m.role,
        team: m.department || '미배정',
        assignedSite: '—',  // 별도 endpoint 신설 시 보강
        status: m.status === 'active' ? 'office' : 'standby',
        initials: (m.initials || m.name?.slice(0, 2) || '??').toUpperCase(),
      }))))
      .catch(() => setTeamMembers([]))
  }, [token])

  // 현재 세션 컨텍스트 요약 문구 ("진행 중 세션 없음" / "송파 헬리오시티 · Level 3 · 비행 중")
  const sessionContextLabel = useMemo(() => {
    if (!siteName) return '진행 중인 세션이 없습니다.'
    const parts = [siteName]
    if (level) parts.push(`Level ${level}`)
    const statusMap = { idle: '대기', flying: '비행 중', ended: '종료' }
    parts.push(statusMap[missionStatus] || '대기')
    return parts.join(' · ')
  }, [siteName, level, missionStatus])

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800 font-sans antialiased">
      <EmployeeHeader operatorName={operatorName} />

      <WelcomeBanner
        operatorName={operatorName}
        dateStr={dateStr}
        weekdayLabel={weekdayLabel}
        todayCount={todaySchedule.length}
        pendingReports={unreadCount}
        sessionContextLabel={sessionContextLabel}
      />

      <main className="max-w-7xl mx-auto px-6 md:px-8 py-10 md:py-12 space-y-10 md:space-y-12">
        <QuickActionsSection />

        <KPISection
          monthlyKpi={monthlyKpi}
          currentDefectCount={defects.length}
          currentHighSeverity={severityCounts.HIGH}
          currentFlightMinutes={currentFlightMinutes}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TodayScheduleSection schedules={todaySchedule} />
          <NotificationsSection />
        </div>

        <TeamAssignmentsSection members={teamMembers} />

        <RecentActivitySection activities={recentActivities} />
      </main>

    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   1. 상단 헤더 — 밝은 톤(랜딩 스크롤 후 헤더와 동일 감성)
   ────────────────────────────────────────────────────────────── */

function EmployeeHeader({ operatorName }) {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const token = useAuthStore((s) => s.token)
  const currentOrg = useAuthStore((s) => s.currentOrg)
  const user = useAuthStore((s) => s.user)
  const displayName = user?.name || operatorName || '게스트'
  const initials = (displayName?.slice(0, 2) || 'GU').toUpperCase()
  const { unreadCount, chatUnreadCount, toggleDropdown } = useNotificationStore()
  const totalUnreadCount = unreadCount + chatUnreadCount
  const chatUnread = useChatStore((s) => s.unreadTotal)
  const [profileOpen, setProfileOpen] = useState(false)
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const profileRef = useRef(null)

  const isAdmin = user?.is_superadmin || (currentOrg && ['owner', 'admin'].includes(currentOrg.role))

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-3 flex items-center justify-between gap-4">
        {/* 좌측: 메인으로 + 브랜드 */}
        <div className="flex items-center gap-4 md:gap-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-blue-600 transition"
            title="메인 랜딩으로"
          >
            <ArrowLeft size={16} /> 메인으로
          </Link>
          <div className="h-5 w-px bg-gray-200 hidden md:block" aria-hidden />
          <div className="flex items-center gap-2">
            <Building className="text-blue-600" size={20} />
            <span className="font-extrabold tracking-tight text-slate-800 uppercase text-sm md:text-base">
              DRONE INSPECT <span className="text-blue-600 font-light">Employee</span>
            </span>
          </div>
        </div>

        {/* 우측: 메신저 · 알림 · 프로필 · 로그아웃 */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* 메신저 바로가기 */}
          <Link
            to="/employee/chat"
            className="relative p-2 rounded-full hover:bg-gray-100 transition focus:outline-none focus:ring-2 focus:ring-blue-400"
            aria-label="메신저"
            title="메신저"
          >
            <MessageSquare size={18} className="text-gray-600" />
            {chatUnread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-blue-600 text-white text-[10px] font-bold rounded-full px-1 border-2 border-white">
                {chatUnread > 9 ? '9+' : chatUnread}
              </span>
            )}
          </Link>

          {/* 알림 */}
          <div className="relative">
            <button
              type="button"
              className="relative p-2 rounded-full hover:bg-gray-100 transition focus:outline-none focus:ring-2 focus:ring-blue-400"
              aria-label="알림 보기"
              title="알림"
              onClick={toggleDropdown}
            >
              <Bell size={18} className="text-gray-600" />
              {totalUnreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 border-2 border-white">
                  {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                </span>
              )}
            </button>
            <NotificationDropdown theme="light" />
          </div>
          {/* 프로필 드롭다운 */}
          <div className="relative pl-3 border-l border-gray-200" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              className="flex items-center gap-3 hover:opacity-80 transition focus:outline-none"
            >
              <div className="hidden md:block text-right leading-tight">
                <p className="text-sm font-bold text-slate-800">{displayName}</p>
                <p className="text-[11px] text-gray-500">
                  {currentOrg ? currentOrg.name : '소속 없음'}
                </p>
              </div>
              {user?.profile_image_url ? (
                <img
                  src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${user.profile_image_url}`}
                  alt="프로필"
                  className="w-9 h-9 rounded-full object-cover shadow cursor-pointer"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow cursor-pointer">
                  {initials}
                </div>
              )}
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50">
                {/* 사용자 정보 */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="font-semibold text-slate-900 text-sm">{displayName}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  {user?.is_superadmin && (
                    <span className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">
                      슈퍼어드민
                    </span>
                  )}
                  {currentOrg && (
                    <span className={`inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      currentOrg.role === 'owner' ? 'bg-amber-100 text-amber-700' :
                      currentOrg.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {currentOrg.role === 'owner' ? '소유자' : currentOrg.role === 'admin' ? '관리자' : '멤버'}
                      {currentOrg.department ? ` · ${currentOrg.department}` : ''}
                    </span>
                  )}
                </div>

                {/* 메뉴 항목 */}
                <div className="py-1">
                  <button
                    onClick={() => { setProfileOpen(false); setEditProfileOpen(true) }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition"
                  >
                    <UserCheck size={16} className="text-gray-400" />
                    내 정보 수정
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => { setProfileOpen(false); navigate('/employee/admin/members') }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition"
                    >
                      <Users size={16} className="text-gray-400" />
                      멤버 관리
                    </button>
                  )}
                </div>

                {/* 로그아웃 */}
                <div className="border-t border-gray-100 pt-1">
                  <button
                    onClick={() => { setProfileOpen(false); handleLogout() }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition"
                  >
                    <LogOut size={16} className="text-red-400" />
                    로그아웃
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 내 정보 수정 모달 */}
      {editProfileOpen && (
        <EditProfileModal user={user} token={token} onClose={() => setEditProfileOpen(false)} />
      )}
    </header>
  )
}


/* ──────────────────────────────────────────────────────────────
   1-1. 내 정보 수정 모달
   ────────────────────────────────────────────────────────────── */

function EditProfileModal({ user, token, onClose }) {
  const setAuth = useAuthStore((s) => s.setAuth)
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  })
  const [loading, setLoading] = useState(false)
  const [imageLoading, setImageLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef(null)

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
  const initials = (user?.name?.slice(0, 2) || 'GU').toUpperCase()

  // 프로필 이미지 업로드
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드할 수 있습니다.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('이미지 크기는 5MB 이하만 가능합니다.')
      return
    }

    setImageLoading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`${API_BASE}/api/v1/auth/me/profile-image`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || '이미지 업로드에 실패했습니다.')
      }
      const updated = await res.json()
      setAuth(token, updated)
    } catch (err) {
      setError(err.message)
    } finally {
      setImageLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // 프로필 이미지 삭제
  const handleImageDelete = async () => {
    setImageLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/me/profile-image`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || '이미지 삭제에 실패했습니다.')
      }
      const updated = await res.json()
      setAuth(token, updated)
    } catch (err) {
      setError(err.message)
    } finally {
      setImageLoading(false)
    }
  }

  const handleSave = async () => {
    if (!form.name.trim()) return setError('이름을 입력해주세요.')
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: form.name.trim(), phone: form.phone.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || '수정에 실패했습니다.')
      }
      // 최신 사용자 정보 반영
      const meRes = await fetch(`${API_BASE}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const meData = await meRes.json()
      setAuth(token, meData)
      setSuccess(true)
      setTimeout(onClose, 800)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // 실시간 반영된 user 가져오기 (이미지 업로드 후 store가 갱신되므로)
  const currentUser = useAuthStore((s) => s.user)
  const profileImageUrl = currentUser?.profile_image_url
    ? `${API_BASE}${currentUser.profile_image_url}`
    : null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-slate-900 mb-5">내 정보 수정</h3>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-50 text-green-600 text-sm rounded-lg">저장되었습니다.</div>}

        {/* 프로필 이미지 영역 */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative group">
            {profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt="프로필"
                className="w-24 h-24 rounded-full object-cover border-4 border-gray-100 shadow"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold border-4 border-gray-100 shadow">
                {initials}
              </div>
            )}
            {/* 카메라 오버레이 */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={imageLoading}
              className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition cursor-pointer"
            >
              <Camera size={24} className="text-white opacity-0 group-hover:opacity-100 transition" />
            </button>
            {imageLoading && (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleImageUpload}
          />
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={imageLoading}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium transition"
            >
              사진 변경
            </button>
            {currentUser?.profile_image_url && (
              <>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={handleImageDelete}
                  disabled={imageLoading}
                  className="text-xs text-red-500 hover:text-red-700 font-medium transition flex items-center gap-1"
                >
                  <Trash2 size={12} /> 삭제
                </button>
              </>
            )}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">JPEG, PNG, WebP, GIF / 최대 5MB</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
            <input
              type="text"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="010-0000-0000"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition disabled:opacity-50"
          >
            {loading ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}


/* ──────────────────────────────────────────────────────────────
   2. 환영 배너 — 다크 slate-900 (랜딩 ServiceIntroSection 동일 감성)
   ────────────────────────────────────────────────────────────── */

function WelcomeBanner({
  dateStr,
  weekdayLabel,
  todayCount,
  pendingReports,
  sessionContextLabel,
}) {
  const user = useAuthStore((s) => s.user)
  const currentOrg = useAuthStore((s) => s.currentOrg)
  const name = user?.name || '게스트'
  const position = currentOrg?.position || ''
  return (
    <section className="relative bg-slate-900 text-white overflow-hidden">
      {/* 점무늬 데코 — 랜딩 Hero 와 동일한 노란 닷 패턴 */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#fbbf24 1px, transparent 1px)',
          backgroundSize: '30px 30px',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6 md:px-8 py-10 md:py-14">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <p className="text-sm text-blue-300 font-mono tracking-widest uppercase mb-2">
              Employee · Office Hub
            </p>
            <h1 className="text-2xl md:text-4xl font-extrabold leading-tight break-keep">
              {name}{position ? ` ${position}` : ''}님, 좋은 하루입니다.
              <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-yellow-400">
                오늘도 안전한 점검을 응원합니다.
              </span>
            </h1>
            <p className="text-gray-300 mt-3 text-sm md:text-base">
              {dateStr} ({weekdayLabel}) · {sessionContextLabel}
            </p>
          </div>

          {/* 오늘 요약 스탯 (배너 내부) */}
          <div className="flex gap-3 md:gap-4">
            <SummaryPill label="오늘 일정" value={`${todayCount}건`} accent="blue" />
            <SummaryPill label="승인 대기 보고서" value={`${pendingReports}건`} accent="yellow" />
          </div>
        </div>
      </div>
    </section>
  )
}

function SummaryPill({ label, value, accent }) {
  const accentClass =
    accent === 'yellow'
      ? 'border-yellow-400/40 bg-yellow-400/10 text-yellow-200'
      : 'border-blue-400/40 bg-blue-400/10 text-blue-200'
  return (
    <div className={`rounded-lg border px-4 py-3 min-w-[120px] ${accentClass}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</p>
      <p className="text-xl md:text-2xl font-extrabold mt-1">{value}</p>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   3. 퀵 액션 — 4장 카드 (현장 점검 시작은 /session/setup 으로)
   ────────────────────────────────────────────────────────────── */

const QUICK_ACTIONS = [
  {
    key: 'start-inspection',
    title: '현장 점검 시작',
    desc: '현장 정보 입력 → 모델링 → 실시간 관제까지 한 번에 진입합니다.',
    to: '/session/setup',
    icon: Play,
    accent: 'blue',
    primary: true,
  },
  {
    key: 'upload-drawing',
    title: '도면 업로드 · 사전 작업',
    desc: 'CAD/평면도 업로드 및 Mock 3D 모델링까지 한 번에. 현장 세션에서 바로 Load 가능한 사전 모델을 만들어둡니다.',
    to: '/employee/pre-work',
    icon: Upload,
    accent: 'yellow',
  },
  {
    key: 'write-report',
    title: '보고서 작성 · 조회',
    desc: '완료된 점검 세션의 리포트를 작성·발행하거나 이력을 확인합니다.',
    to: '/employee/reports',
    icon: FileText,
    accent: 'green',
  },
  {
    key: 'manage-sites',
    title: '현장 관리',
    desc: '진행 중/예정 현장을 등록·수정하고 담당자를 배정합니다.',
    to: '/employee/sites',
    icon: MapPin,
    accent: 'indigo',
  },
  {
    key: 'analytics',
    title: '분석 · 보고서',
    desc: '하자 경향보고서 및 주간업무보고서를 자동 생성합니다.',
    to: '/employee/analytics',
    icon: TrendingUp,
    accent: 'violet',
  },
  {
    key: 'chat',
    title: '메신저',
    desc: '팀원과 1:1 대화, 그룹 채팅, 팀 채널로 실시간 소통합니다.',
    to: '/employee/chat',
    icon: MessageSquare,
    accent: 'cyan',
  },
]

const ACTION_ACCENT = {
  blue:   { border: 'border-t-4 border-blue-600',   panel: 'bg-blue-50',   iconBg: 'bg-blue-600',   text: 'text-blue-700',   hoverBg: 'group-hover:bg-blue-100' },
  yellow: { border: 'border-t-4 border-yellow-500', panel: 'bg-yellow-50', iconBg: 'bg-yellow-500', text: 'text-yellow-700', hoverBg: 'group-hover:bg-yellow-100' },
  green:  { border: 'border-t-4 border-green-600',  panel: 'bg-green-50',  iconBg: 'bg-green-600',  text: 'text-green-700',  hoverBg: 'group-hover:bg-green-100' },
  indigo: { border: 'border-t-4 border-indigo-600', panel: 'bg-indigo-50', iconBg: 'bg-indigo-600', text: 'text-indigo-700', hoverBg: 'group-hover:bg-indigo-100' },
  violet: { border: 'border-t-4 border-violet-600', panel: 'bg-violet-50', iconBg: 'bg-violet-600', text: 'text-violet-700', hoverBg: 'group-hover:bg-violet-100' },
  cyan:   { border: 'border-t-4 border-cyan-600',   panel: 'bg-cyan-50',   iconBg: 'bg-cyan-600',   text: 'text-cyan-700',   hoverBg: 'group-hover:bg-cyan-100' },
  amber:  { border: 'border-t-4 border-amber-600',  panel: 'bg-amber-50',  iconBg: 'bg-amber-600',  text: 'text-amber-700',  hoverBg: 'group-hover:bg-amber-100' },
  red:    { border: 'border-t-4 border-red-500',   panel: 'bg-red-50',    iconBg: 'bg-red-500',   text: 'text-red-700',    hoverBg: 'group-hover:bg-red-100' },
}

function QuickActionsSection() {
  const user = useAuthStore((s) => s.user)
  const currentOrg = useAuthStore((s) => s.currentOrg)
  const isAdmin = user?.is_superadmin || (currentOrg && ['owner', 'admin'].includes(currentOrg.role))
  const navigate = useNavigate()
  const enterTestMode = useSessionStore((s) => s.enterTestMode)

  const adminCard = {
    key: 'admin-members',
    title: '멤버 관리',
    desc: '조직 멤버를 관리하고 미소속 사용자를 배정합니다.',
    to: '/employee/admin/members',
    icon: Shield,
    accent: 'amber',
  }

  const gpuCard = {
    key: 'admin-gpu',
    title: 'GPU 추론 서버 제어',
    desc: 'GCP L4 GPU VM 을 점검 시작 전 켜고, 종료 후 정지해 비용을 절감합니다.',
    to: '/employee/admin/gpu',
    icon: Cpu,
    accent: 'cyan',
  }

  // 영상 수신기 미도착으로 1차 배포에서는 testMode 기반 검출을 "현장 점검" 으로 위장 운영.
  // 수신기 도착 후 FIELD_INSPECTION_ENABLED = true 토글과 함께 아래 라벨/색상/아이콘 원복.
  const testModeCard = {
    key: 'test-mode',
    title: '현장 점검',
    desc: '드론으로 촬영한 영상을 AI 가 분석하여 하자를 검출합니다.',
    icon: Camera,
    accent: 'blue',
    isTestMode: true,
  }

  const actions = [
    ...QUICK_ACTIONS.filter((a) => FIELD_INSPECTION_ENABLED || a.key !== 'start-inspection'),
    testModeCard,
    gpuCard,
    ...(isAdmin ? [adminCard] : []),
  ]

  const handleTestModeClick = () => {
    enterTestMode()
    navigate('/dashboard')
  }

  return (
    <section>
      <SectionHeader
        eyebrow="QUICK ACTIONS"
        title={currentOrg ? `${currentOrg.name} — 자주 사용하는 작업` : '자주 사용하는 작업'}
        desc="클릭 한 번으로 사무실 업무와 현장 점검을 시작하세요."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
        {actions.map((action) => {
          const style = ACTION_ACCENT[action.accent] || ACTION_ACCENT.yellow
          const Icon = action.icon
          const body = (
            <div className="p-6 flex-1 flex flex-col">
              <h3 className="text-lg font-bold text-slate-800 break-keep">{action.title}</h3>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed break-keep flex-1">
                {action.desc}
              </p>
              <span className={`mt-4 inline-flex items-center gap-1 text-sm font-semibold ${style.text}`}>
                바로가기 <ArrowRight size={14} />
              </span>
            </div>
          )

          // TEST MODE 카드: Link 대신 onClick 핸들러 사용
          if (action.isTestMode) {
            return (
              <button
                key={action.key}
                type="button"
                onClick={handleTestModeClick}
                className={`group relative flex flex-col bg-white rounded-xl shadow-md hover:shadow-xl hover:-translate-y-1 transition duration-300 h-full text-left ${style.border}`}
              >
                <div className={`h-24 flex items-center justify-center ${style.panel} ${style.hoverBg} transition`}>
                  <div className={`w-12 h-12 rounded-xl ${style.iconBg} text-white flex items-center justify-center shadow-lg`}>
                    <Icon size={22} />
                  </div>
                </div>
                {body}
                {FIELD_INSPECTION_ENABLED && (
                  <span className="absolute top-3 right-3 text-[10px] font-bold tracking-wider bg-red-500 text-white px-2 py-0.5 rounded">
                    TEST
                  </span>
                )}
              </button>
            )
          }

          const CardRoot = action.disabled ? 'div' : Link
          const rootProps = action.disabled
            ? {
                title: '준비 중 — DB/관리자 권한 기능 연결 후 활성화 예정',
                'aria-disabled': 'true',
                className: `group relative flex flex-col bg-white rounded-xl shadow-md opacity-60 cursor-not-allowed h-full ${style.border}`,
              }
            : {
                to: action.to,
                className: `group relative flex flex-col bg-white rounded-xl shadow-md hover:shadow-xl hover:-translate-y-1 transition duration-300 h-full ${style.border}`,
              }
          return (
            <CardRoot key={action.key} {...rootProps}>
              {/* 상단 아이콘 패널 */}
              <div className={`h-24 flex items-center justify-center ${style.panel} ${style.hoverBg} transition`}>
                <div className={`w-12 h-12 rounded-xl ${style.iconBg} text-white flex items-center justify-center shadow-lg`}>
                  <Icon size={22} />
                </div>
              </div>
              {body}
              {action.primary && (
                <span className="absolute top-3 right-3 text-[10px] font-bold tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded">
                  RECOMMENDED
                </span>
              )}
              {action.disabled && (
                <span className="absolute top-3 right-3 text-[10px] font-bold tracking-wider bg-gray-400 text-white px-2 py-0.5 rounded">
                  SOON
                </span>
              )}
            </CardRoot>
          )
        })}
      </div>
    </section>
  )
}

/* ──────────────────────────────────────────────────────────────
   4. KPI 요약 — 실/목업 혼용 (DB 연결 시 점진 교체)
   ────────────────────────────────────────────────────────────── */

function KPISection({ monthlyKpi, currentDefectCount, currentHighSeverity, currentFlightMinutes }) {
  const cards = [
    {
      key: 'inspections',
      icon: CheckCircle,
      label: '이번 달 점검 완료',
      value: monthlyKpi.inspectionsCompleted,
      unit: '건',
      sub: `발행 보고서 ${monthlyKpi.reportsPublished}건`,
      accent: 'green',
      source: 'mock',
    },
    {
      key: 'defects',
      icon: Activity,
      label: '현재 세션 하자 검출',
      value: currentDefectCount,
      unit: '건',
      sub: '실시간 WebSocket 수신분',
      accent: 'blue',
      source: 'live',
    },
    {
      key: 'critical',
      icon: AlertTriangle,
      label: '심각(HIGH) 하자',
      value: currentHighSeverity,
      unit: '건',
      sub: '즉시 조치 대상',
      accent: 'red',
      source: 'live',
    },
    {
      key: 'flight',
      icon: Clock,
      label: currentFlightMinutes == null ? '이번 달 평균 비행 시간' : '현재 세션 비행 시간',
      value: currentFlightMinutes ?? monthlyKpi.averageFlightMinutes,
      unit: '분',
      sub: currentFlightMinutes == null ? `이번 달 평균` : `미션 시작 이후 누적`,
      accent: 'yellow',
      source: currentFlightMinutes == null ? 'mock' : 'live',
    },
  ]

  return (
    <section>
      <SectionHeader
        eyebrow="KPI SUMMARY"
        title="핵심 성과 지표 (KPI)"
        desc="현재 세션 실데이터와 이번 달 누적 지표를 함께 보여줍니다. (LIVE · 목업 혼용)"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-6">
        {cards.map((card) => (
          <KPICard key={card.key} {...card} />
        ))}
      </div>
    </section>
  )
}

const KPI_ACCENT = {
  blue:   { iconBg: 'bg-blue-100',   iconText: 'text-blue-700',   ring: 'ring-blue-100' },
  green:  { iconBg: 'bg-green-100',  iconText: 'text-green-700',  ring: 'ring-green-100' },
  red:    { iconBg: 'bg-red-100',    iconText: 'text-red-700',    ring: 'ring-red-100' },
  yellow: { iconBg: 'bg-yellow-100', iconText: 'text-yellow-700', ring: 'ring-yellow-100' },
}

function KPICard({ icon: Icon, label, value, unit, sub, accent, source }) {
  const style = KPI_ACCENT[accent]
  const sourceBadge =
    source === 'live' ? (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> LIVE
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
        MOCK
      </span>
    )
  return (
    <div className={`bg-white rounded-xl shadow-md p-5 ring-1 ${style.ring} hover:shadow-lg transition`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg ${style.iconBg} ${style.iconText} flex items-center justify-center`}>
          <Icon size={18} />
        </div>
        {sourceBadge}
      </div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-extrabold text-slate-800 mt-1">
        {value}
        <span className="text-base font-bold text-gray-400 ml-1">{unit}</span>
      </p>
      <p className="text-xs text-gray-500 mt-2">{sub}</p>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   5. 오늘 일정 — 2열 중 좌측
   ────────────────────────────────────────────────────────────── */

function TodayScheduleSection({ schedules }) {
  return (
    <section className="bg-white rounded-xl shadow-md overflow-hidden border-t-4 border-blue-600">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="text-blue-600" size={18} />
          <h3 className="font-bold text-slate-800">오늘의 일정</h3>
        </div>
        <span className="text-xs font-semibold text-gray-500">총 {schedules.length}건</span>
      </div>
      <ul className="divide-y divide-gray-100">
        {schedules.map((s) => (
          <li key={s.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition">
            <div className="flex flex-col items-center w-14 shrink-0 font-pretendard">
              <span className="text-lg font-extrabold text-blue-700 tabular-nums tracking-tight">{s.time}</span>
              <span className="text-[10px] text-gray-400 uppercase tracking-wide">KST</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate break-keep">{s.site}</p>
              <p className="text-xs text-gray-500 mt-0.5">담당 {s.operator}</p>
            </div>
            <Link
              to="/session/setup"
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900 transition shrink-0"
              title="이 일정으로 현장 점검 시작"
            >
              점검 시작 <ArrowRight size={12} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ──────────────────────────────────────────────────────────────
   6. 알림/공지 — 2열 중 우측 (notificationStore 연동)
   ────────────────────────────────────────────────────────────── */

/** 채팅 알림의 종류 라벨 — 첨부 유무/이미지 확장자로 구분 */
const CHAT_IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp|avif|svg)$/i
function getChatKindLabel(n) {
  if (n.file_name) {
    return CHAT_IMAGE_EXT.test(n.file_name) ? '사진 발송' : '파일 발송'
  }
  return '메시지 발송'
}

function NotificationsSection() {
  const notifications = useNotificationStore((s) => s.notifications)
  const chatNotifications = useNotificationStore((s) => s.chatNotifications)

  // 채팅 알림 + 백엔드 알림 머지 (created_at 내림차순, 최대 6건)
  const merged = useMemo(() => {
    const chatItems = chatNotifications.map((n) => ({
      id: n.id,
      category: 'chat',
      title: `${n.sender_name || '알 수 없음'}님께서 메시지를 보냈습니다.`,
      created_at: typeof n.created_at === 'string' ? new Date(n.created_at).getTime() : n.created_at,
      is_read: n.is_read,
      _isChat: true,
      _kindLabel: getChatKindLabel(n),
    }))
    return [...chatItems, ...notifications]
      .sort((a, b) => (b.created_at || 0) - (a.created_at || 0))
      .slice(0, 6)
  }, [notifications, chatNotifications])

  return (
    <section className="bg-white rounded-xl shadow-md overflow-hidden border-t-4 border-yellow-500">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="text-yellow-500" size={18} />
          <h3 className="font-bold text-slate-800">알림 · 공지</h3>
        </div>
        <span className="text-xs font-semibold text-gray-500">최근 {merged.length}건</span>
      </div>
      {merged.length > 0 ? (
        <ul className="divide-y divide-gray-100">
          {merged.map((n) => {
            const cat = NOTIFICATION_CATEGORIES[n.category] || NOTIFICATION_CATEGORIES.system
            const Icon = cat.icon
            // 채팅: 사용자 지정 라벨, 그 외: 카테고리 라벨로 폴백 (시간 텍스트 자리 대체)
            const kindLabel = n._isChat ? n._kindLabel : cat.label
            return (
              <li key={n.id} className={`px-6 py-4 flex items-start gap-4 border-l-4 ${cat.border} hover:bg-gray-50 transition`}>
                <div className={`w-9 h-9 rounded-lg ${cat.lightBg} ${cat.lightText} flex items-center justify-center shrink-0`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cat.lightBg} ${cat.lightText}`}>
                      {cat.label}
                    </span>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    )}
                  </div>
                  <p className={`text-sm break-keep ${n.is_read ? 'text-slate-500' : 'font-semibold text-slate-800'}`}>{n.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{kindLabel}</p>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="py-12 text-center text-sm text-gray-400">
          새로운 알림이 없습니다
        </div>
      )}
    </section>
  )
}

/* ──────────────────────────────────────────────────────────────
   7. 팀원 현황 & 담당 현장 할당
   ────────────────────────────────────────────────────────────── */

const MEMBER_STATUS = {
  office:  { label: '사무실', dot: 'bg-blue-500',   text: 'text-blue-700',   bg: 'bg-blue-50' },
  field:   { label: '현장 중', dot: 'bg-green-500',  text: 'text-green-700',  bg: 'bg-green-50' },
  standby: { label: '대기',   dot: 'bg-gray-400',   text: 'text-gray-600',   bg: 'bg-gray-100' },
}

function TeamAssignmentsSection({ members }) {
  return (
    <section>
      <SectionHeader
        eyebrow="TEAM"
        title="팀원 현황 및 담당 현장 할당"
        desc="팀원별 실시간 상태와 현재 담당 중인 현장을 확인하세요."
        rightSlot={
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
            <Users size={14} /> 총 {members.length}명
          </span>
        }
      />
      <div className="bg-white rounded-xl shadow-md overflow-hidden mt-6">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold tracking-wider">
              <tr>
                <th className="text-left px-6 py-3">팀원</th>
                <th className="text-left px-6 py-3 hidden md:table-cell">팀</th>
                <th className="text-left px-6 py-3">담당 현장</th>
                <th className="text-left px-6 py-3">상태</th>
                <th className="text-right px-6 py-3">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map((m) => {
                const status = MEMBER_STATUS[m.status] || MEMBER_STATUS.standby
                return (
                  <tr key={m.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold shrink-0">
                          {m.initials}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 truncate">{m.name} {m.role}</p>
                          <p className="text-xs text-gray-500 md:hidden">{m.team}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell text-gray-600">{m.team}</td>
                    <td className="px-6 py-4 text-gray-700 break-keep">{m.assignedSite}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${status.bg} ${status.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900 transition"
                        title="담당 현장 재배정 (준비 중)"
                      >
                        <UserCheck size={14} /> 재배정
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

/* ──────────────────────────────────────────────────────────────
   8. 최근 활동 타임라인
   ────────────────────────────────────────────────────────────── */

const ACTIVITY_STYLE = {
  report:     { icon: FileText,     iconBg: 'bg-green-100',  iconText: 'text-green-700' },
  inspection: { icon: CheckCircle,  iconBg: 'bg-blue-100',   iconText: 'text-blue-700' },
  upload:     { icon: Upload,       iconBg: 'bg-yellow-100', iconText: 'text-yellow-700' },
  schedule:   { icon: Calendar,     iconBg: 'bg-indigo-100', iconText: 'text-indigo-700' },
}

function RecentActivitySection({ activities }) {
  return (
    <section>
      <SectionHeader
        eyebrow="ACTIVITY"
        title="최근 활동"
        desc="팀 전체의 최근 작업 이력입니다."
      />
      <div className="bg-white rounded-xl shadow-md p-6 mt-6">
        <ol className="relative space-y-5 before:absolute before:top-0 before:bottom-0 before:left-4 before:w-px before:bg-gray-200">
          {activities.map((a) => {
            const style = ACTIVITY_STYLE[a.kind] || ACTIVITY_STYLE.inspection
            const Icon = style.icon
            return (
              <li key={a.id} className="relative pl-12">
                <div className={`absolute left-0 top-0 w-8 h-8 rounded-full ${style.iconBg} ${style.iconText} flex items-center justify-center ring-4 ring-white`}>
                  <Icon size={14} />
                </div>
                <p className="text-sm font-semibold text-slate-800 break-keep">{a.label}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {a.date} · {a.actor}
                </p>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

/* ──────────────────────────────────────────────────────────────
   공용 섹션 헤더
   ────────────────────────────────────────────────────────────── */

function SectionHeader({ eyebrow, title, desc, rightSlot }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
      <div>
        <p className="text-xs font-bold text-blue-600 uppercase tracking-[0.15em]">{eyebrow}</p>
        <h2 className="text-xl md:text-2xl font-bold text-slate-800 mt-1 break-keep">{title}</h2>
        {desc && <p className="text-sm text-gray-500 mt-1 break-keep">{desc}</p>}
      </div>
      {rightSlot && <div>{rightSlot}</div>}
    </div>
  )
}
