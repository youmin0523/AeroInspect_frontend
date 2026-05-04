/**
 * components/report/ReportEditor.jsx
 * 역할: 리포트 편집 메인 — 테이블 + 공종별 그룹 + 내보내기 + AI 내레이션
 *
 *   //* [Modified Code v2] (2026-04-16) location 은 이제 하자별 독립 필드(`defect.location`).
 *     - LocationMapEditor 는 "현재 사용 중인 장소 값의 bulk rename" 으로 재정의
 *     - AddDefectDialog 에 장소 프리셋 전달
 *     - 공종 AI 제안은 기존과 동일 (suggestTrades 휴리스틱)
 */

import { useEffect, useMemo, useState } from 'react'
import {
  Plus, Sparkles, MapPin, ListFilter, ChevronDown, ChevronRight,
} from 'lucide-react'
import DefectEditRow from './DefectEditRow.jsx'
import LocationMapEditor from './LocationMapEditor.jsx'
import AddDefectDialog from './AddDefectDialog.jsx'
import TemplateExportButton from './TemplateExportButton.jsx'
import { LOCATION_PRESETS } from '../../constants/trades.js'
import { suggestTrades } from '../../api/reportApi.js'

// datalist 는 document scope 이므로 ReportEditor 인스턴스마다 고유 id 로 분리
const DATALIST_ID = 'report-editor-location-presets'

