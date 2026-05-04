/**
 * components/report/TradeSelect.jsx
 * 역할: 공종(Trade) 선택 위젯 — 고정 목록 드롭다운 + "직접 입력" 폴백
 *       - 값이 TRADES 목록에 있으면 select 로 표시
 *       - 값이 TRADES 외 커스텀 값이거나 "직접 입력" 선택 시 → text input 으로 자유 입력
 *       - AI 제안값과 일치하면 Sparkles · AI 뱃지 노출 (사용자가 수정 안 한 상태)
 */

import { useMemo, useState, useEffect } from 'react'
import { Sparkles, Pencil } from 'lucide-react'
import { TRADES } from '../../constants/trades.js'

const CUSTOM_SENTINEL = '__custom__'

export default function TradeSelect({ value, onChange, suggested, disabled }) {
  // 현재 값이 TRADES 에 있는지 확인 — 없으면 커스텀 모드 자동 진입
  const isPreset = useMemo(() => !value || TRADES.includes(value), [value])
  const [customMode, setCustomMode] = useState(!isPreset)

  // prop 으로 들어온 value 가 presets 외부로 바뀌면 모드 동기화
  useEffect(() => {
    if (!isPreset && !customMode) setCustomMode(true)
    if (isPreset && customMode && value === '') setCustomMode(false)
  }, [isPreset, value, customMode])

  const isAISuggested = !customMode && !!suggested && value === suggested

  const handleSelectChange = (e) => {
    const v = e.target.value
    if (v === CUSTOM_SENTINEL) {
      setCustomMode(true)
      onChange?.('') // 빈 값으로 리셋해 사용자 직접 입력 유도
    } else {
      setCustomMode(false)
      onChange?.(v)
    }
  }

  const handleInputBlur = () => {
    // 입력값이 비어있으면 커스텀 모드 해제
    if (!value) setCustomMode(false)
  }

  if (customMode) {
    return (
      <div className="inline-flex items-center gap-1">
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          onBlur={handleInputBlur}
          placeholder="공종 직접 입력"
          disabled={disabled}
          className="text-xs bg-white border border-indigo-300 rounded px-2 py-1 min-w-[120px] focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-100"
        />
        <button
          type="button"
          onClick={() => {
            setCustomMode(false)
            onChange?.('')
          }}
          title="고정 목록에서 선택"
          className="p-1 text-gray-400 hover:text-indigo-700 transition"
        >
          ↶
        </button>
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-1">
      <select
        value={value || ''}
        onChange={handleSelectChange}
        disabled={disabled}
        className="text-xs bg-white border border-gray-300 rounded px-2 py-1 pr-6 min-w-[110px] focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-400"
      >
        {!value && <option value="">공종 선택</option>}
        {TRADES.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
        <option disabled>────────</option>
        <option value={CUSTOM_SENTINEL}>✎ 직접 입력</option>
      </select>
      {isAISuggested && (
        <span
          className="inline-flex items-center gap-0.5 text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-1 py-0.5"
          title="AI 자동 제안된 값입니다. 필요 시 수정하세요."
        >
          <Sparkles size={9} /> AI
        </span>
      )}
    </div>
  )
}

export { Pencil }
