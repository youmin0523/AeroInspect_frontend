/**
 * CaseSlideshow.jsx
 * 역할: 도입 사례 카드 상단의 크로스페이드 슬라이드쇼
 *       - 이미지 배열을 받아 일정 간격으로 자동 전환
 *       - 하단 미니 점 인디케이터 제공
 *       - 이미지가 없으면 placeholder 텍스트 렌더
 */

import { useCallback, useEffect, useRef, useState } from 'react'

export default function CaseSlideshow({ images, placeholder, interval = 4000, startDelay = 0 }) {
  const [index, setIndex] = useState(0)
  const timerRef = useRef(null)
  const cancelledRef = useRef(false)

  const scheduleNext = useCallback(() => {
    const jitter = interval * (0.7 + Math.random() * 0.6)
    timerRef.current = setTimeout(() => {
      if (cancelledRef.current) return
      setIndex((prev) => (prev + 1) % images.length)
      scheduleNext()
    }, jitter)
  }, [images, interval])

  // 도트 클릭 시 해당 이미지로 즉시 이동 + 타이머 리셋
  const goTo = useCallback((i) => {
    clearTimeout(timerRef.current)
    setIndex(i)
    scheduleNext()
  }, [scheduleNext])

  useEffect(() => {
    if (!images || images.length <= 1) return
    cancelledRef.current = false

    const startTimerId = setTimeout(() => {
      if (cancelledRef.current) return
      setIndex((prev) => (prev + 1) % images.length)
      scheduleNext()
    }, startDelay + interval)

    return () => {
      cancelledRef.current = true
      clearTimeout(startTimerId)
      clearTimeout(timerRef.current)
    }
  }, [images, interval, startDelay, scheduleNext])

  if (!images || images.length === 0) {
    return (
      <div className="h-48 bg-slate-200 flex items-center justify-center text-gray-500 group-hover:bg-slate-300 transition">
        {placeholder}
      </div>
    )
  }

  return (
    <div className="relative h-48 overflow-hidden bg-slate-900">
      {images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
            i === index ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}

      {images.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`이미지 ${i + 1}`}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all duration-500 cursor-pointer hover:bg-white/80 ${
                i === index ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