export default function ReportEditor({ report, onChange, variant = 'page' }) {
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showAddDefect, setShowAddDefect] = useState(false)
  const [collapsedTrades, setCollapsedTrades] = useState(() => new Set())
  const [aiSuggestions, setAiSuggestions] = useState({})

  const defects = report.defects ?? []

  // 프리셋 = LOCATION_PRESETS + 현재 사용 중인 고유 값(중복 제거)
  const presets = useMemo(() => {
    const used = new Set(defects.map((d) => d.location).filter(Boolean))
    return [...new Set([...LOCATION_PRESETS, ...used])]
  }, [defects])

  // 공종별 그룹
  const groupedByTrade = useMemo(() => {
    const g = {}
    for (const d of defects) {
      const t = d.trade || '미분류'
      ;(g[t] ||= []).push(d)
    }
    return g
  }, [defects])

  // 진입 시 공종 AI 제안 배치 호출 (미할당만)
  useEffect(() => {
    const unassigned = defects.filter((d) => !d.trade)
    if (unassigned.length === 0) return
    let active = true
    suggestTrades(unassigned).then((suggestions) => {
      if (!active) return
      const map = {}
      suggestions.forEach((s) => { map[s.id] = s.trade })
      setAiSuggestions((prev) => ({ ...prev, ...map }))
      const nextDefects = defects.map((d) =>
        d.trade ? d : { ...d, trade: map[d.id] ?? '기타', trade_confidence: 0.65 }
      )
      onChange?.({ defects: nextDefects })
    })
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report.id])

  /* ── 편집 핸들러 ────────────────────────────────── */

  const patchDefect = ({ id, patch }) => {
    const next = defects.map((d) => (d.id === id ? { ...d, ...patch } : d))
    onChange?.({ defects: next })
  }

  const removeDefect = (id) => {
    if (!confirm('이 하자를 리포트에서 제거할까요? (false positive 처리)')) return
    onChange?.({ defects: defects.filter((d) => d.id !== id) })
  }

  const toggleVerified = (id) => {
    const next = defects.map((d) =>
      d.id === id ? { ...d, verified: !d.verified } : d
    )
    onChange?.({ defects: next })
  }

  const addManualDefect = (newDefect) => {
    onChange?.({ defects: [...defects, newDefect] })
  }

  // Bulk rename: { oldLabel: newLabel } → 모든 하자의 location 일괄 갱신
  const applyLocationRename = (mapping) => {
    const next = defects.map((d) => {
      const current = d.location ?? ''
      const renamed = mapping[current]
      if (renamed === undefined) return d
      return { ...d, location: renamed }
    })
    onChange?.({ defects: next })
  }

  const toggleCollapsed = (trade) => {
    setCollapsedTrades((prev) => {
      const next = new Set(prev)
      if (next.has(trade)) next.delete(trade)
      else next.add(trade)
      return next
    })
  }

  /* ── 렌더 ────────────────────────────────────── */

  const hi = defects.filter((d) => d.severity === 'HIGH').length
  const me = defects.filter((d) => d.severity === 'MED').length
  const lo = defects.filter((d) => d.severity === 'LOW').length

  return (
    <div className={variant === 'modal' ? 'flex flex-col h-full' : 'flex flex-col'}>
      {/* 공유 datalist — 테이블 전체의 location input 이 이 id 참조 */}
      <datalist id={DATALIST_ID}>
        {presets.map((p) => (<option key={p} value={p} />))}
      </datalist>

      {/* 확인자 입력 바 (양식 내보내기 전 기입) */}
      <div className="flex items-center gap-3 px-4 py-2 bg-yellow-50 border-b border-yellow-200 text-xs flex-shrink-0">
        <span className="font-semibold text-yellow-800">확인자</span>
        <input
          type="text"
          value={report.confirmer ?? ''}
          onChange={(e) => onChange?.({ confirmer: e.target.value })}
          placeholder="B2C: 의뢰 고객 / B2B: 의뢰 업체"
          className="bg-white border border-yellow-300 rounded px-2 py-1 text-xs w-60 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />
        <span className="text-[10px] text-yellow-600">양식 내보내기 시 확인자란에 기입됩니다.</span>
      </div>

      {/* 툴바 */}
      <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-3 bg-gradient-to-br from-gray-50 to-white border-b border-gray-200">
        <div className="flex items-center gap-3 text-xs text-gray-600">
          <span className="font-semibold text-slate-800">
            총 {defects.length}건
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> HIGH {hi}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> MED {me}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" /> LOW {lo}
          </span>
          {Object.keys(aiSuggestions).length > 0 && (
            <span className="inline-flex items-center gap-1 text-indigo-700">
              <Sparkles size={11} /> AI 제안 {Object.keys(aiSuggestions).length}건
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowRenameDialog(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-300 text-slate-700 hover:border-blue-400 hover:text-blue-700 transition shadow-sm"
          >
            <MapPin size={12} /> 장소 일괄 편집
          </button>
          <button
            type="button"
            onClick={() => setShowAddDefect(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition shadow-md shadow-blue-600/30"
          >
            <Plus size={12} /> 하자 추가
          </button>
          <TemplateExportButton report={report} />
        </div>
      </div>

      {/* 공종별 그룹 테이블 */}
      <div className={variant === 'modal' ? 'flex-1 overflow-y-auto' : ''}>
        {Object.keys(groupedByTrade).length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-500">
            <ListFilter size={32} className="mx-auto text-gray-300 mb-2" />
            탐지된 하자가 없습니다.
            <br />
            <button
              type="button"
              onClick={() => setShowAddDefect(true)}
              className="mt-3 inline-flex items-center gap-1 text-blue-700 hover:underline text-xs"
            >
              <Plus size={11} /> 수동 하자 추가
            </button>
          </div>
        ) : (
          Object.entries(groupedByTrade).map(([trade, list]) => {
            const isCollapsed = collapsedTrades.has(trade)
            return (
              <section key={trade} className="border-b border-gray-100 last:border-b-0">
                <button
                  type="button"
                  onClick={() => toggleCollapsed(trade)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-blue-50/80 to-transparent hover:from-blue-100 transition group"
                >
                  <span className="inline-flex items-center gap-2">
                    {isCollapsed ? <ChevronRight size={14} className="text-blue-700" /> : <ChevronDown size={14} className="text-blue-700" />}
                    <span className="text-sm font-bold text-blue-900">{trade}</span>
                    <span className="text-[11px] font-mono text-gray-500 bg-white border border-gray-200 rounded px-1.5 py-0.5">
                      {list.length}건
                    </span>
                  </span>
                  <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider group-hover:text-gray-600">
                    trade group
                  </span>
                </button>

                {!isCollapsed && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                        <tr>
                          <th className="px-2 py-2 text-left">이미지</th>
                          <th className="px-2 py-2 text-left">하자 · 영역</th>
                          <th className="px-2 py-2 text-left">공종</th>
                          <th className="px-2 py-2 text-left">장소</th>
                          <th className="px-2 py-2 text-left">심각도</th>
                          <th className="px-2 py-2 text-left">조치 메모</th>
                          <th className="px-2 py-2 text-left">검증·삭제</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((d) => (
                          <DefectEditRow
                            key={d.id}
                            defect={d}
                            aiSuggestedTrade={aiSuggestions[d.id]}
                            presetsListId={DATALIST_ID}
                            onChange={patchDefect}
                            onRemove={removeDefect}
                            onToggleVerified={toggleVerified}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )
          })
        )}
      </div>

      {/* 모달 */}
      {showRenameDialog && (
        <LocationMapEditor
          defects={defects}
          onRename={applyLocationRename}
          onClose={() => setShowRenameDialog(false)}
        />
      )}
      {showAddDefect && (
        <AddDefectDialog
          presets={presets}
          onAdd={addManualDefect}
          onClose={() => setShowAddDefect(false)}
        />
      )}
    </div>
  )
}
