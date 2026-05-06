/**
 * ContactModal.jsx
 * 역할: "도입 문의하기" 클릭 시 노출되는 모달
 *       - 고객 유형(개인/사업자) 선택
 *       - 사업자 선택 시 사업자등록번호 진위 확인 (시뮬레이션)
 *       - 담당자/연락처/문의 내용 수집 후 상담 신청
 */

import { useEffect, useRef, useState } from 'react'

import { checkBusinessStatus, interpretStatus } from '../../api/businessVerifyApi'
import useAuthStore from '../../store/authStore.js'

const INITIAL_FORM = {
  customerType: 'personal',
  bizNumber: '',
  name: '',
  phone: '',
  message: '',
}

export default function ContactModal({ isOpen, onClose }) {
  const [form, setForm] = useState(INITIAL_FORM)
  const [verifyState, setVerifyState] = useState({ status: 'idle', message: '' })
  const dialogRef = useRef(null)
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  // ESC로 닫기 + 스크롤 잠금
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen, onClose])

  // 모달 열릴 때마다 상태 초기화 (로그인 상태면 사용자 정보 자동 기입)
  useEffect(() => {
    if (isOpen) {
      if (isAuthenticated && user) {
        const isBiz = user.account_type === 'business'
        setForm({
          customerType: isBiz ? 'business' : 'personal',
          bizNumber: isBiz ? (user.business?.biz_number || '') : '',
          name: user.name || '',
          phone: user.phone || '',
          message: '',
        })
      } else {
        setForm(INITIAL_FORM)
      }
      setVerifyState({ status: 'idle', message: '' })
    }
  }, [isOpen, isAuthenticated, user])

  if (!isOpen) return null

  const isBusiness = form.customerType === 'business'

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const verifyBusiness = async () => {
    const bizNum = form.bizNumber.trim()
    if (bizNum.length !== 10 || Number.isNaN(Number(bizNum))) {
      setVerifyState({ status: 'error', message: '⚠️ 유효한 10자리 사업자등록번호를 입력해주세요.' })
      return
    }
    setVerifyState({ status: 'loading', message: '⏳ 국세청 데이터 조회 중...' })

    try {
      const result = await checkBusinessStatus(bizNum)
      const { ok, message } = interpretStatus(result)
      setVerifyState({
        status: ok ? 'success' : 'error',
        message: `${ok ? '✅' : '❌'} ${message}`,
      })
    } catch (err) {
      const serverMsg =
        err?.response?.data?.msg ||
        err?.response?.data?.message ||
        err?.message ||
        '알 수 없는 오류'
      setVerifyState({ status: 'error', message: `❌ 조회 실패: ${serverMsg}` })
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (isBusiness && verifyState.status !== 'success') {
      alert('사업자등록번호 진위 확인을 먼저 완료해주세요.')
      return
    }
    // TODO: 백엔드 상담 신청 API 연동
    alert('상담 신청이 접수되었습니다. 빠른 시일 내 연락드리겠습니다.')
    onClose()
  }

  const verifyTextClass = {
    idle: 'hidden',
    loading: 'text-sm font-medium text-slate-500 block',
    success: 'text-sm font-medium text-green-600 block',
    error: 'text-sm font-medium text-red-600 block',
  }[verifyState.status]

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
    >
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 모달 본체 — 부모 배경을 헤더와 동일한 slate-900 으로 맞춰
          라운드 모서리 안티앨리어싱 픽셀이 헤더 색에 자연스럽게 묻히도록.
          폼 영역은 자체 bg-white + flex-1 로 부모 잔여 영역을 모두 채워 흰 배경 보장. */}
      <div
        ref={dialogRef}
        className="relative w-full max-w-2xl max-h-[92vh] bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* 헤더 */}
        <div className="bg-slate-900 text-white py-5 px-6 text-center relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <span className="text-2xl leading-none">×</span>
          </button>
          <h1 id="contact-modal-title" className="text-2xl font-bold mb-1">
            DRONE INSPECT 도입 문의
          </h1>
          <p className="text-gray-400 text-xs">
            신뢰할 수 있는 비즈니스 파트너십을 위해 사업자 정보를 확인합니다.
          </p>
        </div>

        {/* 폼 — bg-white + flex-1 로 부모(slate-900) 잔여 영역을 모두 채워 흰 배경 보장. 헤더는 고정, 폼만 스크롤. */}
        <form onSubmit={handleSubmit} className="bg-white p-6 md:p-7 space-y-4 overflow-y-auto flex-1">
          {/* 고객 유형 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              고객 유형 선택 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'personal', label: '개인' },
                { value: 'business', label: '사업자 (개인/법인)' },
              ].map((opt) => {
                const selected = form.customerType === opt.value
                return (
                  <label
                    key={opt.value}
                    className={`relative flex items-center justify-center px-3 py-2.5 border rounded-xl cursor-pointer transition ${
                      selected
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="customerType"
                      value={opt.value}
                      checked={selected}
                      onChange={() => {
                        updateField('customerType', opt.value)
                        setVerifyState({ status: 'idle', message: '' })
                      }}
                      className="absolute opacity-0"
                    />
                    <span className={`font-bold text-sm ${selected ? 'text-blue-700' : 'text-gray-600'}`}>
                      {opt.label}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* 사업자 섹션 */}
          {isBusiness && (
            <div className="space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <label htmlFor="bizNumber" className="block text-sm font-bold text-slate-700">
                사업자등록번호 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="bizNumber"
                  value={form.bizNumber}
                  onChange={(e) => updateField('bizNumber', e.target.value)}
                  placeholder="'-' 제외 10자리 입력"
                  maxLength={10}
                  className="flex-grow px-3 py-2 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="button"
                  onClick={verifyBusiness}
                  className="px-5 py-2 bg-slate-700 text-white font-bold rounded-lg hover:bg-slate-800 transition whitespace-nowrap text-sm"
                >
                  진위 확인
                </button>
              </div>
              {verifyState.status !== 'idle' && (
                <p className={verifyTextClass}>{verifyState.message}</p>
              )}
            </div>
          )}

          {/* 성함 / 연락처 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-bold text-gray-700 mb-1.5">
                성함 / 담당자명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                required
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-bold text-gray-700 mb-1.5">
                연락처 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="phone"
                required
                placeholder="010-0000-0000"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* 문의 내용 */}
          <div>
            <label htmlFor="message" className="block text-sm font-bold text-gray-700 mb-1.5">
              문의 내용 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="message"
              rows={3}
              required
              value={form.message}
              onChange={(e) => updateField('message', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-blue-600 resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-700 text-white font-bold text-base py-3 rounded-xl hover:bg-blue-800 transition shadow-lg"
          >
            상담 신청하기
          </button>
        </form>
      </div>
    </div>
  )
}
