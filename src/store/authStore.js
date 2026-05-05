/**
 * authStore.js
 * 역할: 인증 상태 관리 (Zustand)
 *       - JWT 토큰 저장/삭제 (sessionStorage 연동 — 브라우저 종료 시 자동 만료)
 *       - 현재 로그인 사용자 정보 보관
 *       - 로그인/로그아웃 액션
 */

import { create } from 'zustand'

// 기존 사용자 환경의 localStorage 잔존 토큰 정리 (1회성 마이그레이션)
;['access_token', 'refresh_token', 'user', 'current_org'].forEach((k) => {
  if (localStorage.getItem(k) !== null) localStorage.removeItem(k)
})

const storedUser = JSON.parse(sessionStorage.getItem('user') || 'null')

const useAuthStore = create((set, get) => ({
  // ── 상태 ──────────────────────────────────
  token: sessionStorage.getItem('access_token') || null,
  user: storedUser,
  isAuthenticated: !!sessionStorage.getItem('access_token'),

  // 조직 관련 (user.organizations 에서 파생)
  organizations: storedUser?.organizations || [],
  currentOrg: JSON.parse(sessionStorage.getItem('current_org') || 'null'),

  // ── 로그인 성공 시 호출 ───────────────────
  // provider: 'local' | 'google' | 'naver' | 'kakao' (생략 시 기존 값 유지)
  setAuth: (token, user, refreshToken, provider) => {
    sessionStorage.setItem('access_token', token)
    if (refreshToken) sessionStorage.setItem('refresh_token', refreshToken)
    sessionStorage.setItem('user', JSON.stringify(user))
    // 최근 로그인 방법 기억 (브라우저 종료/로그아웃 후에도 유지 → 다음 로그인 시 가이드)
    if (provider) localStorage.setItem('last_login_method', provider)
    const orgs = user?.organizations || []
    // 현재 조직이 없으면 첫 번째 조직을 기본값으로
    const prevOrg = get().currentOrg
    const currentOrg = prevOrg && orgs.find((o) => o.id === prevOrg.id)
      ? prevOrg
      : orgs[0] || null
    sessionStorage.setItem('current_org', JSON.stringify(currentOrg))
    set({ token, user, isAuthenticated: true, organizations: orgs, currentOrg })
  },

  // ── 조직 전환 ─────────────────────────────
  switchOrg: (org) => {
    sessionStorage.setItem('current_org', JSON.stringify(org))
    set({ currentOrg: org })
  },

  // ── 로그아웃 ──────────────────────────────
  logout: () => {
    sessionStorage.removeItem('access_token')
    sessionStorage.removeItem('refresh_token')
    sessionStorage.removeItem('user')
    sessionStorage.removeItem('current_org')
    set({ token: null, user: null, isAuthenticated: false, organizations: [], currentOrg: null })
  },
}))

export default useAuthStore
