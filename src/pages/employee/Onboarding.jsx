/**
 * Onboarding.jsx
 * 역할: 미소속 사용자 온보딩 페이지
 *       - 새 조직 만들기 (스타트업/소기업 첫 고객)
 *       - 초대 코드로 기존 조직 가입
 *       - 관리자 배정 대기
 */

import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import { getMe } from '../../api/authApi'

// authApi의 API 인스턴스를 사용하여 401 시 자동 토큰 갱신
import axios from 'axios'
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const api = axios.create({ baseURL: API_BASE })
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// 401 시 refresh_token으로 자동 재발급
let isRefreshing = false
let failedQueue = []
function processQueue(error, token = null) {
  failedQueue.forEach(({ resolve, reject }) => error ? reject(error) : resolve(token))
  failedQueue = []
}
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const orig = error.config
    if (orig.url?.includes('/auth/refresh')) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      localStorage.removeItem('current_org')
      window.location.href = '/login'
      return Promise.reject(error)
    }
    if (error.response?.status === 401 && !orig._retry) {
      const rt = localStorage.getItem('refresh_token')
      if (!rt) return Promise.reject(error)
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((tk) => { orig.headers.Authorization = `Bearer ${tk}`; return api(orig) })
      }
      orig._retry = true
      isRefreshing = true
      try {
        const { data } = await api.post('/api/v1/auth/refresh', { refresh_token: rt })
        localStorage.setItem('access_token', data.access_token)
        orig.headers.Authorization = `Bearer ${data.access_token}`
        processQueue(null, data.access_token)
        return api(orig)
      } catch (e) {
        processQueue(e, null)
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        localStorage.removeItem('current_org')
        window.location.href = '/login'
        return Promise.reject(e)
      } finally { isRefreshing = false }
    }
    return Promise.reject(error)
  }
)

export default function Onboarding() {
  const navigate = useNavigate()
  const { user, token, setAuth, logout } = useAuthStore()
  const [mode, setMode] = useState(null) // 'create' | 'join' | null
  const [orgName, setOrgName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 로그인되지 않은 상태라면 로그인 페이지로 리다이렉트
  if (!token) {
    return <Navigate to="/login" replace />
  }

  const handleCreateOrg = async () => {
    if (!orgName.trim()) return setError('조직명을 입력해주세요.')
    setLoading(true)
    setError('')
    try {
      await api.post('/api/v1/organizations', { name: orgName.trim() })
      // 조직 생성 후 /auth/me 호출하여 최신 사용자 정보 반영
      const meRes = await getMe()
      const currentToken = localStorage.getItem('access_token')
      setAuth(currentToken, meRes.data)
      navigate('/employee', { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail || '조직 생성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleJoinByCode = async () => {
    if (inviteCode.length !== 8) return setError('8자리 초대 코드를 입력해주세요.')
    setLoading(true)
    setError('')
    try {
      await api.post('/api/v1/organizations/join', { invite_code: inviteCode.toUpperCase() })
      const meRes = await getMe()
      const currentToken = localStorage.getItem('access_token')
      setAuth(currentToken, meRes.data)
      navigate('/employee', { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail || '초대 코드가 유효하지 않습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full mx-4">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {user?.name || '사용자'}님, 환영합니다!
          </h1>
          <p className="text-gray-500 mt-2">
            조직에 소속되어야 서비스를 이용하실 수 있습니다.
          </p>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
            {error}
          </div>
        )}

        {/* 선택지 */}
        {mode === null && (
          <div className="space-y-3">
            <button
              onClick={() => setMode('create')}
              className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-slate-900 hover:bg-slate-50 transition text-left group"
            >
              <div className="font-semibold text-slate-900 group-hover:text-slate-900">
                새 조직 만들기
              </div>
              <div className="text-sm text-gray-500 mt-1">
                첫 고객이신가요? 조직을 생성하고 팀원을 초대하세요
              </div>
            </button>

            <button
              onClick={() => setMode('join')}
              className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-slate-900 hover:bg-slate-50 transition text-left group"
            >
              <div className="font-semibold text-slate-900 group-hover:text-slate-900">
                초대 코드로 가입
              </div>
              <div className="text-sm text-gray-500 mt-1">
                관리자로부터 받은 코드를 입력하세요
              </div>
            </button>

            <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl text-center">
              <div className="text-sm text-gray-400">
                관리자가 직접 배정할 때까지 대기할 수도 있습니다
              </div>
            </div>
          </div>
        )}

        {/* 조직 생성 폼 */}
        {mode === 'create' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                조직명
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="회사 또는 팀 이름"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateOrg()}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setMode(null); setError('') }}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                뒤로
              </button>
              <button
                onClick={handleCreateOrg}
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition disabled:opacity-50"
              >
                {loading ? '생성 중...' : '조직 생성'}
              </button>
            </div>
          </div>
        )}

        {/* 초대 코드 입력 폼 */}
        {mode === 'join' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                초대 코드 (8자리)
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase().slice(0, 8))}
                placeholder="ABCD1234"
                maxLength={8}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none tracking-widest text-center text-lg font-mono"
                onKeyDown={(e) => e.key === 'Enter' && handleJoinByCode()}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setMode(null); setError('') }}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                뒤로
              </button>
              <button
                onClick={handleJoinByCode}
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition disabled:opacity-50"
              >
                {loading ? '가입 중...' : '조직 가입'}
              </button>
            </div>
          </div>
        )}

        {/* 로그아웃 */}
        <div className="mt-6 text-center">
          <button
            onClick={() => { logout(); navigate('/login', { replace: true }) }}
            className="text-sm text-gray-400 hover:text-gray-600 transition"
          >
            다른 계정으로 로그인
          </button>
        </div>
      </div>
    </div>
  )
}
