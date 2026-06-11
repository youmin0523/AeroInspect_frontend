/**
 * components/dashboard/AutonomousMissionControl.jsx
 * 역할: 자율비행(Indoor Autonomous Inspection v1.1) 컨트롤 + 라이브 상태 패널
 *       - 버튼: START_AUTO / PAUSE / RTL / E-STOP (E-STOP 은 항상 활성, 빨강 강조)
 *       - VERIFICATION 결과: verdict / IoU / 차이영역 개수
 *       - 면적·커버리지 요약: 룸별 + 전체 + 분양면적 대비 비율
 *       - WS 로 실시간 갱신 (missionStore)
 */
import React, { useEffect, useMemo } from 'react'
import { Play, Pause, OctagonX, Home } from 'lucide-react'
import useMissionStore from '../../store/missionStore.js'
import useSessionStore from '../../store/sessionStore.js'
import { missionApi } from '../../api/missionApi.js'

const VERDICT_COLOR = {
  ok: 'text-emerald-400',
  marginal: 'text-amber-400',
  divergent: 'text-rose-400',
  no_prior_model: 'text-slate-400',
}

const PHASE_LABEL = {
  idle: '대기',
  arm: '시동',
  takeoff: '이륙',
  mapping: '예비 스캔',
  verification: '도면 정합 검증',
  path_plan: '경로 계획',
  coverage_fly: '비행 검사',
  room_transition: '공간 전환',
  complete: '완료',
  land: '착륙 중',
  failsafe: 'FAILSAFE',
}


