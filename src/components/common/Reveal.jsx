/**
 * Reveal.jsx
 * 역할: 스크롤 진입 시 children을 페이드업 공개하는 래퍼 컴포넌트
 *       - 내부적으로 useReveal 훅 사용
 *       - delay prop으로 스태거(stagger) 효과 연출 가능
 */

import useReveal from '../../hooks/useReveal.js'

export default function Reveal({ children, delay = 0, className = '' }) {
  const { ref, shown } = useReveal()

  return (
    <div
      ref={ref}
      style={{ transitionDelay: shown ? `${delay}ms` : '0ms' }}
      className={`transition-all duration-700 ease-out ${
        shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      } ${className}`}
    >
      {children}
    </div>
  )
}
