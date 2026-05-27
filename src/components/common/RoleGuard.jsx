/**
 * components/common/RoleGuard.jsx
 * 역할: 권한 기반 UI 분기 가드 — props.allowed 에 포함된 role 일 때만 children 렌더
 *
 *   - 라우트 가드는 `OrgRequired adminOnly` 가 처리(페이지 단위).
 *     RoleGuard 는 페이지 내부의 **개별 버튼/섹션** 가드용.
 *
 *   - allowed: ['owner','admin','superadmin','member'] 중 1개 이상
 *   - fallback: 권한 없을 때 대체 렌더(없으면 null) — 예) `<span>읽기 전용</span>`
 *
 *   사용 예:
 *     <RoleGuard allowed={['owner','admin']}>
 *       <DeleteButton onClick={...} />
 *     </RoleGuard>
 *
 *     <RoleGuard allowed={['superadmin']} fallback={<small>슈퍼어드민 전용</small>}>
 *       <DangerSection />
 *     </RoleGuard>
 */

import useAuthStore, { selectUserRole } from '../../store/authStore.js'

export default function RoleGuard({ allowed, fallback = null, children }) {
  const role = useAuthStore(selectUserRole)

  // superadmin 은 owner/admin 권한 카드도 통과(상위 권한이라 별도 명시 없어도 허용).
  const allowedSet = new Set(allowed)
  const isSuperadmin = role === 'superadmin'

  // 명시적으로 superadmin 만 허용한 경우는 그대로,
  // 그 외 owner/admin/member 가 allowed 에 있으면 superadmin 도 통과시킴.
  const passes = allowedSet.has(role)
    || (isSuperadmin && (allowedSet.has('owner') || allowedSet.has('admin')))

  if (!passes) return fallback
  return children
}
