/**
 * components/session/ProtectedSessionLayout.jsx
 * 역할: 대시보드 진입 가드 — sessionStore.modelStatus === 'ready' 일 때만 통과
 *       - 아닐 경우 `/session/setup` 으로 replace redirect (히스토리 오염 방지)
 *       - 최상위에서 <Navigate /> 조건부 반환 → Dashboard 가 잠깐 렌더되며 WebSocket 연결되는 현상 방지
 *       - 통과 시 `<Outlet />` 으로 자식 라우트(대시보드 + nested report 모달) 렌더
 */

import { Navigate, Outlet } from 'react-router-dom'
import useSessionStore from '../../store/sessionStore.js'

export default function ProtectedSessionLayout() {
  const modelStatus = useSessionStore((s) => s.modelStatus)

  if (modelStatus !== 'ready') {
    return <Navigate to="/session/setup" replace />
  }

  return <Outlet />
}
