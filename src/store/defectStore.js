/**
 * store/defectStore.js
 * 역할: 하자 탐지 데이터 전역 상태 관리 (Zustand)
 *       - defects: 탐지된 하자 목록 (최근 500건 유지)
 *       - filters: 심각도·영역·카테고리 필터 상태
 *       - selectedDefect: 선택된 하자 (사이드패널 상세 표시용)
 *       - addDefect: WebSocket "defect.new" 이벤트 수신 시 호출
 *       - filteredDefects: 필터 적용된 하자 목록 (파생 selector)
 */

import { create } from 'zustand'

const MAX_DEFECTS = 500  // 메모리 보호용 최대 보관 건수

const useDefectStore = create((set, get) => ({
  // ── 상태 ────────────────────────────────
  defects: [],
  filters: {
    severity: null,   // 'HIGH' | 'MED' | 'LOW' | null (전체)
    area: null,       // 'A' | 'B' | 'C' | 'D' | 'E' | null
    categoryCode: null,
  },
  selectedDefect: null,
  isLoading: false,

  // ── Actions ─────────────────────────────

  /** 새 하자 추가 (WS 실시간 이벤트 수신 시) */
  addDefect: (defect) =>
    set((state) => {
      const updated = [defect, ...state.defects]
      // 최대 건수 초과 시 오래된 항목 제거
      return { defects: updated.slice(0, MAX_DEFECTS) }
    }),

  /** 하자 목록 전체 교체 (초기 REST 조회 시) */
  setDefects: (defects) => set({ defects }),

  /** 로딩 상태 토글 */
  setLoading: (isLoading) => set({ isLoading }),

  /** 필터 변경 */
  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),

  /** 모든 필터 초기화 */
  clearFilters: () =>
    set({ filters: { severity: null, area: null, categoryCode: null } }),

  /** 하자 선택 (상세 뷰 표시) */
  selectDefect: (defect) => set({ selectedDefect: defect }),

  /** 선택 해제 */
  clearSelection: () => set({ selectedDefect: null }),

  /** 전체 초기화 */
  reset: () =>
    set({
      defects: [],
      filters: { severity: null, area: null, categoryCode: null },
      selectedDefect: null,
    }),

  // ── Selectors ───────────────────────────

  /** 필터 적용된 하자 목록 */
  getFilteredDefects: () => {
    const { defects, filters } = get()
    return defects.filter((d) => {
      if (filters.severity && d.severity !== filters.severity) return false
      if (filters.area && d.area !== filters.area) return false
      if (filters.categoryCode && d.category_code !== filters.categoryCode) return false
      return true
    })
  },

  /** 심각도별 카운트 */
  getSeverityCounts: () => {
    const { defects } = get()
    return defects.reduce(
      (acc, d) => {
        acc[d.severity] = (acc[d.severity] || 0) + 1
        return acc
      },
      { HIGH: 0, MED: 0, LOW: 0 }
    )
  },
}))

export default useDefectStore
