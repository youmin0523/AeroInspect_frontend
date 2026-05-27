/**
 * App.jsx
 * 역할: 루트 라우팅 컴포넌트
 *       - `/`         → Landing
 *       - `/login`, `/signup`, `/find-account` → 공개 계정 페이지
 *       - `/session/*` → SessionLayout (setup / level / modeling) — 직원 진입 전 워크플로우
 *       - `/dashboard` → ProtectedSessionLayout 가드 + DashboardLayout (+ nested `/report`)
 *       - WebSocket 연결은 DashboardLayout 내부에서만 초기화하여 랜딩/세션 페이지에서는 비용 발생 없음
 */

import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Outlet, useLocation } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import FindAccount from './pages/FindAccount.jsx'
// //* [Modified Code] 직원 전용 진입 랜딩 (Interior Inspection Dashboard 목업)
import EmployeeLanding from './pages/EmployeeLanding.jsx'
import PreWork from './pages/employee/PreWork.jsx'
import ReportsList from './pages/employee/ReportsList.jsx'
import ReportDetail from './pages/employee/ReportDetail.jsx'
import SiteManagement from './pages/employee/SiteManagement.jsx'
import SiteDetail from './pages/employee/SiteDetail.jsx'
import Analytics from './pages/employee/Analytics.jsx'
import Chat from './pages/employee/Chat.jsx'
import AdminMembers from './pages/employee/AdminMembers.jsx'
import AdminGpu from './pages/employee/AdminGpu.jsx'
import Onboarding from './pages/employee/Onboarding.jsx'
import OrgRequired from './components/auth/OrgRequired.jsx'
import FloatingChatButton from './components/chat/FloatingChatButton.jsx'
import ChatRealtimeListener from './components/chat/ChatRealtimeListener.jsx'
import GlobalFloatingChatbot from './components/chatbot/GlobalFloatingChatbot.jsx'
import PerfTimerWidget from './components/dev/PerfTimerWidget.jsx'
import useChatStore from './store/chatStore.js'

/** employee 경로에서만 Floating Chat Button 표시 */
function GlobalFloatingChat() {
  const { pathname } = useLocation()
  if (!pathname.startsWith('/employee')) return null
  return <FloatingChatButton />
}

/**
 * 브라우저 탭 제목에 미읽음 채팅 카운트 표시 (Slack/Gmail 스타일)
 *   - 미읽음 0: "AeroInspect"
 *   - 미읽음 N: "(N) AeroInspect"
 */
function DocumentTitleBadge() {
  const chatUnread = useChatStore((s) => s.unreadTotal)
  useEffect(() => {
    const base = 'AeroInspect'
    document.title = chatUnread > 0
      ? `(${chatUnread > 99 ? '99+' : chatUnread}) ${base}`
      : base
  }, [chatUnread])
  return null
}
import SessionLayout from './components/session/SessionLayout.jsx'
import ProtectedSessionLayout from './components/session/ProtectedSessionLayout.jsx'
import SessionSetup from './pages/session/SessionSetup.jsx'
import SessionLevel from './pages/session/SessionLevel.jsx'
import SessionModeling from './pages/session/SessionModeling.jsx'
import SampleReport from './pages/SampleReport.jsx'
import OAuthCallback from './pages/OAuthCallback.jsx'
import ReportModal from './components/report/ReportModal.jsx'
import useWebSocket from './hooks/useWebSocket.js'
import useSessionStore from './store/sessionStore.js'

// //! [Original Code] 기존 AppLayout: 단일 라우트 `/` = Dashboard + WebSocket 최상단 초기화
// function AppLayout() {
//   useWebSocket()
//   return (
//     <div className="flex h-screen overflow-hidden bg-dashboard-bg">
//       <Sidebar />
//       <div className="flex flex-col flex-1 overflow-hidden">
//         <Header />
//         <main className="flex-1 overflow-auto p-4">
//           <Routes>
//             <Route path="/" element={<Dashboard />} />
//           </Routes>
//         </main>
//       </div>
//     </div>
//   )
// }

