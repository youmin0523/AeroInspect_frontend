/**
 * pages/session/SessionSetup.jsx
 * 역할: 세션 Step 1 — 현장·운용자·점검 기본 정보 입력 폼
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2, User, Calendar, ArrowRight,
  MapPin, ClipboardList, Ruler, Clock, Briefcase, Phone, Users,
} from 'lucide-react'
import useSessionStore from '../../store/sessionStore.js'

const INSPECTION_TYPES = [
  { value: '사전점검', label: '사전점검' },
  { value: '입주점검', label: '입주점검' },
  { value: '정기',     label: '정기점검' },
]

export default function SessionSetup() {
  const navigate = useNavigate()
  const store = useSessionStore()

  const [form, setForm] = useState({
    siteName:       store.siteName || '',
    siteUnit:       store.siteUnit || '',
    operatorName:   store.operatorName || '',
    inspectionDate: store.inspectionDate || new Date().toISOString().slice(0, 10),
    inspectionType: store.inspectionType || '사전점검',
    inspectionArea: store.inspectionArea || '',
    department:     store.department || '',
    position:       store.position || '',
    phoneNumber:    store.phoneNumber || '',
    witness:        store.witness || '',
  })
  const [error, setError] = useState(null)

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (form.siteName.trim().length < 2) return setError('현장명은 2자 이상 입력해주세요.')
    if (form.operatorName.trim().length < 2) return setError('점검자명은 2자 이상 입력해주세요.')

    setError(null)
    store.setSessionInfo({
      siteName: form.siteName.trim(),
      siteUnit: form.siteUnit.trim(),
      operatorName: form.operatorName.trim(),
      inspectionDate: form.inspectionDate,
      inspectionType: form.inspectionType,
      inspectionArea: form.inspectionArea.trim(),
      department: form.department.trim(),
      position: form.position.trim(),
      phoneNumber: form.phoneNumber.trim(),
      witness: form.witness.trim(),
    })
    navigate('/session/level')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-3xl bg-white border border-gray-200 rounded-2xl shadow-sm p-8"
    >
      <h1 className="text-2xl font-bold text-gray-900 mb-1">현장 정보</h1>
      <p className="text-sm text-gray-500 mb-6 break-keep">
        점검 현장과 담당자 정보를 입력하세요. 하자점검 결과보고서 양식에 자동 반영됩니다.
      </p>

      {/* ── 현장 정보 그룹 ── */}
      <SectionLabel>현장</SectionLabel>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Field icon={<Building2 size={13} />} label="현장명" required>
          <input type="text" value={form.siteName} onChange={set('siteName')}
            placeholder="예: 송파 헬리오시티" autoFocus required className={inputCls} />
        </Field>
        <Field icon={<MapPin size={13} />} label="동 / 호수">
          <input type="text" value={form.siteUnit} onChange={set('siteUnit')}
            placeholder="예: 102동 1501호" className={inputCls} />
        </Field>
      </div>

      {/* ── 점검 정보 그룹 ── */}
      <SectionLabel>점검</SectionLabel>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Field icon={<Calendar size={13} />} label="점검 일자" required>
          <input type="date" value={form.inspectionDate} onChange={set('inspectionDate')}
            required className={inputCls} />
        </Field>
        <Field icon={<ClipboardList size={13} />} label="점검 구분">
          <div className="flex gap-2">
            {INSPECTION_TYPES.map((t) => (
              <label key={t.value} className={`flex-1 text-center px-2 py-2 rounded-md border text-xs font-semibold cursor-pointer transition ${
                form.inspectionType === t.value
                  ? 'bg-accent-500 text-white border-accent-500'
                  : 'bg-gray-50 text-gray-600 border-gray-300 hover:border-gray-400'
              }`}>
                <input type="radio" name="inspectionType" value={t.value}
                  checked={form.inspectionType === t.value}
                  onChange={set('inspectionType')} className="sr-only" />
                {t.label}
              </label>
            ))}
          </div>
        </Field>
        <Field icon={<Ruler size={13} />} label="점검 면적">
          <input type="text" value={form.inspectionArea} onChange={set('inspectionArea')}
            placeholder="예: 84㎡" className={inputCls} />
        </Field>
      </div>

      {/* ── 담당자 정보 그룹 ── */}
      <SectionLabel>담당자</SectionLabel>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Field icon={<User size={13} />} label="점검자 (운용자)" required>
          <input type="text" value={form.operatorName} onChange={set('operatorName')}
            placeholder="예: 김민수" required className={inputCls} />
        </Field>
        <Field icon={<Users size={13} />} label="입회자" hint="없으면 비워두세요">
          <input type="text" value={form.witness} onChange={set('witness')}
            placeholder="예: 박지훈" className={inputCls} />
        </Field>
        <Field icon={<Briefcase size={13} />} label="소속 / 직책">
          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={form.department} onChange={set('department')}
              placeholder="소속" className={inputCls} />
            <input type="text" value={form.position} onChange={set('position')}
              placeholder="직책" className={inputCls} />
          </div>
        </Field>
        <Field icon={<Phone size={13} />} label="연락처">
          <input type="tel" value={form.phoneNumber} onChange={set('phoneNumber')}
            placeholder="010-0000-0000" className={inputCls} />
        </Field>
      </div>

      {error && (
        <div className="mb-4 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end">
        <button
          type="submit"
          className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-accent-500 text-white font-bold text-sm hover:bg-accent-600 transition shadow-sm"
        >
          다음
          <ArrowRight size={14} />
        </button>
      </div>
    </form>
  )
}

const inputCls = 'w-full bg-gray-50 border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500'

function SectionLabel({ children }) {
  return (
    <div className="mb-3">
      <span className="text-xs font-semibold text-gray-500">{children}</span>
    </div>
  )
}

function Field({ icon, label, hint, required, children }) {
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-1.5">
        {icon && <span className="text-gray-400">{icon}</span>}
        {label}
        {required && <span className="text-red-500">*</span>}
        {hint && <span className="text-[10px] text-gray-400 font-normal ml-1">{hint}</span>}
      </span>
      {children}
    </label>
  )
}
