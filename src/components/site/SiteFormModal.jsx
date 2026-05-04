/**
 * components/site/SiteFormModal.jsx
 * 역할: 현장 등록/수정 폼 모달
 *       - mode: 'create' | 'edit'
 *       - B2B/B2C 라디오 선택에 따라 의뢰자 섹션 라벨 동적 변경
 */

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { BUILDING_TYPES, SITE_STATUS, CLIENT_TYPES, CLIENT_TYPE_MAP, INSPECTION_TYPES } from '../../constants/siteTypes.js'

const MOCK_TEAM = [
  { id: 't1', name: '유민수', role: '과장' },
  { id: 't2', name: '백승희', role: '대리' },
  { id: 't3', name: '오희진', role: '대리' },
]

const INITIAL = {
  name: '',
  inspection_type: '사전점검',
  address: '',
  building_type: '아파트',
  total_area: '',
  building_count: '',
  unit_count: '',
  client_type: 'B2B',
  client_name: '',
  client_contact: '',
  contract_start: '',
  contract_end: '',
  status: 'pending',
  assigned_members: [],
  memo: '',
}

export default function SiteFormModal({ open, onClose, onSubmit, initialData, mode = 'create' }) {
  const [form, setForm] = useState(INITIAL)

  useEffect(() => {
    if (open) {
      setForm(initialData ? { ...INITIAL, ...initialData, total_area: initialData.total_area ?? '', building_count: initialData.building_count ?? '', unit_count: initialData.unit_count ?? '' } : INITIAL)
    }
  }, [open, initialData])

  if (!open) return null

  const ct = CLIENT_TYPE_MAP[form.client_type] || CLIENT_TYPE_MAP.B2B

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }))

  const toggleMember = (member) => {
    setForm((prev) => {
      const exists = prev.assigned_members.some((m) => m.id === member.id)
      return {
        ...prev,
        assigned_members: exists
          ? prev.assigned_members.filter((m) => m.id !== member.id)
          : [...prev.assigned_members, member],
      }
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return alert('현장명을 입력해주세요.')
    onSubmit({
      ...form,
      total_area: form.total_area === '' ? null : Number(form.total_area),
      building_count: form.building_count === '' ? null : Number(form.building_count),
      unit_count: form.unit_count === '' ? null : Number(form.unit_count),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-slate-800">
            {mode === 'create' ? '새 현장 등록' : '현장 정보 수정'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          {/* ── 의뢰 유형 ── */}
          <fieldset>
            <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">의뢰 유형</legend>
            <div className="flex gap-3">
              {CLIENT_TYPES.map((ct) => (
                <label
                  key={ct.value}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 cursor-pointer transition font-semibold text-sm
                    ${form.client_type === ct.value
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                >
                  <input
                    type="radio"
                    name="client_type"
                    value={ct.value}
                    checked={form.client_type === ct.value}
                    onChange={() => set('client_type', ct.value)}
                    className="sr-only"
                  />
                  {ct.label}
                </label>
              ))}
            </div>
          </fieldset>

          {/* ── 현장 정보 ── */}
          <fieldset>
            <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">현장 정보</legend>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">현장명 <span className="text-red-500">*</span></label>
                  <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="예: 송파 헬리오시티 101동~109동" className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">점검 구분</label>
                  <select value={form.inspection_type} onChange={(e) => set('inspection_type', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white">
                    {INSPECTION_TYPES.map((it) => <option key={it.value} value={it.value}>{it.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">주소</label>
                <input type="text" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="서울특별시 ..." className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">건물 유형</label>
                  <select value={form.building_type} onChange={(e) => set('building_type', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white">
                    {BUILDING_TYPES.map((bt) => <option key={bt.value} value={bt.value}>{bt.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">공급면적 (㎡)</label>
                  <input type="number" value={form.total_area} onChange={(e) => set('total_area', e.target.value)} placeholder="84" className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">동 수</label>
                  <input type="number" value={form.building_count} onChange={(e) => set('building_count', e.target.value)} placeholder="9" className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">세대(호) 수</label>
                  <input type="number" value={form.unit_count} onChange={(e) => set('unit_count', e.target.value)} placeholder="9510" className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                </div>
              </div>
            </div>
          </fieldset>

          {/* ── 의뢰자 정보 ── */}
          <fieldset>
            <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">의뢰자 정보</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{ct.clientLabel}</label>
                <input type="text" value={form.client_name} onChange={(e) => set('client_name', e.target.value)} placeholder={form.client_type === 'B2B' ? '현대건설' : '홍길동'} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{ct.contactLabel}</label>
                <input type="text" value={form.client_contact} onChange={(e) => set('client_contact', e.target.value)} placeholder={form.client_type === 'B2B' ? '02-1234-5678' : '010-1234-5678'} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              </div>
            </div>
          </fieldset>

          {/* ── 일정 ── */}
          <fieldset>
            <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">일정</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{form.client_type === 'B2B' ? '계약 시작일' : '점검 시작일'}</label>
                <input type="date" value={form.contract_start} onChange={(e) => set('contract_start', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{form.client_type === 'B2B' ? '계약 종료일' : '점검 종료일'}</label>
                <input type="date" value={form.contract_end} onChange={(e) => set('contract_end', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              </div>
            </div>
          </fieldset>

          {/* ── 운영 ── */}
          <fieldset>
            <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">운영</legend>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
                <select value={form.status} onChange={(e) => set('status', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white">
                  {SITE_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              {/* 담당자 배정 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">담당자 배정</label>
                <div className="flex flex-wrap gap-2">
                  {MOCK_TEAM.map((member) => {
                    const checked = form.assigned_members.some((m) => m.id === member.id)
                    return (
                      <label
                        key={member.id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border cursor-pointer transition text-sm
                          ${checked
                            ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleMember(member)}
                          className="sr-only"
                        />
                        {member.name} <span className="text-xs opacity-70">({member.role})</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
                <textarea value={form.memo} onChange={(e) => set('memo', e.target.value)} rows={3} placeholder="비고 / 특이사항" className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none" />
              </div>
            </div>
          </fieldset>

          {/* ── 버튼 ── */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
              취소
            </button>
            <button type="submit" className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition shadow-sm">
              {mode === 'create' ? '등록' : '수정'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