// //* [Modified Code] 풀스크린 HUD 레이아웃 — 레퍼런스 "위성 관제실" 톤 적용 라운드.
// Header 제거(검색·WS 상태·알림·프로필은 Dashboard 내부 상단 HUD 바로 흡수), main 의 p-4 제거하여
// BuildingScene 이 뷰포트 전체를 캔버스로 쓰도록 변경. Sidebar(w-14)는 내비게이션 용도로 유지.
function DashboardLayout() {
  // 대시보드 진입 시에만 WebSocket 연결 초기화
  useWebSocket()

  // 테스트 모드: 대시보드 마운트 시 이미지 스캔 + 모델 로드 (재생은 시작하지 않음)
  const isTestMode = useSessionStore((s) => s.isTestMode)
  useEffect(() => {
    if (!isTestMode) return
    const apiBase = import.meta.env.VITE_API_BASE_URL || ''
    // 초기화만 실행 (스캔 + 모델 로드). 재생은 사용자가 START 클릭 시 시작
    fetch(`${apiBase}/api/v1/stream/test/init`, { method: 'POST' })
      .then((r) => r.json())
      .then((data) => console.log('[TestMode] Initialized:', data))
      .catch((err) => console.warn('[TestMode] Init failed:', err))

    return () => {
      fetch(`${apiBase}/api/v1/stream/test/stop`, { method: 'POST' }).catch(() => {})
    }
  }, [isTestMode])

  return (
    <div className="flex h-screen overflow-hidden bg-dashboard-bg">
      {/* 좌측 사이드바 (얇은 아이콘 내비) */}
      <Sidebar />

      {/* 우측 메인: 전체를 Dashboard 컨트롤 — HUD + 풀스크린 맵 */}
      <main className="flex-1 relative overflow-hidden">
        <Dashboard />
        {/* //* [Modified Code] nested route — /dashboard/report 진입 시 ReportModal 오버레이 렌더 */}
        <Outlet />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <DocumentTitleBadge />
      <ChatRealtimeListener />
      <GlobalFloatingChat />
      <GlobalFloatingChatbot />
      <PerfTimerWidget />
      <Routes>
        {/* 공개 라우트 */}
        <Route path="/" element={<Landing />} />
        <Route path="/sample-report" element={<SampleReport />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/find-account" element={<FindAccount />} />
        {/* OAuth 콜백 (Google / Kakao / Naver) */}
        <Route path="/auth/:provider/callback" element={<OAuthCallback />} />

        {/* 온보딩 — 미소속 사용자 진입점 */}
        <Route path="/employee/onboarding" element={<Onboarding />} />

        {/* 직원 전용 랜딩 — 조직 소속 필수 */}
        <Route path="/employee" element={<OrgRequired><EmployeeLanding /></OrgRequired>} />
        <Route path="/employee/pre-work" element={<OrgRequired><PreWork /></OrgRequired>} />
        <Route path="/employee/reports" element={<OrgRequired><ReportsList /></OrgRequired>} />
        <Route path="/employee/reports/:id" element={<OrgRequired><ReportDetail /></OrgRequired>} />
        <Route path="/employee/sites" element={<OrgRequired><SiteManagement /></OrgRequired>} />
        <Route path="/employee/sites/:id" element={<OrgRequired><SiteDetail /></OrgRequired>} />
        <Route path="/employee/analytics" element={<OrgRequired><Analytics /></OrgRequired>} />
        <Route path="/employee/chat" element={<OrgRequired><Chat /></OrgRequired>} />
        <Route path="/employee/admin/members" element={<OrgRequired adminOnly><AdminMembers /></OrgRequired>} />
        {/* GPU 제어는 비용 직결 — 일반 member 진입 차단(owner/admin/superadmin 만). */}
        <Route path="/employee/admin/gpu" element={<OrgRequired adminOnly><AdminGpu /></OrgRequired>} />

        {/* //* [Modified Code] 세션 워크플로우 (Setup → Level → Modeling) */}
        <Route path="/session" element={<SessionLayout />}>
          <Route path="setup"    element={<SessionSetup />} />
          <Route path="level"    element={<SessionLevel />} />
          <Route path="modeling" element={<SessionModeling />} />
        </Route>

        {/* //* [Modified Code] 대시보드 — 세션 완료 가드 + nested report 모달 */}
        <Route element={<ProtectedSessionLayout />}>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route path="report" element={<ReportModal />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
