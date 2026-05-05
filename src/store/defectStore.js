/**
 * store/defectStore.js
 * 역할: 하자 탐지 데이터 전역 상태 관리 (Zustand)
 *       - defects: 탐지된 하자 목록 (최근 500건 유지)
 *       - filters: 심각도·영역·카테고리 필터 상태
 *       - selectedDefect: 선택된 하자 (사이드패널 상세 표시용)
 *       - addDefect: WebSocket "defect.new" 이벤트 수신 시 호출
 *       - filteredDefects: 필터 적용된 하자 목록 (파생 selector)
 *
 *       TEST MODE 미디어-검출 동기화:
 *       - testMediaReady: RGB 메인 피드의 첫 프레임이 onLoad 됐는지
 *       - pendingTestDefects: 첫 프레임 도착 전에 받은 detection 큐
 *       - 게이트 OPEN 시 큐를 defects 끝(하단)으로 append → 신규 detection은
 *         정상대로 unshift(상단)되어 "현재 검출이 제일 위, 큐 잔존이 그 아래" 성립
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

  // TEST MODE 게이트
  testMediaReady: false,
  pendingTestDefects: [],

  // ── Actions ─────────────────────────────

  /** 새 하자 추가 (WS 실시간 이벤트 수신 시). 같은 id 중복 push 방지(dev StrictMode + WS 재연결로 인한 중복 수신 차단). */
  addDefect: (defect) =>
    set((state) => {
      if (defect?.id && state.defects.some((d) => d.id === defect.id)) {
        return state
      }
      const updated = [defect, ...state.defects]
      return { defects: updated.slice(0, MAX_DEFECTS) }
    }),

  /** TEST MODE에서 첫 프레임이 아직 화면에 뜨지 않았을 때 detection을 큐에 보관 */
  queueTestDefect: (defect) =>
    set((state) => {
      if (state.pendingTestDefects.some((d) => d.id === defect.id)) return state
      return {
        pendingTestDefects: [...state.pendingTestDefects, defect].slice(-MAX_DEFECTS),
      }
    }),

  /** RGB 메인 피드의 첫 프레임 onLoad 시 호출. 큐를 defects 하단에 일괄 append. */
  markTestMediaReady: () => {
    const s = get()
    if (s.testMediaReady) return
    set((st) => {
      if (st.pendingTestDefects.length === 0) {
        return { testMediaReady: true }
      }
      return {
        defects: [...st.defects, ...st.pendingTestDefects].slice(0, MAX_DEFECTS),
        pendingTestDefects: [],
        testMediaReady: true,
      }
    })
  },

  /** TEST 시작/정지/소스 전환 시 게이트 닫고 큐 폐기 */
  resetTestGate: () =>
    set({ testMediaReady: false, pendingTestDefects: [] }),

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
      testMediaReady: false,
      pendingTestDefects: [],
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
