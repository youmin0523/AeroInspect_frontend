/**
 * components/session/ProtectedSessionLayout.jsx
 * 역할: 대시보드 진입 가드 — sessionStore.modelStatus === 'ready' 일 때만 통과
 *       - 아닐 경우 `/session/setup` 으로 replace redirect (히스토리 오염 방지)
 *       - 최상위에서 <Navigate /> 조건부 반환 → Dashboard 가 잠깐 렌더되며 WebSocket 연결되는 현상 방지
 *       - 통과 시 `<Outlet />` 으로 자식 라우트(대시보드 + nested report 모달) 렌더
 */

import { Navigate, Outlet } from 'react-router-dom'
import useSessionStore from '../../store/sessionStore.js'
import useAuthStore from '../../store/authStore.js'

export default function ProtectedSessionLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const modelStatus = useSessionStore((s) => s.modelStatus)

  // 인증 우선 — 비로그인 사용자가 세션 스토어만 채운 채 대시보드 직접 진입하는 것 차단.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (modelStatus !== 'ready') {
    return <Navigate to="/session/setup" replace />
  }

  return <Outlet />
}
