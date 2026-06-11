/**
 * ToastContainer.jsx
 * 역할: toastStore 의 토스트를 화면 우하단에 렌더. App 루트에 1회 마운트.
 */

import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'
import useToastStore from '../../store/toastStore.js'

const STYLES = {
  success: { icon: CheckCircle2, ring: 'border-emerald-400/40', accent: 'text-emerald-400' },
  error: { icon: AlertTriangle, ring: 'border-red-400/40', accent: 'text-red-400' },
  info: { icon: Info, ring: 'border-sky-400/40', accent: 'text-sky-400' },
}

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => {
        const { icon: Icon, ring, accent } = STYLES[t.type] || STYLES.info
        return (
          <div
            key={t.id}
            role="status"
            className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${ring} bg-neutral-900/95 text-white shadow-xl backdrop-blur animate-[fadeIn_.15s_ease-out]`}
          >
            <Icon size={18} className={`mt-0.5 shrink-0 ${accent}`} />
            <p className="text-sm leading-snug flex-1 break-keep">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="text-white/50 hover:text-white transition shrink-0"
              aria-label="닫기"
            >
              <X size={16} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
