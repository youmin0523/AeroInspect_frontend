/**
 * authStore.js
 * 역할: 인증 상태 관리 (Zustand)
 *       - JWT 토큰 저장/삭제 — **localStorage** 가 primary, **sessionStorage** 는 미러(write-through)
 *         · 탭/창을 닫고 다시 열어도 로그인 유지 (사용자 UX 요청 R-v1.1.04)
 *         · 기존 api/* 인터셉터 17곳은 sessionStorage.getItem 그대로 호출 → 미러 덕에 호환
 *         · 보안 안전 장치: JWT 자체 expire(120분), 명시 logout 시 둘 다 정리
 *       - 현재 로그인 사용자 정보 보관
 *       - 로그인/로그아웃 액션
 */

import { create } from 'zustand'

const AUTH_KEYS = ['access_token', 'refresh_token', 'user', 'current_org']

/**
 * localStorage → sessionStorage 미러 (앱 진입 시 1회 호출).
 * localStorage 에 토큰이 있고 sessionStorage 가 비어있으면 복사 → 기존 인터셉터들이 인증 헤더 자동 부착.
 * App.jsx 마운트 시점에 import side-effect 로 자동 실행.
 */
function hydrateSessionFromLocal() {
  if (typeof window === 'undefined') return
  for (const key of AUTH_KEYS) {
    const fromLocal = localStorage.getItem(key)
    if (fromLocal !== null && sessionStorage.getItem(key) === null) {
      sessionStorage.setItem(key, fromLocal)
    }
  }
}

// 모듈 import 시점에 즉시 hydration 실행 → 새 탭/새로고침에서도 즉시 인증 유효.
hydrateSessionFromLocal()

/** localStorage + sessionStorage 둘 다 set (write-through) */
function setBoth(key, value) {
  localStorage.setItem(key, value)
  sessionStorage.setItem(key, value)
}

/** localStorage + sessionStorage 둘 다 remove */
function removeBoth(key) {
  localStorage.removeItem(key)
  sessionStorage.removeItem(key)
}

/** 인증 키 우선순위 read: localStorage → sessionStorage 폴백 */
function getAuthValue(key) {
  return localStorage.getItem(key) ?? sessionStorage.getItem(key)
}

const storedUserRaw = getAuthValue('user')
const storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : null
const storedToken = getAuthValue('access_token')
const storedOrgRaw = getAuthValue('current_org')

const useAuthStore = create((set, get) => ({
  // ── 상태 ──────────────────────────────────
  token: storedToken || null,
  user: storedUser,
  isAuthenticated: !!storedToken,

  // 조직 관련 (user.organizations 에서 파생)
  organizations: storedUser?.organizations || [],
  currentOrg: storedOrgRaw ? JSON.parse(storedOrgRaw) : null,

  // ── 로그인 성공 시 호출 ───────────────────
  // provider: 'local' | 'google' | 'naver' | 'kakao' (생략 시 기존 값 유지)
  setAuth: (token, user, refreshToken, provider) => {
    setBoth('access_token', token)
    if (refreshToken) setBoth('refresh_token', refreshToken)
    setBoth('user', JSON.stringify(user))
    // 최근 로그인 방법 기억 (다음 로그인 시 가이드용 — 토큰 클리어 후에도 유지)
    if (provider) localStorage.setItem('last_login_method', provider)
    const orgs = user?.organizations || []
    // 현재 조직이 없으면 첫 번째 조직을 기본값으로
    const prevOrg = get().currentOrg
    const currentOrg = prevOrg && orgs.find((o) => o.id === prevOrg.id)
      ? prevOrg
      : orgs[0] || null
    setBoth('current_org', JSON.stringify(currentOrg))
    set({ token, user, isAuthenticated: true, organizations: orgs, currentOrg })
  },

  // ── 조직 전환 ─────────────────────────────
  switchOrg: (org) => {
    setBoth('current_org', JSON.stringify(org))
    set({ currentOrg: org })
  },

  // ── 로그아웃 ──────────────────────────────
  logout: () => {
    AUTH_KEYS.forEach(removeBoth)
    set({ token: null, user: null, isAuthenticated: false, organizations: [], currentOrg: null })
  },
}))

export default useAuthStore
