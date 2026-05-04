/**
 * components/defects/DefectCard.jsx
 * 역할: 하자 탐지 결과 카드 컴포넌트
 *       - 하자 유형명, 카테고리 코드, 심각도 뱃지 표시
 *       - 이미지 크롭 썸네일 (있을 경우)
 *       - 열화상 온도 (있을 경우)
 *       - 탐지 시각 및 신뢰도
 *       - 클릭 시 defectStore.selectDefect() 호출
 */

import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import SeverityBadge from './SeverityBadge.jsx'
import useDefectStore from '../../store/defectStore.js'
import { DEFECT_AREAS } from '../../constants/defectCategories.js'

export default function DefectCard({ defect }) {
  const selectDefect = useDefectStore((s) => s.selectDefect)
  const selectedDefect = useDefectStore((s) => s.selectedDefect)
  const isSelected = selectedDefect?.id === defect.id

  const areaInfo = DEFECT_AREAS[defect.area]

  // //* [Modified Code] 심각도별 border 색상 (레퍼런스 톤: red/amber/gray 강조)
  const severityBorder = {
    HIGH: 'border-red-500/30 hover:border-red-500/60',
    MED:  'border-amber-500/30 hover:border-amber-500/60',
    LOW:  'border-neutral-600 hover:border-neutral-500',
  }[defect.severity] ?? 'border-neutral-700 hover:border-neutral-500'

  return (
    <button
      onClick={() => selectDefect(isSelected ? null : defect)}
      className={`w-full text-left p-3 rounded-xl border bg-dashboard-panel shadow-lg transition-all group ${
        isSelected
          ? 'border-accent-500 bg-accent-500/5 shadow-accent-900/20'
          : severityBorder
      }`}
    >
      <div className="flex items-start gap-3">
        {/* 이미지 썸네일 */}
        {defect.image_crop ? (
          <img
            src={defect.image_crop}
            alt="하자 크롭"
            className="w-14 h-14 object-cover rounded-lg flex-shrink-0 border border-neutral-600 group-hover:border-neutral-500"
          />
        ) : (
          <div className="w-14 h-14 bg-neutral-700 rounded-lg flex-shrink-0 flex items-center justify-center text-slate-500 text-xs border border-neutral-600">
            없음
          </div>
        )}

        {/* 내용 */}
        <div className="flex-1 min-w-0">
          {/* 상단: 코드 + 심각도 */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-slate-400">{defect.category_code}</span>
            <SeverityBadge severity={defect.severity} />
            {areaInfo && (
              <span className="text-[10px] text-slate-500">{areaInfo.label}</span>
            )}
          </div>

          {/* 하자 유형명 */}
          <p className="text-sm text-white font-medium leading-tight truncate">
            {defect.defect_type}
          </p>

          {/* 하단: 신뢰도 + 온도 + 시각 */}
          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-500">
            <span>신뢰도 {(defect.confidence * 100).toFixed(0)}%</span>
            {defect.thermal_max && (
              <span>🌡️ {defect.thermal_max.toFixed(1)}°C</span>
            )}
            {defect.lidar_z && (
              <span>📡 z={defect.lidar_z.toFixed(1)}m</span>
            )}
            {defect.timestamp && (
              <span className="ml-auto">
                {format(new Date(defect.timestamp), 'HH:mm:ss', { locale: ko })}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
