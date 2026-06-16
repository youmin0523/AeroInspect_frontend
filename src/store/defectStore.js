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
 *
 *   //* [Modified Code v2] (2026-05-27) 인라인 검수(R-v1.1.x) 통합 —
 *     - applyReviewedDefect: REST PATCH 또는 WS "defect.reviewed" 수신 시 호출 (id 매칭으로 idempotent 갱신)
 *     - lastManualSelectAt: 사용자가 수동으로 카드를 선택한 시각(ms) — 신규 detection 자동 선택이 검수 흐름을
 *       끊지 않도록 30초 TTL 보호. addDefect 가 자동 selectDefect 호출 전 검사.
 *     - getReviewStatusCounts: 검수 상태별(pending/approved/rejected/flagged_false_positive) 카운트 selector.
 */

import { create } from 'zustand'

const MAX_DEFECTS = 500  // 메모리 보호용 최대 보관 건수
const AUTO_SELECT_TTL_MS = 30_000  // 수동 선택 후 30초간은 신규 detection 자동 선택 금지

const useDefectStore = create((set, get) => ({
  // ── 상태 ────────────────────────────────
  defects: [],
  filters: {
    severity: null,   // 'HIGH' | 'MED' | 'LOW' | null (전체)
    area: null,       // 'A' | 'B' | 'C' | 'D' | 'E' | null
    categoryCode: null,
    grade: null,      // R-v1.1.17: 'CONFIRMED' | 'REVIEW' | 'REFERENCE' | null (전체)
  },
  inspectorMode: false,  // R-v1.1.17: 점검자 모드 토글 — REFERENCE 노출 여부
  selectedDefect: null,
  isLoading: false,

  // TEST MODE 게이트
  testMediaReady: false,
  pendingTestDefects: [],

  // 자동 영상↔하자 동기 보호용 (수동 선택 TTL)
  lastManualSelectAt: 0,

  // ── Actions ─────────────────────────────

  /**
   * 새 하자 추가 (WS 실시간 이벤트 수신 시).
   * 같은 id 중복 push 방지(dev StrictMode + WS 재연결로 인한 중복 수신 차단).
   *
   *   //* [Modified Code v2] 자동 영상↔하자 동기: 새 detection 도착 시
   *     사용자가 마지막 30초 내 수동 선택한 카드가 없으면 selectedDefect 도 함께 갱신.
   *     검수 도중 새 하자가 들어와도 흐름이 끊기지 않도록 TTL 보호.
   */
  addDefect: (defect, autoSelect = true) =>
    set((state) => {
      if (defect?.id && state.defects.some((d) => d.id === defect.id)) {
        return state
      }
      const updated = [defect, ...state.defects].slice(0, MAX_DEFECTS)

      // autoSelect=false: 영상 reveal 등 — 목록에만 추가하고 selectedDefect 는 건드리지 않는다.
      // (자동선택이 일어나면 카드클릭→영상 seek 동작이 매 검출마다 오발동해 재생이 멈춤)
      if (!autoSelect) return { defects: updated }

      // 자동 선택 판정: 마지막 수동 선택이 30초 이상 지났거나 아예 없을 때만
      const now = Date.now()
      const manualProtected =
        state.selectedDefect &&
        state.lastManualSelectAt > 0 &&
        now - state.lastManualSelectAt < AUTO_SELECT_TTL_MS

      const nextSelected = manualProtected ? state.selectedDefect : defect

      return { defects: updated, selectedDefect: nextSelected }
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

  /** 모든 필터 초기화 (grade 포함 — DefectFilter 리셋/빈상태 CTA 가 grade 까지 비우도록) */
  clearFilters: () =>
    set({ filters: { severity: null, area: null, categoryCode: null, grade: null } }),

  /**
   * 하자 선택 (상세 뷰 표시).
   *   //* [Modified Code v2] 사용자 클릭 == "수동 선택" 으로 간주하여 TTL 갱신.
   *   `manual=false` 로 호출하면(예: WS 자동) TTL 갱신 안 함.
   */
  selectDefect: (defect, manual = true) =>
    set({
      selectedDefect: defect,
      ...(manual ? { lastManualSelectAt: defect ? Date.now() : 0 } : {}),
    }),

  /** 선택 해제 */
  clearSelection: () => set({ selectedDefect: null, lastManualSelectAt: 0 }),

  /**
   * 검수 결과 반영 — REST `reviewDefect()` 응답 또는 WS "defect.reviewed" 수신 시 호출.
   * 같은 id 의 store entry 를 patch 한다(없으면 무시 — 다른 세션의 이벤트일 수 있음).
   * 동일 reviewed_at 으로 두 번 호출돼도 결과 동일(idempotent).
   */
  applyReviewedDefect: (reviewed) =>
    set((state) => {
      if (!reviewed?.id) return state
      let touched = false
      const defects = state.defects.map((d) => {
        if (d.id !== reviewed.id) return d
        touched = true
        // 서버가 보낸 review_* / reviewed_* 필드만 머지(기존 image_crop 등은 보존)
        return {
          ...d,
          review_status: reviewed.review_status ?? d.review_status,
          review_note: reviewed.review_note ?? d.review_note,
          reviewed_at: reviewed.reviewed_at ?? d.reviewed_at,
          reviewed_by_user_id: reviewed.reviewed_by_user_id ?? d.reviewed_by_user_id,
          // backend 가 verified 별도 컬럼을 유지한다면 그것도 동기화
          verified: reviewed.verified ?? (reviewed.review_status === 'approved'),
        }
      })
      if (!touched) return state
      const nextSelected =
        state.selectedDefect?.id === reviewed.id
          ? defects.find((d) => d.id === reviewed.id) ?? state.selectedDefect
          : state.selectedDefect
      return { defects, selectedDefect: nextSelected }
    }),

  /** 전체 초기화 */
  reset: () =>
    set({
      defects: [],
      filters: { severity: null, area: null, categoryCode: null, grade: null },
      inspectorMode: false,
      selectedDefect: null,
      testMediaReady: false,
      pendingTestDefects: [],
      lastManualSelectAt: 0,
    }),

  /** 점검자 모드 토글 — REFERENCE 등급 노출 여부 (R-v1.1.17) */
  toggleInspectorMode: () =>
    set((state) => ({ inspectorMode: !state.inspectorMode })),

  // ── Selectors ───────────────────────────

  /** 필터 적용된 하자 목록 — R-v1.1.17 grade + inspectorMode 적용 */
  getFilteredDefects: () => {
    const { defects, filters, inspectorMode } = get()
    return defects.filter((d) => {
      if (filters.severity && d.severity !== filters.severity) return false
      if (filters.area && d.area !== filters.area) return false
      if (filters.categoryCode && d.category_code !== filters.categoryCode) return false
      // grade 필터 (CONFIRMED/REVIEW/REFERENCE)
      if (filters.grade && d.grade !== filters.grade) return false
      // 점검자 모드 OFF면 REFERENCE 등급 자동 숨김 (사용자 명시 검색 시 통과)
      if (!inspectorMode && !filters.grade && d.grade === 'REFERENCE') return false
      return true
    })
  },

  /** 등급별 카운트 (R-v1.1.17) — DefectPanel/통계용 */
  getGradeCounts: () => {
    const { defects } = get()
    return defects.reduce(
      (acc, d) => {
        const g = d.grade || 'REVIEW'
        if (acc[g] !== undefined) acc[g] += 1
        return acc
      },
      { CONFIRMED: 0, REVIEW: 0, REFERENCE: 0 }
    )
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

  /**
   * 검수 상태별 카운트 — DefectPanel 통계/뱃지용.
   * review_status 미지정 카드는 pending 으로 카운트한다.
   */
  getReviewStatusCounts: () => {
    const { defects } = get()
    return defects.reduce(
      (acc, d) => {
        const status = d.review_status || 'pending'
        acc[status] = (acc[status] || 0) + 1
        return acc
      },
      { pending: 0, approved: 0, rejected: 0, flagged_false_positive: 0 }
    )
  },
}))

export default useDefectStore
