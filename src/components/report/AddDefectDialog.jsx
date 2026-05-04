/**
 * components/report/AddDefectDialog.jsx
 * 역할: 수동 하자 추가 모달 — 육안 재확인 시 드론이 놓친 하자를 입력
 *
 *   //* [Modified Code v2] (2026-04-16) area 와 location 분리 — 기존에 "A · 구조·기하학 (거실)" 처럼
 *     두 개념을 한 드롭다운에 혼용했던 버그를 수정. 이제 영역(기술 분류) 과 장소(물리 방) 는 독립 필드.
 *
 *   필드:
 *     - 하자 유형명 (required)
 *     - 영역 (area) — 기술 분류 A~E
 *     - 장소 (location) — datalist 프리셋 + 자유 입력
 *     - 공종 (trade) — TRADES 고정 목록 + "직접 입력"(TradeSelect 내부에서 처리)
 *     - 심각도 (severity) — HIGH/MED/LOW 라디오 버튼 톤
 *     - 조치 메모 (optional)
 *     - 이미지 (optional)
 */

import { useState } from 'react'
import {
  X, Plus, Image as ImageIcon, AlertTriangle,
  Layers, MapPin, Hammer, ClipboardList,
} from 'lucide-react'
import { DEFECT_AREAS } from '../../constants/defectCategories.js'
import { TRADES, LOCATION_PRESETS, inferInitialLocation } from '../../constants/trades.js'
import TradeSelect from './TradeSelect.jsx'