export default function AutonomousMissionControl({ siteId }) {
  const phase = useMissionStore((s) => s.phase)
  const missionId = useMissionStore((s) => s.missionId)
  const fcAttached = useMissionStore((s) => s.fcAttached)
  const verification = useMissionStore((s) => s.verification)
  const areaSummary = useMissionStore((s) => s.areaSummary)
  const cellsByKey = useMissionStore((s) => s.cellsByKey)
  const applyState = useMissionStore((s) => s.applyState)
  const applyCoverageGrid = useMissionStore((s) => s.applyCoverageGrid)
  const applyAreaSummary = useMissionStore((s) => s.applyAreaSummary)

  // 마운트 시 현재 상태 폴링 (WS 끊겼다 살아난 직후 reconcile)
  useEffect(() => {
    let cancelled = false
    missionApi.state().then((s) => { if (!cancelled) applyState(s) }).catch(() => {})
    return () => { cancelled = true }
  }, [applyState])

  // PATH_PLAN 진입 시 coverage grid + summary 자동 조회 — 셀 매칭 시드
  useEffect(() => {
    if (!missionId) return
    if (!['path_plan', 'coverage_fly', 'room_transition', 'complete'].includes(phase)) return
    let cancelled = false
    missionApi.coverageGrid(missionId)
      .then((g) => { if (!cancelled) applyCoverageGrid(g) })
      .catch(() => {})
    missionApi.coverageSummary(missionId)
      .then((s) => { if (!cancelled && s?.summary) applyAreaSummary(s.summary) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [missionId, phase, applyCoverageGrid, applyAreaSummary])

  const liveCovered = useMemo(() => {
    const cells = Object.values(cellsByKey)
    const total = cells.length
    const captured = cells.filter((c) => c.captured).length
    return { captured, total, ratio: total ? captured / total : 0 }
  }, [cellsByKey])

  const isRunning = phase && phase !== 'idle' && phase !== 'complete' && phase !== 'failsafe'

  async function handleStart() {
    if (!siteId) return alert('현장이 선택되지 않았습니다.')
    try {
      await missionApi.start({ site_id: siteId })
      const s = await missionApi.state()
      applyState(s)
    } catch (e) {
      const detail = e?.response?.data?.detail || e?.message
      alert(`미션 시작 실패: ${detail}`)
    }
  }
  async function handlePause() {
    try { await missionApi.pause() } catch {}
  }
  async function handleRtl() {
    try { await missionApi.rtl() } catch {}
  }
  async function handleEstop() {
    if (!confirm('비상정지 — 즉시 착륙합니다. 진행하시겠습니까?')) return
    try { await missionApi.estop() } catch {}
  }

  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/85 backdrop-blur-sm shadow-lg p-3 text-slate-200 text-xs">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`inline-block w-2 h-2 rounded-full ${fcAttached ? 'bg-emerald-400' : 'bg-rose-500'}`} />
          <span className="font-bold tracking-wider uppercase">Autonomous Flight</span>
          <span className="font-mono text-slate-400">· {PHASE_LABEL[phase] || phase}</span>
        </div>
        <div className="flex gap-1">
          {!isRunning ? (
            <button onClick={handleStart}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-500 text-white font-bold hover:bg-emerald-400">
              <Play size={12}/> START
            </button>
          ) : (
            <button onClick={handlePause}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-amber-500 text-white font-bold hover:bg-amber-400">
              <Pause size={12}/> PAUSE
            </button>
          )}
          <button onClick={handleRtl}
            disabled={!isRunning}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-sky-600 text-white font-bold hover:bg-sky-500 disabled:opacity-40">
            <Home size={12}/> RTL
          </button>
          <button onClick={handleEstop}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-rose-600 text-white font-bold hover:bg-rose-500 ring-1 ring-rose-300/40">
            <OctagonX size={12}/> E-STOP
          </button>
        </div>
      </div>

      {/* VERIFICATION */}
      {verification && (
        <VerificationStrip v={verification} />
      )}

      {/* 면적 / 커버리지 */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        <Card label="라이브 커버리지">
          <span className="font-mono">
            {liveCovered.captured}/{liveCovered.total}
          </span>
          <span className="ml-2 text-slate-400">({(liveCovered.ratio * 100).toFixed(1)}%)</span>
        </Card>
        <Card label="검사 면적(SLAM)">
          {areaSummary ? (
            <span className="font-mono">{areaSummary.grand_area?.total_m2?.toFixed(1)} ㎡</span>
          ) : <span className="text-slate-500">-</span>}
        </Card>
        <Card label="분양면적 비율" full>
          {areaSummary?.supplied_coverage_ratio != null ? (
            <span className="font-mono">{(areaSummary.supplied_coverage_ratio * 100).toFixed(1)}%</span>
          ) : <span className="text-slate-500">-</span>}
        </Card>
      </div>

      {/* 면별 면적 디테일 */}
      {areaSummary?.grand_area && (
        <div className="mt-2 grid grid-cols-4 gap-1 text-[10px] text-slate-300">
          <FaceMini label="바닥" v={areaSummary.grand_area.floor_m2}/>
          <FaceMini label="천장" v={areaSummary.grand_area.ceiling_m2}/>
          <FaceMini label="벽"   v={areaSummary.grand_area.walls_m2}/>
          <FaceMini label="창호" v={areaSummary.grand_area.windows_m2}/>
        </div>
      )}
    </div>
  )
}

function Card({ label, children, full }) {
  return (
    <div className={`rounded-md border border-slate-700/60 bg-slate-800/60 p-2 ${full ? 'col-span-2' : ''}`}>
      <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">{label}</div>
      <div>{children}</div>
    </div>
  )
}

function FaceMini({ label, v }) {
  return (
    <div className="rounded border border-slate-700/40 bg-slate-800/40 p-1 flex flex-col items-center">
      <span className="text-slate-400">{label}</span>
      <span className="font-mono text-slate-200">{v != null ? v.toFixed(1) : '-'}</span>
    </div>
  )
}

function VerificationStrip({ v }) {
  const verdict = v.verdict || 'no_prior_model'
  const colorCls = VERDICT_COLOR[verdict] || 'text-slate-400'
  return (
    <div className="rounded-md border border-slate-700/60 bg-slate-800/60 p-2 flex items-center justify-between">
      <div>
        <div className="text-[10px] text-slate-400 uppercase tracking-wider">사전모델 정합</div>
        <div className={`font-bold uppercase ${colorCls}`}>{verdict}</div>
      </div>
      <div className="text-right text-[10px]">
        <div>IoU: <span className="font-mono">{(v.iou * 100).toFixed(1)}%</span></div>
        <div>차이영역: <span className="font-mono">{v.discrepancies?.length || 0}</span></div>
      </div>
    </div>
  )
}
