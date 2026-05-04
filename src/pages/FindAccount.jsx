/**
 * FindAccount.jsx
 * 역할: 계정 찾기 페이지 (아이디 찾기 / 비밀번호 찾기)
 *       - 상단 탭으로 아이디 ↔ 비밀번호 전환
 *       - 각 탭 내부에서 개인 / 사업자 사용자 유형 전환
 *         · 아이디 찾기: (사업자번호?) + 이름 + 이메일 → POST /api/find-id
 *         · 비밀번호 찾기: (사업자번호?) + 아이디 + 이메일 → POST /api/find-pw
 *       - 로그인 페이지에서 `/find-account?tab=id|pw` 쿼리로 진입 시 해당 탭 자동 선택
 */

import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import logoDark from '../assets/logo/logo_transparent-removebg-preview.png'
import { findId, findPassword } from '../api/authApi'

// 사용자 유형 (개인 / 사업자) — Login/Signup 과 동일한 용어 유지
const USER_TYPES = [
  { value: 'personal', label: '개인' },
  { value: 'business', label: '사업자' },
]

// 상단 탭 (아이디 찾기 / 비밀번호 찾기)
const MODE_TABS = [
  { value: 'id', label: '아이디 찾기' },
  { value: 'pw', label: '비밀번호 찾기' },
]

// 초기 폼 값 — 탭 전환 시 리셋
const INITIAL_FORM = {
  bizNumber: '',
  name: '',
  userId: '',
  email: '',
}

