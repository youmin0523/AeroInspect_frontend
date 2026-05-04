/**
 * components/dashboard/MissionControl.jsx
 * 역할: TopBar 중앙 비행 시작/종료 토글 버튼
 *       - droneStore.missionStatus 기반:
 *         'idle'   → "START MISSION" (emerald)
 *         'flying' → "END MISSION + 경과 시간" (red)
 *         'ended'  → "MISSION ENDED" (slate, disabled 표시)
 *       - 경과 시간은 missionStartedAt 기반 1초 틱
 *       - 종료 클릭 → droneStore.endMission() + 부모가 /dashboard/report 로 자동 네비게이트
 */

import { useEffect, useState } from 'react'
import { Play, Square, CheckCircle2 } from 'lucide-react'
import useDroneStore from '../../store/droneStore.js'

function formatElapsed(ms) {
  if (!ms || ms < 0) return '00:00'
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export default function MissionControl({ onEnd }) {
  const missionStatus = useDroneStore((s) => s.missionStatus)
  const missionStartedAt = useDroneStore((s) => s.missionStartedAt)
  const missionEndedAt = useDroneStore((s) => s.missionEndedAt)
  const startMission = useDroneStore((s) => s.startMission)
  const endMission = useDroneStore((s) => s.endMission)

  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (missionStatus !== 'flying') return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [missionStatus])

  if (missionStatus === 'idle') {
    return (
      <button
        type="button"
        onClick={startMission}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white font-bold text-xs shadow-md hover:bg-emerald-400 transition"
      >
        <Play size={12} /> Start Mission
      </button>
    )
  }

  if (missionStatus === 'flying') {
    const elapsed = missionStartedAt ? now - missionStartedAt : 0
    return (
      <button
        type="button"
        onClick={() => {
          endMission()
          onEnd?.()
        }}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white font-bold text-xs tracking-wider uppercase shadow-lg hover:bg-red-400 transition"
      >
        <Square size={12} /> End Mission
        <span className="font-mono tabular-nums text-white/90 ml-1">{formatElapsed(elapsed)}</span>
      </button>
    )
  }

  // ended
  const duration = missionStartedAt && missionEndedAt ? missionEndedAt - missionStartedAt : 0
  return (
    <button
      type="button"
      onClick={() => onEnd?.()}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-700 text-slate-300 font-bold text-xs tracking-wider uppercase shadow-lg cursor-default"
      title="비행 종료 — 리포트 확인"
    >
      <CheckCircle2 size={12} className="text-accent-400" /> Mission Ended
      <span className="font-mono tabular-nums text-slate-400 ml-1">{formatElapsed(duration)}</span>
    </button>
  )
}
