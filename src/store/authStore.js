/**
 * authStore.js
 * 역할: 인증 상태 관리 (Zustand)
 *       - JWT 토큰 저장/삭제 — **localStorage** 가 primary, **sessionStorage** 는 미러(write-through)
 *         · 탭/창을 닫고 다시 열어도 로그인 유지 — 단, "영구"가 아니라 refresh 토큰 수명(기본 24h)
 *           안에 재접속했을 때만. 회전(rotation)으로 사용할 때마다 24h 갱신 → 유휴 윈도우.
 *           넘기면 자동 로그아웃 (사용자 UX 요청 R-v1.1.04, 영구→유휴 윈도우로 정정)
 *         · 기존 api/* 인터셉터들은 sessionStorage.getItem 그대로 호출 → 미러 덕에 호환
 *         · 보안 안전 장치: 진입 시 refresh 토큰 exp 검증 → 만료면 즉시 폐기(로그인 상태로 안 보임),
 *           access expire(120분), 명시 logout 시 둘 다 정리
 *       - 현재 로그인 사용자 정보 보관
 *       - 로그인/로그아웃 액션
 */

import { create } from 'zustand'
import { logoutApi } from '../api/authApi'

const AUTH_KEYS = ['access_token', 'refresh_token', 'user', 'current_org']

/**
 * JWT payload 의 exp(초) → ms epoch. 디코드 실패/exp 없으면 null.
 * 서명 검증은 안 함(서버 몫) — 만료 여부만 클라이언트에서 빠르게 판단하기 위함.
 */
function getTokenExpiryMs(token) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(b64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    )
    const exp = JSON.parse(json).exp
    return typeof exp === 'number' ? exp * 1000 : null
  } catch {
    return null
  }
}

/** 토큰이 존재하고 exp 가 아직 미래면 true (= 살아있음). */
function isTokenLive(token) {
  const expMs = getTokenExpiryMs(token)
  return expMs !== null && expMs > Date.now()
}

/**
 * 만료 세션 정리: refresh 토큰이 없거나 만료됐으면 모든 인증 키 제거.
 * → 죽은 토큰이 session 으로 hydrate 되거나 랜딩이 "로그인됨"으로 보이는 것 차단.
 * refresh 가 살아있으면 access 가 만료됐어도 인터셉터가 자동 재발급하므로 세션 유지로 본다.
 */
function purgeExpiredSession() {
  if (typeof window === 'undefined') return
  const refresh =
    localStorage.getItem('refresh_token') ?? sessionStorage.getItem('refresh_token')
  if (!isTokenLive(refresh)) {
    for (const key of AUTH_KEYS) {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
    }
  }
}

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

// 진입 시: ① 만료 세션 먼저 폐기 → ② 살아있는 토큰만 session 으로 미러.
// 순서 중요 — 폐기를 먼저 해야 죽은 토큰이 session 으로 복사되지 않음.
purgeExpiredSession()
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
// 세션 유효 판정: refresh 토큰이 살아있으면 로그인 상태(access 만료 시 인터셉터가 재발급).
// purgeExpiredSession() 이후라 만료 세션이면 이미 비어있음 → false.
const sessionLive = isTokenLive(getAuthValue('refresh_token'))

/* ── Role Selector Helpers ─────────────────────────────────
 *
 * 컴포넌트에서 role 분기를 깔끔하게 — useAuthStore(selectIsAdmin) 식으로 사용.
 * `superadmin` 은 시스템 전체 관리자(전 조직 접근 가능), `owner/admin` 은
 * 현재 조직(currentOrg) 내 관리자. `member` 는 일반 직원.
 *
 * 사용 예:
 *   const isAdmin = useAuthStore(selectIsAdmin)
 *   if (isAdmin) <DeleteButton />
 *
 *   // 함수형 (props 로 전달용 등):
 *   const role = useAuthStore(selectUserRole) // 'superadmin' | 'owner' | 'admin' | 'member' | null
 * ─────────────────────────────────────────────────────────── */

/** 현재 사용자가 슈퍼어드민인지 (전 조직 접근) */
export const selectIsSuperadmin = (state) => !!state.user?.is_superadmin

/** 현재 사용자가 조직 owner 인지 */
export const selectIsOwner = (state) => state.currentOrg?.role === 'owner'

/** 현재 사용자가 admin 또는 owner 인지 (조직 관리자) */
export const selectIsAdmin = (state) =>
  !!state.user?.is_superadmin || ['owner', 'admin'].includes(state.currentOrg?.role)

/** 현재 사용자가 member(일반 직원) 인지 */
export const selectIsMember = (state) =>
  !state.user?.is_superadmin && state.currentOrg?.role === 'member'

/**
 * 현재 사용자의 단일 role 라벨 반환.
 * superadmin > owner > admin > member > null (조직 미소속 비-superadmin)
 */
export const selectUserRole = (state) => {
  if (state.user?.is_superadmin) return 'superadmin'
  return state.currentOrg?.role || null
}

const useAuthStore = create((set, get) => ({
  // ── 상태 ──────────────────────────────────
  token: storedToken || null,
  user: storedUser,
  isAuthenticated: sessionLive,

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
  // 서버 토큰 폐기(denylist) 요청을 백그라운드로 보낸 뒤 로컬 정리.
  // 토큰을 비우기 전에 캡처해 전달하고, 네트워크 실패와 무관하게 로컬 세션은 즉시 정리한다.
  logout: () => {
    const refresh = getAuthValue('refresh_token')
    const access = getAuthValue('access_token')
    if (refresh) {
      // fire-and-forget — 서버 폐기 실패해도 로컬 로그아웃은 보장
      logoutApi(refresh, access).catch(() => {})
    }
    AUTH_KEYS.forEach(removeBoth)
    set({ token: null, user: null, isAuthenticated: false, organizations: [], currentOrg: null })
  },
}))

export default useAuthStore
