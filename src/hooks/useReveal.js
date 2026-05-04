/**
 * useReveal.js
 * 역할: IntersectionObserver 기반 "뷰포트 진입 시 1회 공개" 훅
 *       - 반환된 ref를 엘리먼트에 부착하면, 해당 엘리먼트가 뷰포트에 들어올 때 shown=true
 *       - 한 번 공개되면 다시 false로 돌아가지 않음 (re-trigger 없음)
 */

import { useEffect, useRef, useState } from 'react'

export default function useReveal({ threshold = 0.15, rootMargin = '0px 0px -10% 0px' } = {}) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // prefers-reduced-motion 존중: 즉시 공개
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setShown(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true)
            observer.disconnect()
            break
          }
        }
      },
      { threshold, rootMargin },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, rootMargin])

  return { ref, shown }
}
