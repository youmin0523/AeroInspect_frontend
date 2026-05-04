/**
 * store/reportsStore.js
 * 역할: 리포트 아카이브 상태 — reportsApi 래퍼 (Zustand, persist 없음)
 *
 *   persist 를 쓰지 않는 이유: 저장소 SoT(Source of Truth) 는 api/reportsApi.js 의 localStorage 키
 *   (그리고 향후 백엔드 DB). 이 store 는 그 데이터의 "메모리 캐시" 일 뿐. 앱 부팅 시 fetchAll 로 동기화.
 *
 *   백엔드 연결 시: reportsApi 만 교체하면 여기는 변경 없음.
 *
 *   defect 편집은 개별 리포트 인스턴스의 defects 배열을 통째 update 하는 단순 전략.
 *   (수정 후 전체 배열 patch → reportsApi.updateReport — REST 스타일 낙관적 업데이트)
 */

import { create } from 'zustand'
import {
  listReports,
  getReport,
  createReport,
  deleteReport,
} from '../api/reportsApi.js'

const useReportsStore = create((set, get) => ({
  // 메모리 캐시
  reports: [],
  loading: false,
  error: null,

  /** 전체 목록 동기화 — 앱 부팅 후 /employee/reports 진입 시 호출 */
  fetchAll: async () => {
    set({ loading: true, error: null })
    try {
      const reports = await listReports()
      set({ reports, loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  /** 단일 조회 — 상세 페이지 진입 시 최신 확보 */
  fetchOne: async (id) => {
    try {
      const report = await getReport(id)
      if (!report) return null
      // 캐시 갱신
      set((state) => {
        const exists = state.reports.some((r) => r.id === id)
        return {
          reports: exists
            ? state.reports.map((r) => (r.id === id ? report : r))
            : [...state.reports, report],
        }
      })
      return report
    } catch (err) {
      set({ error: err.message })
      return null
    }
  },

  /** 새 리포트 생성 — 현장 즉석 편집 완료 시 호출 */
  create: async (payload) => {
    const created = await createReport(payload)
    set((state) => ({ reports: [created, ...state.reports] }))
    return created
  },

  /** 로컬 캐시 업데이트 (백엔드 report 엔드포인트에는 PATCH 없음) */
  update: (id, patch) => {
    set((state) => ({
      reports: state.reports.map((r) =>
        r.id === id ? { ...r, ...patch } : r
      ),
    }))
  },

  /** 삭제 */
  remove: async (id) => {
    await deleteReport(id)
    set((state) => ({ reports: state.reports.filter((r) => r.id !== id) }))
  },

  /** 로컬 clear (초기화) */
  clear: () => set({ reports: [], error: null }),
}))

export default useReportsStore
