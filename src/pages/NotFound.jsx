/**
 * NotFound.jsx
 * 역할: 정의되지 않은 경로(오타·만료된 링크) 진입 시 표시되는 404 폴백 페이지.
 *       - 라우트 테이블의 catch-all(`*`)에 연결되어 백지 화면 방지.
 *       - 로그인 여부와 무관하게 홈/대시보드로 복귀 동선 제공.
 */

import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore.js'

export default function NotFound() {
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-800 px-6">
      <p className="text-7xl font-extrabold tracking-tight text-accent-500">404</p>
      <h1 className="mt-4 text-xl font-bold">페이지를 찾을 수 없습니다</h1>
      <p className="mt-2 text-sm text-gray-500 text-center">
        요청하신 주소가 변경되었거나 더 이상 존재하지 않습니다.
      </p>
      <div className="mt-8 flex gap-3">
        <button
          onClick={() => navigate('/')}
          className="px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold hover:bg-gray-100 transition"
        >
          홈으로
        </button>
        <button
          onClick={() => navigate(isAuthenticated ? '/employee' : '/login')}
          className="px-5 py-2.5 rounded-lg bg-accent-500 text-white text-sm font-semibold hover:bg-accent-600 transition"
        >
          {isAuthenticated ? '내 작업공간' : '로그인'}
        </button>
      </div>
    </div>
  )
}
