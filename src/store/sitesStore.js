/**
 * store/sitesStore.js
 * 역할: 현장 관리 상태 — sitesApi 래퍼 (Zustand, persist 없음)
 *
 *   persist 를 쓰지 않는 이유: 저장소 SoT(Source of Truth) 는 api/sitesApi.js 의 localStorage 키
 *   (그리고 향후 백엔드 DB). 이 store 는 그 데이터의 "메모리 캐시" 일 뿐.
 *
 *   백엔드 연결 시: sitesApi 만 교체하면 여기는 변경 없음.
 */

import { create } from 'zustand'
import {
  listSites,
  getSite,
  createSite,
  updateSite,
  deleteSite,
} from '../api/sitesApi.js'

const useSitesStore = create((set) => ({
  sites: [],
  loading: false,
  error: null,

  /** 전체 목록 동기화 — /employee/sites 진입 시 호출 */
  fetchAll: async () => {
    set({ loading: true, error: null })
    try {
      const sites = await listSites()
      set({ sites, loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  /** 단일 조회 — 상세 페이지 진입 시 최신 확보 */
  fetchOne: async (id) => {
    try {
      const site = await getSite(id)
      if (!site) return null
      set((state) => {
        const exists = state.sites.some((s) => s.id === id)
        return {
          sites: exists
            ? state.sites.map((s) => (s.id === id ? site : s))
            : [...state.sites, site],
        }
      })
      return site
    } catch (err) {
      set({ error: err.message })
      return null
    }
  },

  /** 새 현장 등록 */
  create: async (payload) => {
    const created = await createSite(payload)
    set((state) => ({ sites: [created, ...state.sites] }))
    return created
  },

  /** 부분 업데이트 */
  update: async (id, patch) => {
    const updated = await updateSite(id, patch)
    set((state) => ({
      sites: state.sites.map((s) => (s.id === id ? updated : s)),
    }))
    return updated
  },

  /** 삭제 */
  remove: async (id) => {
    await deleteSite(id)
    set((state) => ({ sites: state.sites.filter((s) => s.id !== id) }))
  },

  /** 로컬 clear (초기화) */
  clear: () => set({ sites: [], error: null }),
}))

export default useSitesStore
