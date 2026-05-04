/**
 * OAuthCallback.jsx
 * 역할: OAuth 인가 코드 콜백 처리 (Google / Kakao / Naver 공용)
 *       URL: /auth/:provider/callback?code=xxx
 *       1) URL에서 code 파라미터 추출
 *       2) 백엔드 /api/v1/oauth/:provider 로 code 전송
 *       3) 응답의 JWT 토큰을 authStore에 저장
 *       4) employee 페이지로 리다이렉트
 */

import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { oauthLogin } from '../api/authApi'
import useAuthStore from '../store/authStore'

export default function OAuthCallback() {
  const { provider } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [error, setError] = useState('')
  const calledRef = useRef(false)

  useEffect(() => {
    // React 18 Strict Mode 이중 실행 방지 (인가 코드는 1회만 사용 가능)
    if (calledRef.current) return
    calledRef.current = true

    const code = searchParams.get('code')
    if (!code) {
      setError('인가 코드가 없습니다.')
      return
    }

    const redirectUri = `${window.location.origin}/auth/${provider}/callback`

    oauthLogin(provider, code, redirectUri)
      .then((res) => {
        const { access_token, refresh_token, user } = res.data
        setAuth(access_token, user, refresh_token)
        navigate('/', { replace: true })
      })
      .catch((err) => {
        console.error('OAuth 로그인 실패:', err)
        setError(err.response?.data?.detail || '소셜 로그인에 실패했습니다.')
      })
  }, [provider, searchParams, navigate, setAuth])

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-sm">
          <p className="text-red-600 font-semibold mb-4">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
          >
            로그인으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 font-medium">로그인 처리 중...</p>
      </div>
    </div>
  )
}
