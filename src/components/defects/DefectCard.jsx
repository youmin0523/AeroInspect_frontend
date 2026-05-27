/**
 * components/defects/DefectCard.jsx
 * 역할: 하자 탐지 결과 카드 컴포넌트
 *       - 하자 유형명, 카테고리 코드, 심각도 뱃지 표시
 *       - 이미지 크롭 썸네일 (있을 경우)
 *       - 열화상 온도 (있을 경우)
 *       - 탐지 시각 및 신뢰도
 *       - 클릭 시 defectStore.selectDefect() 호출
 *
 *   //* [Modified Code v2] (2026-05-27) R-v1.1.x 인라인 검수 통합:
 *     - review_status 별 border 강조 (pending=회색, approved=초록, rejected=빨강, flagged=주황)
 *     - detection_model_id 뱃지 (작은 칩 + tooltip)
 *     - GPS 좌표 짧은 표시 (lat/lon)
 *     - 카드 하단에 DefectReviewActions 인라인 액션 영역
 *     - 액션 영역 클릭은 selectDefect 로 전파되지 않도록 stopPropagation
 */

import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Cpu, MapPin } from 'lucide-react'
import SeverityBadge from './SeverityBadge.jsx'
import DefectReviewActions from './DefectReviewActions.jsx'
import useDefectStore from '../../store/defectStore.js'
import { DEFECT_AREAS } from '../../constants/defectCategories.js'

// review_status 별 border (severity 보다 우선 — 검수 진행 상태가 시각 1순위)
const REVIEW_BORDER = {
  approved: 'border-emerald-500/40 hover:border-emerald-500/70',
  rejected: 'border-rose-500/40 hover:border-rose-500/70',
  flagged_false_positive: 'border-amber-500/40 hover:border-amber-500/70',
}

// detection_model_id → 라벨 (라벨 매핑 누락 시 원본 id 그대로 노출)
const MODEL_LABEL = {
  M1_YOLO: 'M1 · 표면',
  M2_THERMAL: 'M2 · 단열',
  M3_CRACK: 'M3 · 균열',
  M4_CONTEXT: 'M4 · 영역',
  M5_FURNITURE: 'M5 · 가구',
}

function ModelBadge({ modelId }) {
  if (!modelId) return null
  const label = MODEL_LABEL[modelId] ?? modelId
  return (
    <span
      className="inline-flex items-center gap-1 text-[9px] font-mono text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 rounded px-1 py-0.5"
      title={`검출 모델: ${modelId}`}
    >
      <Cpu size={9} />
      {label}
    </span>
  )
}

function GpsBadge({ lat, lon }) {
  if (typeof lat !== 'number' || typeof lon !== 'number') return null
  const latLabel = `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? 'N' : 'S'}`
  const lonLabel = `${Math.abs(lon).toFixed(4)}°${lon >= 0 ? 'E' : 'W'}`
  return (
    <span
      className="inline-flex items-center gap-1 text-[9px] font-mono text-sky-300 bg-sky-500/10 border border-sky-500/30 rounded px-1 py-0.5"
      title={`GPS: ${lat}, ${lon}`}
    >
      <MapPin size={9} />
      {latLabel}, {lonLabel}
    </span>
  )
}

export default function DefectCard({ defect }) {
  const selectDefect = useDefectStore((s) => s.selectDefect)
  const selectedDefect = useDefectStore((s) => s.selectedDefect)
  const isSelected = selectedDefect?.id === defect.id

  const areaInfo = DEFECT_AREAS[defect.area]

  // //* [Modified Code v2] review_status border > severity border 순으로 fallback
  const reviewBorder = REVIEW_BORDER[defect.review_status]
  const severityBorder = {
    HIGH: 'border-red-500/30 hover:border-red-500/60',
    MED:  'border-amber-500/30 hover:border-amber-500/60',
    LOW:  'border-neutral-600 hover:border-neutral-500',
  }[defect.severity] ?? 'border-neutral-700 hover:border-neutral-500'

  const borderClass = isSelected
    ? 'border-accent-500 bg-accent-500/5 shadow-accent-900/20'
    : (reviewBorder ?? severityBorder)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => selectDefect(isSelected ? null : defect)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          selectDefect(isSelected ? null : defect)
        }
      }}
      className={`w-full text-left p-3 rounded-xl border bg-dashboard-panel shadow-lg transition-all group cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-500/60 ${borderClass}`}
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
          <div className="flex items-center gap-2 mb-1 flex-wrap">
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
          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-500 flex-wrap">
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

          {/* 모델 출처 + GPS 뱃지 (있을 때만 노출) */}
          {(defect.detection_model_id || (defect.gps_lat != null && defect.gps_lon != null)) && (
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <ModelBadge modelId={defect.detection_model_id} />
              <GpsBadge lat={defect.gps_lat} lon={defect.gps_lon} />
            </div>
          )}
        </div>
      </div>

      {/* 인라인 검수 액션 */}
      <DefectReviewActions defect={defect} />
    </div>
  )
}
