/**
 * components/defects/DefectPanel.jsx
 * 역할: 하자 탐지 목록 패널
 *       - DefectFilter 상단 배치 (심각도·영역 필터)
 *       - 필터링된 하자 목록을 스크롤 가능한 리스트로 표시
 *       - 실시간으로 새 하자가 상단에 추가됨
 *       - 총 건수 및 필터링 건수 표시
 *       - useDefects 훅으로 초기 데이터 로드
 */

import { useState } from 'react'
import { Search, FileSpreadsheet, RotateCcw } from 'lucide-react'
import useDefectStore from '../../store/defectStore.js'
import useDefects from '../../hooks/useDefects.js'
import DefectCard from './DefectCard.jsx'
import DefectFilter from './DefectFilter.jsx'
import ExcelPreviewModal from '../report/ExcelPreviewModal.jsx'
import { buildReportDefects } from '../../utils/buildReportDefects.js'

// 보고서/목록 정렬용 심각도 순위 (중대 → 경미). 같은 등급이면 검출 시점 순.
const SEVERITY_RANK = { HIGH: 0, MED: 1, LOW: 2 }

export default function DefectPanel() {
  // 초기 데이터 로드 (REST API)
  useDefects()

  const defects = useDefectStore((s) => s.defects)
  const filters = useDefectStore((s) => s.filters)
  const isLoading = useDefectStore((s) => s.isLoading)
  const clearFilters = useDefectStore((s) => s.clearFilters)
  // 활성 필터 여부 — 빈 상태에서 '필터 초기화' CTA 노출 판단.
  const hasActiveFilter = !!(filters.severity || filters.area || filters.categoryCode || filters.grade)

  // 양식 미리보기 모달 (보고서 작성하기 버튼 클릭 시에만 생성 — 자동 선행 생성 안 함)
  const [previewReport, setPreviewReport] = useState(null)

  // 렌더링 시점에 필터 적용 (새 배열 생성 방지용 useMemo는 생략해도 무방하지만 안전을 위해 분리 참조)
  const filteredDefects = defects
    .filter((d) => {
      if (filters.severity && d.severity !== filters.severity) return false
      if (filters.area && d.area !== filters.area) return false
      if (filters.categoryCode && d.category_code !== filters.categoryCode) return false
      return true
    })
    // 심각도 우선 정렬 — 영상 분석이 끝나 목록이 모이면 중대 하자가 위로 오게.
    .sort((a, b) => {
      const ra = SEVERITY_RANK[a.severity] ?? 9
      const rb = SEVERITY_RANK[b.severity] ?? 9
      if (ra !== rb) return ra - rb
      // 같은 등급: 영상 검출 시점(있으면) 오름차순으로 안정 정렬
      return (a.video_timestamp_sec ?? 0) - (b.video_timestamp_sec ?? 0)
    })
  const total = defects.length

  // 보고서 작성하기 — 클릭 시 검출(업로드+누적) 합쳐 양식 미리보기 모달을 연다.
  const handleCreateReport = () => {
    const reportDefects = buildReportDefects()
    if (!reportDefects.length) return
    setPreviewReport({ defects: reportDefects, narrative_content: '' })
  }

  return (
    <>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-300">
            하자 탐지 목록
          </h2>
          <span className="text-xs text-slate-500">
            {filteredDefects.length}/{total}건
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && (
            <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          )}
          {/* 검출이 있을 때만 노출 — 분석이 끝나 목록이 모이면 이 버튼으로 보고서 작성 */}
          {total > 0 && (
            <button
              type="button"
              onClick={handleCreateReport}
              title="탐지된 하자로 점검 보고서(양식 미리보기 → Excel/PDF) 작성"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-sm"
            >
              <FileSpreadsheet size={13} />
              보고서 작성하기
            </button>
          )}
        </div>
      </div>

      {/* 필터 바 */}
      <div className="mb-3 flex-shrink-0">
        <DefectFilter />
      </div>

      {/* 스크린리더용 실시간 안내 — 새 하자 검출 시 건수를 polite 로 읽어줌(시각 외 채널). */}
      <span className="sr-only" aria-live="polite">
        하자 {total}건 탐지됨{hasActiveFilter ? `, 필터 적용 ${filteredDefects.length}건 표시` : ''}
      </span>

      {/* 하자 목록 */}
      <div
        className="flex-1 overflow-y-auto space-y-2 pr-1"
        role="region"
        aria-label="하자 탐지 목록"
      >
        {filteredDefects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-500">
            <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center mb-3">
              <Search size={20} className="text-slate-500" />
            </div>
            <span className="text-sm text-slate-400 font-semibold">
              {total === 0 ? '탐지된 하자 없음' : '필터 조건에 맞는 하자 없음'}
            </span>
            <span className="text-xs text-slate-500 mt-1">
              {total === 0 ? '드론 스트림에서 수신 대기 중' : `전체 ${total}건 중 필터링 결과 0건`}
            </span>
            {/* 필터 때문에 0건이면 즉시 초기화할 수 있는 CTA — '왜 비었는지'와 '다음 행동'을 함께 제공. */}
            {total > 0 && hasActiveFilter && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-slate-200 border border-neutral-700 text-xs font-semibold transition"
              >
                <RotateCcw size={12} /> 필터 초기화
              </button>
            )}
          </div>
        ) : (
          filteredDefects.map((defect) => (
            <DefectCard key={defect.id} defect={defect} />
          ))
        )}
      </div>

      {/* 양식 미리보기 → Excel/PDF 다운로드 (보고서 작성하기 클릭 시에만) */}
      {previewReport && (
        <ExcelPreviewModal report={previewReport} onClose={() => setPreviewReport(null)} />
      )}
    </>
  )
}
