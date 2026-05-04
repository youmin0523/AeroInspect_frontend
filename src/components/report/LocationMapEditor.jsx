/**
 * components/report/LocationMapEditor.jsx
 * 역할: 장소 라벨 일괄 편집 — 현재 리포트에 사용된 각 장소 값을 새 이름으로 한번에 변경
 *
 *   //* [Modified Code v2] (2026-04-16) 기존 "area 코드 → 장소 매핑" 구조 폐기.
 *     이제는 각 하자가 독립 `location` 필드를 가지므로, 이 모달은 **실제 사용 중인 고유 장소 값** 을
 *     나열하고 rename 하는 bulk-rename 도구.
 *
 *   사용자 케이스: "방3 으로 표시된 것들이 알고보니 방1 이었음 → 전체 일괄 변경"
 *
 *   Props:
 *     - defects: 현재 리포트의 하자 배열 (고유 location 추출 용)
 *     - onRename(mapping: Record<oldName, newName>): 부모가 defects 의 location 일괄 갱신
 *     - onClose
 */

import { useMemo, useState } from 'react'
import { X, Check, MapPin, ArrowRight } from 'lucide-react'

export default function LocationMapEditor({ defects = [], onRename, onClose }) {
  // 현재 사용 중인 고유 location 과 카운트
  const usageMap = useMemo(() => {
    const m = new Map()
    for (const d of defects) {
      const key = d.location ?? d.location_label ?? ''
      const label = key || '(미지정)'
      m.set(label, (m.get(label) ?? 0) + 1)
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [defects])

  // 편집 중인 값 — key: 기존 값, value: 새 값
  const [drafts, setDrafts] = useState(() =>
    Object.fromEntries(usageMap.map(([label]) => [label, label]))
  )

  const handleSave = () => {
    const mapping = {}
    for (const [oldLabel, newLabel] of Object.entries(drafts)) {
      const o = oldLabel === '(미지정)' ? '' : oldLabel
      const n = (newLabel ?? '').trim()
      if (o !== n) mapping[o] = n
    }
    if (Object.keys(mapping).length > 0) {
      onRename?.(mapping)
    }
    onClose?.()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border-t-4 border-blue-600">
        <header className="px-6 py-5 flex items-start justify-between bg-gradient-to-br from-blue-50 to-white">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/30">
              <MapPin size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 leading-tight">장소 라벨 일괄 편집</h2>
              <p className="text-xs text-gray-500 mt-0.5 break-keep">
                현재 사용 중인 장소 값을 한 번에 다른 이름으로 바꿉니다.
                예: <span className="font-mono text-slate-700">방3 → 방1</span>
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

        <div className="px-6 py-5">
          {usageMap.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              현재 리포트에 장소 값이 없습니다.
            </p>
          ) : (
            <>
              <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400 flex items-center gap-4 px-3 mb-2">
                <span className="w-[150px]">기존</span>
                <span className="w-4" />
                <span className="flex-1">변경</span>
                <span className="w-10 text-right">건수</span>
              </div>
              <ul className="space-y-2">
                {usageMap.map(([label, count]) => {
                  const changed = drafts[label] !== label
                  return (
                    <li
                      key={label}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition ${
                        changed ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <span className="w-[150px] text-sm font-semibold text-slate-700 truncate font-mono">
                        {label}
                      </span>
                      <ArrowRight size={14} className={changed ? 'text-blue-600' : 'text-gray-400'} />
                      <input
                        type="text"
                        value={drafts[label] ?? ''}
                        onChange={(e) => setDrafts((prev) => ({ ...prev, [label]: e.target.value }))}
                        className="flex-1 bg-white border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <span className="w-10 text-right text-xs font-mono text-gray-500">
                        {count}건
                      </span>
                    </li>
                  )
                })}
              </ul>
            </>
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
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition shadow-md shadow-blue-600/30"
          >
            <Check size={12} /> 일괄 적용
          </button>
        </footer>
      </div>
    </div>
  )
}
