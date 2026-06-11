/**
 * toastStore.js
 * 역할: 전역 토스트 알림 (Zustand) — 외부 라이브러리 없이 경량 구현.
 *       성공/실패/정보 메시지를 화면 우하단에 잠깐 띄우고 자동 소멸.
 *       사용: import { toast } from '../store/toastStore'  →  toast.error('...')
 */

import { create } from 'zustand'

let _id = 0

const useToastStore = create((set, get) => ({
  toasts: [],

  push: (message, type = 'info', durationMs = 4000) => {
    const id = ++_id
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    if (durationMs > 0) {
      setTimeout(() => get().dismiss(id), durationMs)
    }
    return id
  },

  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

// 컴포넌트 밖(스토어/이벤트 핸들러)에서도 호출 가능한 간편 헬퍼.
export const toast = {
  success: (msg, ms) => useToastStore.getState().push(msg, 'success', ms),
  error: (msg, ms) => useToastStore.getState().push(msg, 'error', ms ?? 6000),
  info: (msg, ms) => useToastStore.getState().push(msg, 'info', ms),
}

export default useToastStore
