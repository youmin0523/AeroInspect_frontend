/**
 * store/gpuStatusStore.js
 * 역할: 검출이 안 뜰 때 'GPU 추론 서버 꺼짐'을 사용자에게 알리기 위한 경량 상태 스토어.
 *       - AdminGpu 와 동일한 엔드포인트 `/api/v1/admin/gpu/status` 를 공유(직원 권한으로 조회 가능).
 *       - 토큰 자동첨부 + 401 refresh 가 걸린 apiClient 사용.
 *
 *   ⚠️ 안전 원칙(기존 동작 불변):
 *     - 조회 실패(403 권한없음 / 네트워크)면 status 를 건드리지 않음 → 경고를 띄우지 않음.
 *     - 한 번도 정상 조회되지 않았으면(fetchedOk=false) 어떤 컴포넌트도 'GPU 꺼짐'을 단정하지 않는다.
 *     - 폴링/조회는 호출하는 쪽(GpuStatusNotice)이 필요할 때만 트리거 — 상시 비용 0.
 */

import { create } from 'zustand'
import { apiClient } from '../api/authApi'

// 과금/추론 불가 상태 — 이때 검출이 안 뜨는 게 정상이므로 사용자에게 안내.
export const GPU_OFF_STATES = new Set(['TERMINATED', 'SUSPENDED'])
// 켜지는/꺼지는 중 — 잠시 기다리면 됨을 안내.
export const GPU_TRANSITION_STATES = new Set(['STAGING', 'PROVISIONING', 'STOPPING', 'SUSPENDING'])

const useGpuStatusStore = create((set, get) => ({
  status: null,       // 'RUNNING' | 'TERMINATED' | 'STAGING' | ... | null(미조회/실패)
  loading: false,
  fetchedOk: false,   // 한 번이라도 정상 조회됐는지 — false면 경고 표시 금지

  /** GPU 상태 1회 조회. 실패는 조용히 무시(기존 UX 불변). */
  fetchStatus: async () => {
    if (get().loading) return
    set({ loading: true })
    try {
      const res = await apiClient.get('/api/v1/admin/gpu/status')
      set({ status: res.data?.status ?? null, fetchedOk: true, loading: false })
    } catch {
      // 권한 없음/네트워크 실패 — status 유지(직전 정상값) + 경고 금지.
      set({ loading: false })
    }
  },
}))

export default useGpuStatusStore
