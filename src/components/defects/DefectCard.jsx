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
import { getGradeStyle, getGradeLabel, GRADE_DESCRIPTION } from '../../utils/gradeStyle.js'

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

function GradeBadge({ grade }) {
  if (!grade) return null
  const style = getGradeStyle(grade)
  const label = getGradeLabel(grade)
  const desc = GRADE_DESCRIPTION[grade] ?? ''
  return (
    <span
      className={`inline-flex items-center text-[10px] font-medium rounded px-1.5 py-0.5 ${style.badge}`}
      title={desc}
    >
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

  // border 우선순위: 선택 > 검수상태 > grade (R-v1.1.10) > severity
  // grade는 보고서 신뢰도 — 점검자가 한눈에 등재 여부 판단 가능해야 함
  const reviewBorder = REVIEW_BORDER[defect.review_status]
  const gradeBorder = defect.grade ? getGradeStyle(defect.grade).border : null
  const severityBorder = {
    HIGH: 'border-red-500/30 hover:border-red-500/60',
    MED:  'border-amber-500/30 hover:border-amber-500/60',
    LOW:  'border-neutral-600 hover:border-neutral-500',
  }[defect.severity] ?? 'border-neutral-700 hover:border-neutral-500'

  const borderClass = isSelected
    ? 'border-accent-500 bg-accent-500/5 shadow-accent-900/20'
    : (reviewBorder ?? gradeBorder ?? severityBorder)

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
          {/* 상단: 코드 + 등급 + 심각도 */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-mono text-slate-400">{defect.category_code}</span>
            <GradeBadge grade={defect.grade} />
            <SeverityBadge severity={defect.severity} />
            {areaInfo && (
              <span className="text-[10px] text-slate-500">{areaInfo.label}</span>
            )}
          </div>

          {/* 하자 유형명 */}
          <p className="text-sm text-white font-medium leading-tight truncate">
            {defect.defect_type}
          </p>

          {/* 하단: 신뢰도 + 등급 + 온도 + 시각 */}
          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-500 flex-wrap">
            <span>신뢰도 {(defect.confidence * 100).toFixed(0)}%</span>
            {/* 시간적 합의(4-3): 여러 키프레임 반복 검출 = 신뢰. 단발은 표기 안 함. */}
            {defect.temporal_count >= 2 && (
              <span
                title={`${defect.temporal_count}개 키프레임에서 반복 검출 — 신뢰도 높음`}
                className="px-1 rounded bg-cyan-500/15 text-cyan-300"
              >
                반복 {defect.temporal_count}회
              </span>
            )}
            {/* 근거 감사로그(4-4): 등급 — AI 합치 여부. 분쟁/검수 판단 보조. */}
            {defect.grade && (
              <span
                title={[
                  defect.onnx_conf != null && `ONNX ${(defect.onnx_conf * 100).toFixed(0)}%`,
                  defect.vlm_conf != null && `VLM ${(defect.vlm_conf * 100).toFixed(0)}%`,
                  defect.agreement && `합치: ${defect.agreement}`,
                ].filter(Boolean).join(' · ') || undefined}
                className={
                  defect.grade === 'CONFIRMED'
                    ? 'px-1 rounded bg-emerald-500/15 text-emerald-300'
                    : defect.grade === 'REVIEW'
                    ? 'px-1 rounded bg-amber-500/15 text-amber-300'
                    : 'px-1 rounded bg-slate-500/15 text-slate-400'
                }
              >
                {defect.grade === 'CONFIRMED' ? '확정' : defect.grade === 'REVIEW' ? '검토' : '참고'}
              </span>
            )}
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

          {/* 근거 감사로그(4-4): AI 판단 근거 — 분쟁 증거. 있을 때만, 전체는 hover(title)로. */}
          {defect.reasoning && (
            <p
              title={defect.reasoning}
              className="mt-1.5 text-[10px] leading-snug text-slate-400/90 italic line-clamp-2"
            >
              “{defect.reasoning}”
            </p>
          )}
        </div>
      </div>

      {/* 인라인 검수 액션 */}
      <DefectReviewActions defect={defect} />
    </div>
  )
}