export default function FindAccount() {
  const location = useLocation()
  const navigate = useNavigate()

  // URL 쿼리(`?tab=id|pw`)로 초기 탭 결정 — Login 하단 링크와 연동
  const initialMode =
    new URLSearchParams(location.search).get('tab') === 'pw' ? 'pw' : 'id'

  const [mode, setMode] = useState(initialMode) // 'id' | 'pw'
  const [userType, setUserType] = useState('personal') // 'personal' | 'business'
  const [form, setForm] = useState(INITIAL_FORM)
  const [status, setStatus] = useState({ state: 'idle', message: '' })

  const isBusiness = userType === 'business'

  // location.search 가 바뀌면 (예: 로그인 페이지에서 ?tab=pw 로 재진입) 모드 동기화
  useEffect(() => {
    const next = new URLSearchParams(location.search).get('tab') === 'pw' ? 'pw' : 'id'
    setMode(next)
  }, [location.search])

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setStatus({ state: 'idle', message: '' })
  }

  const handleModeChange = (next) => {
    if (next === mode) return
    setMode(next)
    setForm(INITIAL_FORM)
    setUserType('personal')
    setStatus({ state: 'idle', message: '' })
    // 쿼리 동기화 — 브라우저 뒤로가기/북마크와 일관성 유지
    navigate(`/find-account?tab=${next}`, { replace: true })
  }

  const handleUserTypeChange = (next) => {
    if (next === userType) return
    setUserType(next)
    setForm(INITIAL_FORM)
    setStatus({ state: 'idle', message: '' })
  }

  const validate = () => {
    if (isBusiness) {
      const bizNum = form.bizNumber.trim()
      if (bizNum.length !== 10 || Number.isNaN(Number(bizNum))) {
        return '유효한 10자리 사업자등록번호를 입력해주세요.'
      }
    }
    if (mode === 'id' && !form.name.trim()) {
      return isBusiness ? '담당자명을 입력해주세요.' : '이름을 입력해주세요.'
    }
    if (mode === 'pw' && !form.userId.trim()) {
      return '아이디를 입력해주세요.'
    }
    if (!form.email.trim()) {
      return '이메일을 입력해주세요.'
    }
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const error = validate()
    if (error) {
      setStatus({ state: 'error', message: error })
      return
    }

    setStatus({ state: 'loading', message: '메일 발송 중...' })

    const payload = {
      type: userType,
      email: form.email.trim(),
      ...(isBusiness && { bizNumber: form.bizNumber.trim() }),
      ...(mode === 'id' ? { name: form.name.trim() } : { userId: form.userId.trim() }),
    }

    try {
      const { data } = mode === 'id'
        ? await findId(payload)
        : await findPassword(payload)

      setStatus({
        state: 'success',
        message: data.message,
      })
    } catch (err) {
      const detail = err?.response?.data?.detail
      const msg = typeof detail === 'string' ? detail : '요청 처리 중 오류가 발생했습니다.'
      setStatus({ state: 'error', message: msg })
    }
  }

  // 상단 탭 스타일 (아이디 / 비밀번호)
  const modeTabClass = (active) =>
    `flex-1 pb-3 text-center border-b-2 text-sm transition ${
      active
        ? 'border-blue-600 text-blue-600 font-bold'
        : 'border-transparent text-gray-400 font-medium hover:text-blue-500'
    }`

  // 사용자 유형 버튼 스타일
  const userTypeClass = (active) =>
    `flex-1 text-center py-2 rounded-lg border text-sm font-bold cursor-pointer transition ${
      active
        ? 'bg-blue-50 border-blue-200 text-blue-700'
        : 'bg-white border-gray-200 text-gray-500 hover:text-slate-700'
    }`

  // 상태 메시지 색상
  const statusTextClass = {
    idle: 'hidden',
    loading: 'text-sm font-medium text-slate-500',
    success: 'text-sm font-medium text-green-600',
    error: 'text-sm font-medium text-red-600',
  }[status.state]

  const submitLabel = mode === 'id' ? '아이디 찾기 이메일 발송' : '비밀번호 재설정 메일 발송'
  const submitBg =
    mode === 'id'
      ? 'bg-slate-900 hover:bg-slate-800'
      : 'bg-blue-600 hover:bg-blue-700'

  return (
    <div className="font-sans antialiased text-gray-800 bg-gray-50 flex items-center justify-center min-h-screen px-4 py-8">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        {/* 타이틀 ─ 좌측 로고 + 중앙 제목 + 우측 밸런스 스페이서 (Login 과 동일 구조) */}
        <div className="flex items-center mb-6">
          <Link
            to="/"
            aria-label="홈으로 이동"
            className="w-20 shrink-0 flex justify-center hover:opacity-80 transition"
          >
            <img
              src={logoDark}
              alt="DRONE INSPECT 홈"
              className="h-14 w-auto object-contain"
            />
          </Link>
          <div className="flex-1 text-center">
            <Link to="/" className="inline-block">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tighter hover:text-blue-600 transition">
                계정 찾기
              </h1>
            </Link>
          </div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="이전 화면으로 이동"
            className="w-20 shrink-0 flex items-center justify-center text-gray-400 hover:text-blue-600 transition"
          >
            <i className="ri-corner-up-left-line text-2xl" />
          </button>
        </div>

        {/* 상단 탭: 아이디 찾기 / 비밀번호 찾기 */}
        <div className="flex border-b border-gray-200 mb-7">
          {MODE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => handleModeChange(tab.value)}
              className={modeTabClass(mode === tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 사용자 유형: 개인 / 사업자 */}
          <div className="flex gap-4">
            {USER_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => handleUserTypeChange(t.value)}
                className={userTypeClass(userType === t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* 사업자등록번호 (사업자 유형에서만) */}
          {isBusiness && (
            <div>
              <label htmlFor="bizNumber" className="block text-xs font-bold text-gray-500 mb-1">
                사업자등록번호
              </label>
              <input
                type="text"
                id="bizNumber"
                value={form.bizNumber}
                onChange={(e) => updateField('bizNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="'-' 제외 10자리"
                maxLength={10}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-600 outline-none transition"
              />
            </div>
          )}

          {/* 아이디 찾기: 이름 / 비밀번호 찾기: 아이디 */}
          {mode === 'id' ? (
            <div>
              <label htmlFor="name" className="block text-xs font-bold text-gray-500 mb-1">
                {isBusiness ? '담당자명' : '이름'}
              </label>
              <input
                type="text"
                id="name"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="가입 시 등록한 실명"
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-600 outline-none transition"
              />
            </div>
          ) : (
            <div>
              <label htmlFor="userId" className="block text-xs font-bold text-gray-500 mb-1">
                아이디
              </label>
              <input
                type="text"
                id="userId"
                value={form.userId}
                onChange={(e) => updateField('userId', e.target.value)}
                placeholder="가입한 아이디 입력"
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-600 outline-none transition"
              />
            </div>
          )}

          {/* 이메일 */}
          <div>
            <label htmlFor="email" className="block text-xs font-bold text-gray-500 mb-1">
              이메일 주소
            </label>
            <input
              type="email"
              id="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder={mode === 'id' ? 'example@drone.com' : '가입 시 등록한 이메일'}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-600 outline-none transition"
            />
          </div>

          {/* 상태 메시지 */}
          {status.state !== 'idle' && (
            <p className={statusTextClass}>{status.message}</p>
          )}

          <button
            type="submit"
            disabled={status.state === 'loading'}
            className={`w-full ${submitBg} text-white font-bold py-3.5 rounded-xl transition shadow-lg disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {status.state === 'loading' ? '발송 중...' : submitLabel}
          </button>
        </form>

        {/* 하단 링크 */}
        <div className="mt-7 text-center">
          <Link
            to="/login"
            className="text-sm text-gray-400 hover:text-slate-800 font-medium transition underline underline-offset-4"
          >
            로그인 화면으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  )
}
