/**
 * Login.jsx
 * 역할: 로그인 페이지
 *       - 상단 탭으로 고객 유형 전환 (개인 / 사업자)
 *       - 개인: 아이디·비밀번호 + 소셜 로그인 (Google / Naver / Kakao)
 *       - 사업자: 사업자등록번호 + 아이디·비밀번호 (소셜 로그인 미제공)
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { login as loginApi, getGoogleAuthUrl, getKakaoAuthUrl, getNaverAuthUrl } from '../api/authApi'
import useAuthStore from '../store/authStore'
import logoDark from '../assets/logo/logo_transparent-removebg-preview.png'

// 탭 구성
const LOGIN_TABS = [
  { value: 'personal', label: '개인' },
  { value: 'business', label: '사업자 (개인/법인)' },
]

// SNS 소셜 로그인 (원형 아이콘 버튼)
const SOCIAL_PROVIDERS = [
  {
    id: 'google',
    label: 'Google',
    bg: 'bg-white border border-gray-200 hover:bg-gray-50',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09A6.97 6.97 0 0 1 5.47 12c0-.72.13-1.43.37-2.09V7.07H2.18A11.96 11.96 0 0 0 .96 12c0 1.94.46 3.77 1.22 5.33l3.66-3.24z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.99 14.97.96 12 .96 7.7.96 3.99 3.47 2.18 7.07l3.66 3.24c.87-2.6 3.3-4.93 6.16-4.93z" />
      </svg>
    ),
  },
  {
    id: 'naver',
    label: 'Naver',
    bg: 'bg-[#03C75A] hover:opacity-90',
    icon: (
      <span className="text-white font-extrabold text-lg leading-none">N</span>
    ),
  },
  {
    id: 'kakao',
    label: 'Kakao',
    bg: 'bg-[#FEE500] hover:opacity-90',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#191919]">
        <path d="M12 3C6.48 3 2 6.36 2 10.44c0 2.62 1.75 4.93 4.38 6.24l-1.12 4.12a.37.37 0 0 0 .56.42l4.66-3.1c.49.06 1 .1 1.52.1 5.52 0 10-3.36 10-7.78S17.52 3 12 3z" />
      </svg>
    ),
  },
]

export default function Login() {
  const [loginType, setLoginType] = useState('personal') // 'personal' | 'business'
  const [form, setForm] = useState({ bizNumber: '', userId: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  // 마지막으로 사용한 로그인 방법 (가입자가 다른 방식으로 새 가입하는 사고 방지용 가이드)
  const [lastLoginMethod] = useState(() => localStorage.getItem('last_login_method'))

  const isBusiness = loginType === 'business'

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setError('')
  }

  const handleTypeChange = (type) => {
    setLoginType(type)
    setForm({ bizNumber: '', userId: '', password: '' })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isBusiness) {
      const bizNum = form.bizNumber.trim()
      if (!bizNum) {
        setError('사업자등록번호를 입력해주세요.')
        return
      }
      if (bizNum.length !== 10 || Number.isNaN(Number(bizNum))) {
        setError('유효한 10자리 사업자등록번호를 입력해주세요.')
        return
      }
    }
    if (!form.userId || !form.password) {
      setError('아이디와 비밀번호를 모두 입력해주세요.')
      return
    }

    setLoading(true)
    try {
      const res = await loginApi(form.userId, form.password)
      const { access_token, refresh_token, user } = res.data
      setAuth(access_token, user, refresh_token, 'local')
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || '로그인에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSocialLogin = (provider) => {
    const urlMap = {
      google: getGoogleAuthUrl,
      kakao: getKakaoAuthUrl,
      naver: getNaverAuthUrl,
    }
    window.location.href = urlMap[provider]()
  }

  // 탭 버튼 스타일
  const tabClass = (active) =>
    `flex-1 py-2 text-sm font-bold rounded-md transition ${
      active
        ? 'bg-white text-blue-600 shadow-sm'
        : 'text-gray-500 hover:text-slate-700'
    }`

  return (
    <div className="font-sans antialiased text-gray-800 bg-gray-50 flex items-center justify-center min-h-screen px-4 py-8">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        {/* 타이틀 ─ 좌측 로고(공백 중앙) + 중앙 제목 + 우측 밸런스 스페이서 */}
        <div className="flex items-center mb-8">
          {/* 좌측: 로고 전용 컬럼 (영역 중앙에 로고 배치) */}
          <Link
            to="/"
            aria-label="홈으로 이동"
            className="w-20 shrink-0 flex justify-center hover:opacity-80 transition"
          >
            <img
              src={logoDark}
              alt="DRONE INSPECT 홈"
              className="h-16 w-auto object-contain"
            />
          </Link>
          {/* 중앙: 제목 */}
          <div className="flex-1 text-center">
            <Link to="/" className="inline-block">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tighter hover:text-blue-600 transition">
                DRONE INSPECT
              </h1>
            </Link>
            <p className="text-gray-500 mt-1 text-xs">
              플랫폼에 오신 것을 환영합니다.
            </p>
          </div>
          {/* 우측: 메인화면으로 나가기 */}
          <Link
            to="/"
            aria-label="메인화면으로 이동"
            className="w-20 shrink-0 flex items-center justify-center text-gray-400 hover:text-blue-600 transition"
          >
            <i className="ri-corner-up-left-line text-2xl" />
          </Link>
        </div>

        {/* 탭 선택 (개인 / 사업자) */}
        <div className="flex p-1 bg-gray-100 rounded-lg mb-8">
          {LOGIN_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => handleTypeChange(tab.value)}
              className={tabClass(loginType === tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 로그인 폼 */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 사업자등록번호 (사업자 탭에서만 노출) */}
          {isBusiness && (
            <div>
              <label htmlFor="bizNumber" className="block text-sm font-semibold text-gray-700 mb-1">
                사업자등록번호
              </label>
              <input
                type="text"
                id="bizNumber"
                value={form.bizNumber}
                onChange={(e) => updateField('bizNumber', e.target.value)}
                placeholder="'-' 제외 10자리"
                maxLength={10}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none transition"
              />
            </div>
          )}

          <div>
            <label htmlFor="userId" className="block text-sm font-semibold text-gray-700 mb-1">
              아이디
            </label>
            <input
              type="text"
              id="userId"
              value={form.userId}
              onChange={(e) => updateField('userId', e.target.value)}
              placeholder="아이디를 입력하세요"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none transition"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1">
              비밀번호
            </label>
            <input
              type="password"
              id="password"
              value={form.password}
              onChange={(e) => updateField('password', e.target.value)}
              placeholder="비밀번호를 입력하세요"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none transition"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 font-medium">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`relative w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-500 text-white font-bold text-lg py-3.5 rounded-lg transition shadow-md ${
              lastLoginMethod === 'local' ? 'ring-2 ring-blue-500 ring-offset-2' : ''
            }`}
          >
            {loading ? '로그인 중...' : '로그인'}
            {lastLoginMethod === 'local' && (
              <span className="absolute -top-2 -right-2 px-2 py-0.5 text-[10px] font-bold text-white bg-blue-600 rounded-full leading-none shadow">
                최근
              </span>
            )}
          </button>
        </form>

        {/* 하단 링크 */}
        <div className="flex items-center justify-between mt-6 text-sm">
          <div className="space-x-3 text-gray-500 font-medium">
            <Link to="/find-account?tab=id" className="hover:text-blue-600 transition">아이디 찾기</Link>
            <span className="text-gray-300">|</span>
            <Link to="/find-account?tab=pw" className="hover:text-blue-600 transition">비밀번호 찾기</Link>
          </div>
          <Link to="/signup" className="text-blue-600 font-bold hover:underline">
            회원가입
          </Link>
        </div>

        {/* SNS 로그인 (개인 탭에서만 노출) */}
        {!isBusiness && (
          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-center text-xs text-gray-400 mb-4 font-medium">
              SNS 계정으로 간편 로그인
            </p>
            <div className="flex justify-center space-x-6">
              {SOCIAL_PROVIDERS.map((provider) => {
                const isLast = lastLoginMethod === provider.id
                return (
                  <div key={provider.id} className="flex flex-col items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSocialLogin(provider.id)}
                      aria-label={`${provider.label} 로그인${isLast ? ' (최근 사용)' : ''}`}
                      className={`relative w-12 h-12 rounded-full flex items-center justify-center shadow-sm transition ${provider.bg} ${
                        isLast ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                      }`}
                    >
                      {provider.icon}
                      {isLast && (
                        <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 text-[9px] font-bold text-white bg-blue-600 rounded-full leading-none shadow">
                          최근
                        </span>
                      )}
                    </button>
                    <span className={`text-[10px] ${isLast ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
                      {provider.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