const SEVERITIES = [
  { value: 'HIGH', label: '즉시 보수', cls: 'bg-red-500 text-white border-red-500 hover:bg-red-600',      activeCls: 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/30' },
  { value: 'MED',  label: '조치 권고', cls: 'bg-orange-500 text-white border-orange-500 hover:bg-orange-600', activeCls: 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/30' },
  { value: 'LOW',  label: '협의 보수', cls: 'bg-yellow-500 text-white border-yellow-500 hover:bg-yellow-600', activeCls: 'bg-yellow-500 text-white border-yellow-500 shadow-lg shadow-yellow-500/30' },
]

export default function AddDefectDialog({ presets, onAdd, onClose }) {
  const locationPresets = presets?.length ? presets : LOCATION_PRESETS
  const [defectType, setDefectType] = useState('')
  const [area, setArea] = useState('A')
  const [location, setLocation] = useState(inferInitialLocation('A'))
  const [trade, setTrade] = useState('도배')
  const [severity, setSeverity] = useState('MED')
  const [actionNote, setActionNote] = useState('')
  const [imageDataUrl, setImageDataUrl] = useState(null)     // 근경
  const [imageWideUrl, setImageWideUrl] = useState(null)     // 원경
  const [error, setError] = useState(null)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImageDataUrl(reader.result)
    reader.readAsDataURL(file)
  }

  const handleAreaChange = (newArea) => {
    setArea(newArea)
    // 장소가 비어있거나 이전 area 의 추정값과 같으면 새 area 의 추정값으로 갱신
    const prevInit = inferInitialLocation(area)
    if (!location || location === prevInit) {
      setLocation(inferInitialLocation(newArea))
    }
  }

  const handleSubmit = () => {
    if (defectType.trim().length < 2) {
      setError('하자 유형명을 2자 이상 입력해주세요.')
      return
    }
    if (!trade) {
      setError('공종을 선택하거나 직접 입력해주세요.')
      return
    }
    setError(null)
    onAdd?.({
      id: crypto.randomUUID(),
      defect_type: defectType.trim(),
      category_code: '', // 수동 추가는 category 코드 없음
      area,
      severity,
      confidence: 1.0,
      timestamp: Date.now(),
      image_crop: imageDataUrl,
      image_wide: imageWideUrl,
      trade,
      trade_confidence: 1.0,
      location: location.trim() || inferInitialLocation(area),
      verified: true,
      action_note: actionNote.trim() || null,
      is_manual: true,
    })
    onClose?.()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border-t-4 border-blue-600">
        {/* 헤더 */}
        <header className="px-6 py-5 flex items-start justify-between bg-gradient-to-br from-blue-50 to-white">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/30">
              <Plus size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 leading-tight">하자 수동 추가</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                드론이 놓친 하자를 육안으로 재확인 후 리포트에 포함합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-white hover:text-slate-800 transition"
          >
            <X size={16} />
          </button>
        </header>

        <div className="px-6 py-5 space-y-5 max-h-[calc(90vh-180px)] overflow-y-auto">
          {/* 1) 하자 유형명 */}
          <FieldBlock icon={<ClipboardList size={13} />} label="하자 유형명" hint="구체적으로 작성하면 리포트 가독성이 높아집니다.">
            <input
              type="text"
              value={defectType}
              onChange={(e) => setDefectType(e.target.value)}
              placeholder="예: 도배 틈새 벌어짐"
              autoFocus
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </FieldBlock>

          {/* 2) 영역(area) + 장소(location) — 분리 */}
          <div className="grid grid-cols-2 gap-3">
            <FieldBlock icon={<Layers size={13} />} label="영역 (기술 분류)">
              <select
                value={area}
                onChange={(e) => handleAreaChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {Object.entries(DEFECT_AREAS).map(([k, info]) => (
                  <option key={k} value={k}>{k} · {info.label}</option>
                ))}
              </select>
            </FieldBlock>

            <FieldBlock icon={<MapPin size={13} />} label="장소 (물리 방)" hint="자유 입력 가능">
              <input
                type="text"
                list="location-presets"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="예: 거실 / 방1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <datalist id="location-presets">
                {locationPresets.map((p) => (<option key={p} value={p} />))}
              </datalist>
            </FieldBlock>
          </div>

          {/* 3) 공종 + 심각도 */}
          <div className="grid grid-cols-2 gap-3">
            <FieldBlock icon={<Hammer size={13} />} label="공종" hint="직접 입력 선택 시 자유 입력">
              <select
                value={TRADES.includes(trade) ? trade : '__custom__'}
                onChange={(e) => {
                  if (e.target.value === '__custom__') setTrade('')
                  else setTrade(e.target.value)
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {TRADES.map((t) => <option key={t} value={t}>{t}</option>)}
                <option disabled>────────</option>
                <option value="__custom__">✎ 직접 입력</option>
              </select>
              {!TRADES.includes(trade) && (
                <input
                  type="text"
                  value={trade}
                  onChange={(e) => setTrade(e.target.value)}
                  placeholder="공종 직접 입력"
                  className="w-full mt-2 border border-indigo-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              )}
            </FieldBlock>

            <FieldBlock icon={<AlertTriangle size={13} />} label="심각도">
              <div className="flex gap-1.5">
                {SEVERITIES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSeverity(s.value)}
                    className={`flex-1 px-2 py-2 rounded-lg text-xs font-bold border transition ${
                      severity === s.value ? s.activeCls : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                    }`}
                    title={s.label}
                  >
                    {s.value}
                  </button>
                ))}
              </div>
            </FieldBlock>
          </div>

          {/* 4) 조치 메모 */}
          <FieldBlock label="조치 메모 (선택)">
            <textarea
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              rows={2}
              placeholder="예: 재도배 요청 / 다음 점검 때 재확인"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </FieldBlock>

          {/* 5) 이미지 2장 (근경 + 원경) */}
          <div className="grid grid-cols-2 gap-3">
            <FieldBlock label="근경 사진 (클로즈업)">
              <ImageUpload
                value={imageDataUrl}
                onSet={setImageDataUrl}
                placeholder="근경 첨부"
              />
            </FieldBlock>
            <FieldBlock label="원경 사진 (전체 뷰)">
              <ImageUpload
                value={imageWideUrl}
                onSet={setImageWideUrl}
                placeholder="원경 첨부"
              />
            </FieldBlock>
          </div>

          {error && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
              <AlertTriangle size={12} /> {error}
            </div>
          )}
        </div>

        <footer className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-gray-500 hover:text-slate-800 px-3 py-1.5 transition"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition shadow-md shadow-blue-600/30"
          >
            <Plus size={12} /> 하자 추가
          </button>
        </footer>
      </div>
    </div>
  )
}

function FieldBlock({ icon, label, hint, children }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon && <span className="text-gray-500">{icon}</span>}
        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">{label}</span>
        {hint && <span className="text-[10px] text-gray-400 ml-1">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function ImageUpload({ value, onSet, placeholder }) {
  const handleChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onSet(reader.result)
    reader.readAsDataURL(file)
  }
  if (value) {
    return (
      <div className="relative inline-block">
        <img src={value} alt="미리보기" className="max-h-28 rounded-lg border border-gray-200 shadow-sm" />
        <button
          type="button"
          onClick={() => onSet(null)}
          className="absolute top-1 right-1 p-1 bg-white/95 rounded-full text-gray-600 hover:text-red-600 shadow transition"
        >
          <X size={10} />
        </button>
      </div>
    )
  }
  return (
    <label className="flex items-center justify-center gap-2 text-[11px] text-gray-500 cursor-pointer hover:text-blue-700 hover:bg-blue-50 px-3 py-3 border-2 border-dashed border-gray-300 rounded-lg transition">
      <ImageIcon size={12} />
      {placeholder}
      <input type="file" accept="image/*" className="hidden" onChange={handleChange} />
    </label>
  )
}
