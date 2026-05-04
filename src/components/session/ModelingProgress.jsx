/**
 * components/session/ModelingProgress.jsx
 * 역할: 모델링 진행 상황 시각화 — 프로그레스 바 + 현재 스테이지 텍스트
 *       - sessionStore 의 modelProgress / modelStage 구독
 *       - 모델링 완료(status='ready') 시 onComplete 콜백 1회 발화
 *       - lightMode: 라이트 테마 세션 페이지용
 */

import { useEffect } from 'react'
import useSessionStore from '../../store/sessionStore.js'

export default function ModelingProgress({ onComplete, lightMode }) {
  const progress = useSessionStore((s) => s.modelProgress)
  const stage = useSessionStore((s) => s.modelStage)
  const status = useSessionStore((s) => s.modelStatus)

  useEffect(() => {
    if (status === 'ready') onComplete?.()
  }, [status, onComplete])

  return (
    <div className="w-full flex flex-col gap-3">
      {/* 스테이지 라벨 */}
      <div className="flex items-center justify-between text-xs">
        <span className={lightMode ? 'text-gray-600' : 'text-slate-300'}>{stage || '준비 중...'}</span>
        <span className={`font-mono tabular-nums ${lightMode ? 'text-accent-600' : 'text-accent-300'}`}>{progress}%</span>
      </div>

      {/* 프로그레스 바 */}
      <div className={`w-full h-2 rounded-full overflow-hidden ${lightMode ? 'bg-gray-200' : 'bg-neutral-800'}`}>
        <div
          className="h-full bg-accent-500 transition-[width] duration-200 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 하단 상태 */}
      <div className={`text-xs ${lightMode ? 'text-gray-500' : 'text-slate-500'}`}>
        {status === 'ready' ? '완료 — 대시보드 이동 대기' : status === 'modeling' ? '진행 중' : '대기'}
      </div>
    </div>
  )
}
