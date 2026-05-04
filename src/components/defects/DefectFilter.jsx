/**
 * components/defects/DefectFilter.jsx
 * 역할: 하자 목록 필터 바 컴포넌트
 *       - 심각도 필터 버튼 (전체 / HIGH / MED / LOW)
 *       - 영역 필터 선택 (A~E)
 *       - 필터 초기화 버튼
 *       - defectStore.setFilter() 호출
 */

import useDefectStore from '../../store/defectStore.js'
import { DEFECT_AREAS, SEVERITY_CONFIG } from '../../constants/defectCategories.js'

export default function DefectFilter() {
  const filters = useDefectStore((s) => s.filters)
  const setFilter = useDefectStore((s) => s.setFilter)
  const clearFilters = useDefectStore((s) => s.clearFilters)

  const hasActiveFilter = filters.severity || filters.area

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* 심각도 필터 */}
      <div className="flex items-center gap-1">
        <FilterBtn
          active={!filters.severity}
          onClick={() => setFilter('severity', null)}
          label="전체"
        />
        {Object.entries(SEVERITY_CONFIG).map(([key, cfg]) => (
          <FilterBtn
            key={key}
            active={filters.severity === key}
            onClick={() => setFilter('severity', filters.severity === key ? null : key)}
            label={key}
            color={cfg.color}
          />
        ))}
      </div>

      {/* 영역 필터 */}
      <div className="flex items-center gap-1">
        {Object.entries(DEFECT_AREAS).map(([area, info]) => (
          <FilterBtn
            key={area}
            active={filters.area === area}
            onClick={() => setFilter('area', filters.area === area ? null : area)}
            label={area}
            title={info.label}
          />
        ))}
      </div>

      {/* 초기화 */}
      {hasActiveFilter && (
        <button
          onClick={clearFilters}
          className="text-xs text-slate-500 hover:text-white transition-colors ml-1"
        >
          ✕ 초기화
        </button>
      )}
    </div>
  )
}

function FilterBtn({ active, onClick, label, color, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={active && color ? { borderColor: color, color } : undefined}
      className={`px-2 py-0.5 text-xs rounded border transition-all ${
        active
          ? 'bg-white/10 font-semibold'
          : 'border-dashboard-border text-slate-500 hover:text-white hover:border-neutral-500'
      }`}
    >
      {label}
    </button>
  )
}
