/**
 * components/dev/PerfTimerWidget.jsx
 * 역할: 화면 우하단 성능 측정 위젯.
 *       - perfTimer.js의 측정 결과를 실시간 표시 (login, upload, render 등)
 *       - 개발자 + 사용자 모두 본인 환경의 체감 속도 즉시 확인
 *       - 활성화 조건: ?perf=1 query param OR localStorage.perfWidget='1'
 *         (운영 환경에 박혀 있어도 일반 사용자엔 안 보임)
 *       - 노션 동기화용 스크린샷 캡처 시 ?perf=1로 켜고 측정값 그대로 첨부 가능
 */

import { useEffect, useState } from 'react'
import { PERF_EVENT, perfRecords, perfClear } from '../../utils/perfTimer'

function isEnabled() {
  if (typeof window === 'undefined') return false
  const urlEnabled = new URLSearchParams(window.location.search).get('perf') === '1'
  let lsEnabled = false
  try { lsEnabled = window.localStorage.getItem('perfWidget') === '1' } catch { /* ignore */ }
  return urlEnabled || lsEnabled
}

function tagFor(duration) {
  if (duration < 200) return { emoji: '⚡', color: 'text-emerald-400' }
  if (duration < 500) return { emoji: '✓', color: 'text-green-400' }
  if (duration < 1500) return { emoji: '⏳', color: 'text-yellow-400' }
  return { emoji: '🐢', color: 'text-red-400' }
}

export default function PerfTimerWidget() {
  const [enabled] = useState(isEnabled)
  const [records, setRecords] = useState(() => (enabled ? perfRecords() : []))
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (!enabled) return
    const onRecord = () => setRecords(perfRecords())
    window.addEventListener(PERF_EVENT, onRecord)
    return () => window.removeEventListener(PERF_EVENT, onRecord)
  }, [enabled])

  if (!enabled) return null

  // 가장 최근 10건만 표시
  const display = [...records].reverse().slice(0, 10)

  return (
    <div className="fixed bottom-4 left-4 z-[9999] pointer-events-auto select-text">
      <div className="bg-neutral-900/95 border border-emerald-500/40 rounded-lg shadow-2xl text-white text-[11px] font-mono backdrop-blur-sm">
        <div
          className="flex items-center justify-between gap-3 px-3 py-1.5 border-b border-neutral-700 cursor-pointer hover:bg-neutral-800"
          onClick={() => setCollapsed((c) => !c)}
        >
          <span className="text-emerald-300 font-bold tracking-wider">
            ⏱ PERF TIMER {collapsed ? '+' : '−'}
          </span>
          <span className="text-slate-400">{records.length}건</span>
          {!collapsed && records.length > 0 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); perfClear() }}
              className="text-slate-500 hover:text-red-400"
              title="측정 기록 초기화"
            >
              clear
            </button>
          )}
        </div>
        {!collapsed && (
          <div className="px-3 py-2 max-h-[260px] overflow-y-auto min-w-[260px]">
            {display.length === 0 ? (
              <div className="text-slate-500 italic">측정 대기 중...</div>
            ) : (
              <table className="w-full">
                <tbody>
                  {display.map((r, i) => {
                    const { emoji, color } = tagFor(r.duration)
                    return (
                      <tr key={`${r.timestamp}-${i}`} className="border-b border-neutral-800 last:border-0">
                        <td className="py-0.5 pr-2">{emoji}</td>
                        <td className="py-0.5 pr-3 text-slate-200 truncate max-w-[140px]">{r.label}</td>
                        <td className={`py-0.5 text-right tabular-nums font-bold ${color}`}>
                          {r.duration}ms
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
