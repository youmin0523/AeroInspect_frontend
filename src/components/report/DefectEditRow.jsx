/**
 * components/report/DefectEditRow.jsx
 * 역할: 리포트 편집 테이블의 한 행 — 이미지 썸네일 + 영역(read-only chip) + 장소(editable) + 공종 + 심각도 + 조치 메모 + 검증·삭제
 *
 *   //* [Modified Code v2] (2026-04-16) area 와 location 분리 — area 는 읽기 전용 chip 으로 소형화,
 *     location 은 datalist 프리셋 + 자유 입력 가능한 text input 으로 변경.
 */

import { Check, Trash2, Image as ImageIcon, User } from 'lucide-react'
import TradeSelect from './TradeSelect.jsx'
import { DEFECT_AREAS } from '../../constants/defectCategories.js'

const SEVERITY_STYLE = {
  HIGH: 'bg-red-50 text-red-700 border-red-200',
  MED:  'bg-orange-50 text-orange-700 border-orange-200',
  LOW:  'bg-yellow-50 text-yellow-700 border-yellow-200',
}

export default function DefectEditRow({
  defect,
  aiSuggestedTrade,
  presetsListId = 'location-presets',
  onChange,
  onRemove,
  onToggleVerified,
}) {
  const patch = (p) => onChange?.({ id: defect.id, patch: p })
  const sevClass = SEVERITY_STYLE[defect.severity] ?? 'bg-gray-100 text-gray-700 border-gray-200'
  const areaInfo = DEFECT_AREAS[defect.area]
  const areaColor = areaInfo?.color ?? '#64748b'

  return (
    <tr className={`border-b border-gray-100 ${defect.verified ? 'bg-green-50/30' : 'bg-white'} hover:bg-blue-50/40 transition`}>
      {/* 이미지 썸네일 (근경 + 원경) */}
      <td className="px-2 py-2">
        <div className="flex gap-1">
          {defect.image_crop ? (
            <img src={defect.image_crop} alt="근경" title="근경" className="w-12 h-12 object-cover rounded border border-gray-200 shadow-sm" />
          ) : (
            <div className="w-12 h-12 rounded border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400 text-[9px]">근</div>
          )}
          {defect.image_wide ? (
            <img src={defect.image_wide} alt="원경" title="원경" className="w-12 h-12 object-cover rounded border border-gray-200 shadow-sm" />
          ) : (
            <div className="w-12 h-12 rounded border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400 text-[9px]">원</div>
          )}
        </div>
      </td>

      {/* 하자 유형 + 영역 chip + 카테고리 + 수동추가 뱃지 */}
      <td className="px-2 py-2 min-w-[220px]">
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className="text-sm font-semibold text-slate-800 truncate break-keep">
            {defect.defect_type ?? defect.category_code ?? '-'}
          </p>
          {defect.is_manual && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded px-1 py-0.5">
              <User size={9} /> 수동
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {/* 영역 chip — 읽기 전용, 색상 구분 */}
          {defect.area && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-mono font-bold rounded px-1.5 py-0.5 text-white"
              style={{ backgroundColor: areaColor }}
              title={areaInfo?.label}
            >
              {defect.area}
            </span>
          )}
          <span className="text-[10px] font-mono text-gray-400 truncate">
            {defect.category_code || 'MANUAL'} · conf {Math.round((Number(defect.confidence) || 0) * 100)}%
          </span>
        </div>
      </td>

      {/* 공종 */}
      <td className="px-2 py-2">
        <TradeSelect
          value={defect.trade}
          suggested={aiSuggestedTrade}
          onChange={(v) => patch({ trade: v, trade_confidence: 1.0 })}
        />
      </td>

      {/* 장소 (editable + datalist 프리셋) */}
      <td className="px-2 py-2 min-w-[120px]">
        <input
          type="text"
          list={presetsListId}
          value={defect.location ?? ''}
          onChange={(e) => patch({ location: e.target.value })}
          placeholder="장소"
          className="w-full text-xs bg-white border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </td>

      {/* 심각도 */}
      <td className="px-2 py-2">
        <select
          value={defect.severity ?? 'MED'}
          onChange={(e) => patch({ severity: e.target.value })}
          className={`text-xs rounded border px-1.5 py-1 font-bold ${sevClass} focus:outline-none focus:ring-2 focus:ring-blue-400`}
        >
          <option value="HIGH">HIGH</option>
          <option value="MED">MED</option>
          <option value="LOW">LOW</option>
        </select>
      </td>

      {/* 조치 메모 */}
      <td className="px-2 py-2 min-w-[180px]">
        <input
          type="text"
          value={defect.action_note ?? ''}
          onChange={(e) => patch({ action_note: e.target.value })}
          placeholder="조치 사항..."
          className="w-full text-xs bg-white border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </td>

      {/* 액션: 검증 토글 / 삭제 */}
      <td className="px-2 py-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onToggleVerified?.(defect.id)}
            title={defect.verified ? '검증 취소' : '검증 완료'}
            className={`p-1.5 rounded border transition ${
              defect.verified
                ? 'bg-green-600 text-white border-green-600 hover:bg-green-700'
                : 'bg-white text-gray-400 border-gray-300 hover:bg-gray-50 hover:text-green-700'
            }`}
          >
            <Check size={12} />
          </button>
          <button
            type="button"
            onClick={() => onRemove?.(defect.id)}
            title="false positive — 삭제"
            className="p-1.5 rounded border border-gray-300 text-gray-400 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </td>
    </tr>
  )
}

export { DEFECT_AREAS }
