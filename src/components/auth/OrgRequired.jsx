/**
 * OrgRequired.jsx
 * 역할: 조직 소속 필수 라우트 가드
 *       - 미소속 사용자 → /employee/onboarding 리다이렉트
 *       - 슈퍼어드민 → 조직 소속 없이도 모든 페이지 접근 허용
 *       - adminOnly 옵션: owner/admin 역할 또는 슈퍼어드민만 접근 허용
 */

import { Navigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'

export default function OrgRequired({ children, adminOnly = false }) {
  const { isAuthenticated, user, currentOrg } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const isSuperadmin = user?.is_superadmin === true

  // 슈퍼어드민은 조직 소속 없이도 모든 페이지 접근 가능
  if (!currentOrg && !isSuperadmin) {
    return <Navigate to="/employee/onboarding" replace />
  }

  // adminOnly: 슈퍼어드민이거나 조직 owner/admin만 허용
  if (adminOnly && !isSuperadmin && !['owner', 'admin'].includes(currentOrg?.role)) {
    return <Navigate to="/employee" replace />
  }

  return children
}
