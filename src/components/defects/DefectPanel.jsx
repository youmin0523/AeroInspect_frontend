/**
 * components/defects/DefectPanel.jsx
 * 역할: 하자 탐지 목록 패널
 *       - DefectFilter 상단 배치 (심각도·영역 필터)
 *       - 필터링된 하자 목록을 스크롤 가능한 리스트로 표시
 *       - 실시간으로 새 하자가 상단에 추가됨
 *       - 총 건수 및 필터링 건수 표시
 *       - useDefects 훅으로 초기 데이터 로드
 */

import { Search } from 'lucide-react'
import useDefectStore from '../../store/defectStore.js'
import useDefects from '../../hooks/useDefects.js'
import DefectCard from './DefectCard.jsx'
import DefectFilter from './DefectFilter.jsx'

export default function DefectPanel() {
  // 초기 데이터 로드 (REST API)
  useDefects()

  const defects = useDefectStore((s) => s.defects)
  const filters = useDefectStore((s) => s.filters)
  const isLoading = useDefectStore((s) => s.isLoading)

  // 렌더링 시점에 필터 적용 (새 배열 생성 방지용 useMemo는 생략해도 무방하지만 안전을 위해 분리 참조)
  const filteredDefects = defects.filter((d) => {
    if (filters.severity && d.severity !== filters.severity) return false
    if (filters.area && d.area !== filters.area) return false
    if (filters.categoryCode && d.category_code !== filters.categoryCode) return false
    return true
  })
  const total = defects.length

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
        {isLoading && (
          <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {/* 필터 바 */}
      <div className="mb-3 flex-shrink-0">
        <DefectFilter />
      </div>

      {/* 하자 목록 */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
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
          </div>
        ) : (
          filteredDefects.map((defect) => (
            <DefectCard key={defect.id} defect={defect} />
          ))
        )}
      </div>
    </>
  )
}
