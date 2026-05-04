/**
 * authStore.js
 * 역할: 인증 상태 관리 (Zustand)
 *       - JWT 토큰 저장/삭제 (localStorage 연동)
 *       - 현재 로그인 사용자 정보 보관
 *       - 로그인/로그아웃 액션
 */

import { create } from 'zustand'

const storedUser = JSON.parse(localStorage.getItem('user') || 'null')

const useAuthStore = create((set, get) => ({
  // ── 상태 ──────────────────────────────────
  token: localStorage.getItem('access_token') || null,
  user: storedUser,
  isAuthenticated: !!localStorage.getItem('access_token'),

  // 조직 관련 (user.organizations 에서 파생)
  organizations: storedUser?.organizations || [],
  currentOrg: JSON.parse(localStorage.getItem('current_org') || 'null'),

  // ── 로그인 성공 시 호출 ───────────────────
  setAuth: (token, user, refreshToken) => {
    localStorage.setItem('access_token', token)
    if (refreshToken) localStorage.setItem('refresh_token', refreshToken)
    localStorage.setItem('user', JSON.stringify(user))
    const orgs = user?.organizations || []
    // 현재 조직이 없으면 첫 번째 조직을 기본값으로
    const prevOrg = get().currentOrg
    const currentOrg = prevOrg && orgs.find((o) => o.id === prevOrg.id)
      ? prevOrg
      : orgs[0] || null
    localStorage.setItem('current_org', JSON.stringify(currentOrg))
    set({ token, user, isAuthenticated: true, organizations: orgs, currentOrg })
  },

  // ── 조직 전환 ─────────────────────────────
  switchOrg: (org) => {
    localStorage.setItem('current_org', JSON.stringify(org))
    set({ currentOrg: org })
  },

  // ── 로그아웃 ──────────────────────────────
  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    localStorage.removeItem('current_org')
    set({ token: null, user: null, isAuthenticated: false, organizations: [], currentOrg: null })
  },
}))

export default useAuthStore
