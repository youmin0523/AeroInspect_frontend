/**
 * components/report/DefectEditCard.jsx
 * 역할: 모바일/태블릿 협소 화면(< md, 768px)용 하자 편집 카드 뷰.
 *       데스크탑 DefectEditRow 와 동일한 onChange/onRemove/onToggleVerified 계약을 사용한다.
 *
 *   //* [Modified Code v1] (2026-05-27) 모바일 viewport 320px 가독성 확보 — 19컬럼 와이드 테이블 대체.
 *     데스크탑(`md:` 이상)에서는 ReportEditor 가 이 컴포넌트를 숨기고 기존 테이블을 노출한다.
 *     상태/핸들러는 ReportEditor 의 단일 source(`defects`)에 그대로 묶여 양방향 동기화 0 비용.
 */

import { Check, Trash2, User } from 'lucide-react'
import TradeSelect from './TradeSelect.jsx'
import { DEFECT_AREAS } from '../../constants/defectCategories.js'

const SEVERITY_STYLE = {
  HIGH: { badge: 'bg-red-600 text-white', border: 'border-red-200', soft: 'bg-red-50 text-red-700 border-red-200' },
  MED:  { badge: 'bg-orange-500 text-white', border: 'border-orange-200', soft: 'bg-orange-50 text-orange-700 border-orange-200' },
  LOW:  { badge: 'bg-yellow-500 text-white', border: 'border-yellow-200', soft: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
}

const SEVERITY_LABEL = { HIGH: '높음', MED: '중간', LOW: '낮음' }

export default function DefectEditCard({
  defect,
  aiSuggestedTrade,
  presetsListId = 'location-presets',
  onChange,
  onRemove,
  onToggleVerified,
}) {
  const patch = (p) => onChange?.({ id: defect.id, patch: p })
  const sev = SEVERITY_STYLE[defect.severity] ?? SEVERITY_STYLE.MED
  const areaInfo = DEFECT_AREAS[defect.area]
  const areaColor = areaInfo?.color ?? '#64748b'
  const confPct = Math.round((Number(defect.confidence) || 0) * 100)

  return (
    <article
      className={[
        'rounded-xl border bg-white shadow-sm',
        defect.verified ? 'border-green-300 bg-green-50/40' : 'border-gray-200',
      ].join(' ')}
    >
      {/* ── 헤더: severity 배지 + category_code + defect_type ───────────── */}
      <header className={`flex items-start gap-2 px-3 py-2.5 border-b ${sev.border}`}>
        <span
          className={`inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold ${sev.badge}`}
          aria-label={`심각도 ${SEVERITY_LABEL[defect.severity] ?? defect.severity}`}
        >
          {defect.severity ?? 'MED'}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono text-gray-500">
              {defect.category_code || 'MANUAL'}
            </span>
            {defect.is_manual && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded px-1 py-0.5">
                <User size={9} /> 수동
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-slate-800 break-keep leading-snug">
            {defect.defect_type ?? defect.category_code ?? '-'}
          </p>
        </div>
        {defect.area && (
          <span
            className="inline-flex items-center text-[10px] font-mono font-bold rounded px-1.5 py-1 text-white shrink-0"
            style={{ backgroundColor: areaColor }}
            title={areaInfo?.label}
          >
            {defect.area}
          </span>
        )}
      </header>

      {/* ── 썸네일 (근경 + 원경) ─────────────────────────────────────── */}
      {(defect.image_crop || defect.image_wide) && (
        <div className="flex gap-2 px-3 py-2.5 border-b border-gray-100">
          {defect.image_crop ? (
            <img
              src={defect.image_crop}
              alt="근경"
              title="근경"
              className="w-20 h-20 object-cover rounded-md border border-gray-200 shadow-sm"
            />
          ) : (
            <div className="w-20 h-20 rounded-md border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400 text-[10px]">
              근경 없음
            </div>
          )}
          {defect.image_wide ? (
            <img
              src={defect.image_wide}
              alt="원경"
              title="원경"
              className="w-20 h-20 object-cover rounded-md border border-gray-200 shadow-sm"
            />
          ) : (
            <div className="w-20 h-20 rounded-md border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400 text-[10px]">
              원경 없음
            </div>
          )}
        </div>
      )}

      {/* ── 본문: label-value 한 줄씩 ─────────────────────────────── */}
      <dl className="px-3 py-2.5 grid grid-cols-[72px_1fr] gap-x-3 gap-y-2 text-xs">
        <dt className="text-gray-500 font-medium pt-1.5">신뢰도</dt>
        <dd className="text-slate-800 font-mono pt-1.5">{confPct}%</dd>

        {defect.thermal_max != null && (
          <>
            <dt className="text-gray-500 font-medium pt-1.5">열영상 최고</dt>
            <dd className="text-slate-800 font-mono pt-1.5">
              {Number(defect.thermal_max).toFixed(1)} ℃
            </dd>
          </>
        )}

        <dt className="text-gray-500 font-medium pt-1.5">장소</dt>
        <dd>
          <input
            type="text"
            list={presetsListId}
            value={defect.location ?? ''}
            onChange={(e) => patch({ location: e.target.value })}
            placeholder="장소 입력"
            className="w-full min-h-[40px] text-sm bg-white border border-gray-200 rounded-md px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </dd>

        <dt className="text-gray-500 font-medium pt-1.5">공종</dt>
        <dd className="min-h-[40px]">
          <TradeSelect
            value={defect.trade}
            suggested={aiSuggestedTrade}
            onChange={(v) => patch({ trade: v, trade_confidence: 1.0 })}
          />
        </dd>

        <dt className="text-gray-500 font-medium pt-1.5">심각도</dt>
        <dd>
          <select
            value={defect.severity ?? 'MED'}
            onChange={(e) => patch({ severity: e.target.value })}
            className={`w-full min-h-[40px] text-sm rounded-md border px-2.5 py-2 font-bold ${sev.soft} focus:outline-none focus:ring-2 focus:ring-blue-400`}
          >
            <option value="HIGH">HIGH</option>
            <option value="MED">MED</option>
            <option value="LOW">LOW</option>
          </select>
        </dd>

        <dt className="text-gray-500 font-medium pt-1.5">조치 메모</dt>
        <dd>
          <input
            type="text"
            value={defect.action_note ?? ''}
            onChange={(e) => patch({ action_note: e.target.value })}
            placeholder="조치 사항..."
            className="w-full min-h-[40px] text-sm bg-white border border-gray-200 rounded-md px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </dd>
      </dl>

      {/* ── 푸터: verified 토글 + 삭제 (모바일 터치 44px+) ─────────── */}
      <footer className="flex items-center justify-between gap-2 px-3 py-2.5 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
        <button
          type="button"
          onClick={() => onToggleVerified?.(defect.id)}
          aria-pressed={!!defect.verified}
          className={[
            'flex-1 inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 rounded-lg text-xs font-bold border transition',
            defect.verified
              ? 'bg-green-600 text-white border-green-600 hover:bg-green-700'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-green-50 hover:text-green-700 hover:border-green-300',
          ].join(' ')}
        >
          <Check size={14} />
          {defect.verified ? '검증 완료' : '검증하기'}
        </button>
        <button
          type="button"
          onClick={() => onRemove?.(defect.id)}
          title="false positive — 삭제"
          aria-label="하자 제거"
          className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-3 rounded-lg text-xs font-bold bg-white text-gray-500 border border-gray-300 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition"
        >
          <Trash2 size={14} />
        </button>
      </footer>
    </article>
  )
}
