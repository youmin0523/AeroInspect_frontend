/**
 * smoothScroll.js
 * 역할: 지속시간을 제어 가능한 스무스 스크롤 유틸
 *       - 브라우저 기본 `scroll-smooth`는 속도 조절 불가 → rAF + easeInOutCubic로 직접 구현
 *       - 사용자가 휠/터치로 개입하면 즉시 중단(UX 존중)
 *       - prefers-reduced-motion 시 즉시 점프
 */

// easeOutQuart: t=0 초기 속도를 cubic보다 더 높게(파생값 4) → 클릭 즉시 "팍" 움직이는 체감
// 뒤로 갈수록 빠르게 감속하여 목적지에 부드럽게 정지
const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4)

export function smoothScrollTo(targetY, duration = 1100) {
  if (typeof window === 'undefined') return

  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    window.scrollTo(0, targetY)
    return
  }

  const startY = window.scrollY
  const distance = targetY - startY
  if (Math.abs(distance) < 2) return

  const startTime = performance.now()
  let cancelled = false

  // 사용자 개입 시 중단
  const cancel = () => {
    cancelled = true
  }
  window.addEventListener('wheel', cancel, { passive: true, once: true })
  window.addEventListener('touchstart', cancel, { passive: true, once: true })
  window.addEventListener('keydown', cancel, { once: true })

  function step(now) {
    if (cancelled) return cleanup()
    const t = Math.min((now - startTime) / duration, 1)
    window.scrollTo(0, startY + distance * easeOutQuart(t))
    if (t < 1) requestAnimationFrame(step)
    else cleanup()
  }

  function cleanup() {
    window.removeEventListener('wheel', cancel)
    window.removeEventListener('touchstart', cancel)
    window.removeEventListener('keydown', cancel)
  }

  requestAnimationFrame(step)
}

/**
 * 앵커 링크(#id) 클릭을 가로채 커스텀 스크롤 실행
 * @param {MouseEvent} event
 * @param {string} href  예: '#intro'
 * @param {number} headerOffset  sticky/fixed 헤더 높이 (px)
 * @param {number} duration       스크롤 지속 시간 (ms)
 */
export function handleAnchorClick(event, href, headerOffset = 96, duration = 1100) {
  if (!href?.startsWith('#')) return
  const id = href.slice(1)
  const el = document.getElementById(id)
  if (!el) return

  event.preventDefault()
  const targetY = el.getBoundingClientRect().top + window.scrollY - headerOffset
  smoothScrollTo(targetY, duration)

  // URL에 해시 반영 (히스토리 오염 없이)
  if (window.history?.replaceState) {
    window.history.replaceState(null, '', href)
  }
}
