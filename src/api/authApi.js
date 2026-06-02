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
      sessionStorage.removeItem('access_token')
      sessionStorage.removeItem('refresh_token')
      sessionStorage.removeItem('user')
      sessionStorage.removeItem('current_org')
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
        sessionStorage.setItem('access_token', newToken)
        // R-v1.1.17: refresh token rotation — 서버가 새 refresh_token도 발급
        // 응답에 refresh_token이 있으면 localStorage 덮어쓰기 (회전 적용)
        if (data.refresh_token) {
          sessionStorage.setItem('refresh_token', data.refresh_token)
        }
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        processQueue(null, newToken)
        return API(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        sessionStorage.removeItem('access_token')
        sessionStorage.removeItem('refresh_token')
        sessionStorage.removeItem('user')
        sessionStorage.removeItem('current_org')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

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


// ── OAuth 인가 URL 빌더 ─────────────────────
const REDIRECT_BASE = window.location.origin

export const getGoogleAuthUrl = () => {
  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    redirect_uri: `${REDIRECT_BASE}/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
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
    // 카카오 자동 로그인 무시, ID/PW 재입력 강제
    prompt: 'login',
  })
  return `https://kauth.kakao.com/oauth/authorize?${params}`
}

export const getNaverAuthUrl = () => {
  const state = crypto.randomUUID()
  sessionStorage.setItem('naver_oauth_state', state)
  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_NAVER_CLIENT_ID || '',
    redirect_uri: `${REDIRECT_BASE}/auth/naver/callback`,
    response_type: 'code',
    state,
    // 네이버 세션이 살아있어도 ID/PW 재입력을 강제 (다른 계정 전환 허용)
    auth_type: 'reprompt',
  })
  return `https://nid.naver.com/oauth2.0/authorize?${params}`
}
