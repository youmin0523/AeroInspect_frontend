/**
 * authApi.js
 * 역할: 인증 관련 백엔드 API 호출
 *       - 일반 로그인 (아이디+비밀번호)
 *       - OAuth 코드 교환 (Google / Kakao / Naver)
 *       - 현재 사용자 조회 (GET /auth/me)
 *       - Refresh Token 자동 재발급 (401 인터셉터)
 */

import axios from 'axios'

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
})

// 요청 시 JWT 토큰 + 현재 조직 ID 자동 첨부
API.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  const currentOrg = JSON.parse(sessionStorage.getItem('current_org') || 'null')
  if (currentOrg?.id) {
    config.headers['X-Organization-Id'] = currentOrg.id
  }
  return config
})

// 인증 키 전체 제거 — localStorage(주 저장소) + sessionStorage(미러) 둘 다.
// sessionStorage 만 지우면 다음 로드에서 localStorage→session hydrate 로 죽은 토큰이 되살아남.
function clearAuthStorage() {
  for (const key of ['access_token', 'refresh_token', 'user', 'current_org']) {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  }
}

// ── 401 응답 시 refresh_token 으로 자동 재발급 ──
let isRefreshing = false
let failedQueue = []

function processQueue(error, token = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token)
  })
  failedQueue = []
}

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // refresh 엔드포인트 자체가 401이면 로그아웃
    if (originalRequest.url?.includes('/auth/refresh')) {
      clearAuthStorage()
      window.location.href = '/login'
      return Promise.reject(error)
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = sessionStorage.getItem('refresh_token')
      if (!refreshToken) {
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return API(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const { data } = await API.post('/api/v1/auth/refresh', {
          refresh_token: refreshToken,
        })
        const newToken = data.access_token
        // localStorage(주 저장소) + sessionStorage(미러) 둘 다 갱신해야 한다.
        // session 만 갱신하면 새로고침 시 authStore 가 localStorage 의 '구' 토큰을 hydrate →
        // 회전(rotation) 무력화 + 서버가 폐기한 구 refresh 로 재요청 시 강제 로그아웃.
        localStorage.setItem('access_token', newToken)
        sessionStorage.setItem('access_token', newToken)
        // R-v1.1.17: refresh token rotation — 서버가 새 refresh_token도 발급
        if (data.refresh_token) {
          localStorage.setItem('refresh_token', data.refresh_token)
          sessionStorage.setItem('refresh_token', data.refresh_token)
        }
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        processQueue(null, newToken)
        return API(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        clearAuthStorage()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

// 토큰 자동첨부(sessionStorage 최신 토큰) + 401 자동 refresh 가 걸린 공용 인증 클라이언트.
// 다른 모듈이 동일한 만료/리프레시 처리를 재사용하도록 export (예: AdminGpu).
export { API as apiClient }

/** 일반 로그인 */
export const login = (username, password) =>
  API.post('/api/v1/auth/login', { username, password })

/** OAuth 인가 코드 → JWT 교환 */
export const oauthLogin = (provider, code, redirectUri) =>
  API.post(`/api/v1/oauth/${provider}`, { code, redirect_uri: redirectUri })

/** 현재 로그인 사용자 조회 */
export const getMe = () => API.get('/api/v1/auth/me')

/** 이메일 중복 확인 */
export const checkEmail = (email) =>
  API.get('/api/v1/auth/check-email', { params: { email } })

/** 아이디 중복 확인 */
export const checkUsername = (username) =>
  API.get('/api/v1/auth/check-username', { params: { username } })

/** 회원가입 */
export const signup = (payload) =>
  API.post('/api/v1/auth/signup', payload)

/** 아이디 찾기 (이메일 발송) */
export const findId = (payload) =>
  API.post('/api/v1/auth/find-id', payload)

/** 비밀번호 찾기 (임시 비밀번호 이메일 발송) */
export const findPassword = (payload) =>
  API.post('/api/v1/auth/find-pw', payload)

/** 프로필 이미지 업로드 */
export const uploadProfileImage = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return API.put('/api/v1/auth/me/profile-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/** 프로필 이미지 삭제 */
export const deleteProfileImage = () =>
  API.delete('/api/v1/auth/me/profile-image')

/** 내 정보 수정 (이름/전화번호) */
export const updateMe = (payload) =>
  API.patch('/api/v1/auth/me', payload)

/**
 * 로그아웃 — 서버에 토큰 폐기(denylist) 요청.
 * refresh 는 body, access 는 Authorization 헤더로 명시 전달
 * (로컬 스토리지를 비우기 직전에 호출되므로 인터셉터에 의존하지 않고 토큰을 직접 넘긴다).
 */
export const logoutApi = (refreshToken, accessToken) =>
  API.post(
    '/api/v1/auth/logout',
    { refresh_token: refreshToken },
    accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined
  )


// ── OAuth 인가 URL 빌더 ─────────────────────
const REDIRECT_BASE = window.location.origin

// OAuth CSRF 방지용 state 저장 키 (provider 별). 콜백에서 동일 키로 검증.
const oauthStateKey = (provider) => `oauth_state_${provider}`

/** provider 별 state 생성·저장 후 반환 (CSRF 방지) */
export function issueOAuthState(provider) {
  const state = crypto.randomUUID()
  sessionStorage.setItem(oauthStateKey(provider), state)
  return state
}

/** 콜백에서 state 검증 — 일치하면 true, 일회용이므로 검증 후 제거 */
export function consumeOAuthState(provider, received) {
  const expected = sessionStorage.getItem(oauthStateKey(provider))
  sessionStorage.removeItem(oauthStateKey(provider))
  // 저장된 state 가 없으면(직접 진입 등) 통과시키지 않음.
  return !!expected && !!received && expected === received
}

export const getGoogleAuthUrl = () => {
  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    redirect_uri: `${REDIRECT_BASE}/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    state: issueOAuthState('google'),
    // 구글 세션이 살아있어도 계정 선택 화면 강제 (다른 계정 전환 허용)
    prompt: 'select_account consent',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export const getKakaoAuthUrl = () => {
  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_KAKAO_JS_KEY,
    redirect_uri: `${REDIRECT_BASE}/auth/kakao/callback`,
    response_type: 'code',
    state: issueOAuthState('kakao'),
    // 카카오 자동 로그인 무시, ID/PW 재입력 강제
    prompt: 'login',
  })
  return `https://kauth.kakao.com/oauth/authorize?${params}`
}

export const getNaverAuthUrl = () => {
  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_NAVER_CLIENT_ID || '',
    redirect_uri: `${REDIRECT_BASE}/auth/naver/callback`,
    response_type: 'code',
    state: issueOAuthState('naver'),
    // 네이버 세션이 살아있어도 ID/PW 재입력을 강제 (다른 계정 전환 허용)
    auth_type: 'reprompt',
  })
  return `https://nid.naver.com/oauth2.0/authorize?${params}`
}
