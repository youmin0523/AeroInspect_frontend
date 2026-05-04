/**
 * components/analytics/WeeklyReport.jsx
 * 역할: 주간업무보고서 — 월요일 오전 팀 회의용 (PT 품질)
 *
 *   섹션 구성 (대기업 주간업무보고 양식 기준):
 *     1. 보고서 헤더 (주차, 일자, 보고자)
 *     2. 금주 핵심 요약 (AI 3줄 요약)
 *     3. 주간 KPI (성과 지표)
 *     4. 전주 실적 (계획 vs 실적 대비표)
 *     5. 금주 계획 (업무항목/담당자/기한/우선순위)
 *     6. 현안 및 리스크 (신호등 체계)
 */

import {
  CheckCircle2, XCircle, Clock, AlertTriangle,
  Target, FileText, Bug, BarChart3,
  ChevronRight, CircleDot,
} from 'lucide-react'
import {
  getWeekRange, getLastWeekRange,
  LAST_WEEK_TASKS, THIS_WEEK_TASKS, ISSUES, WEEKLY_KPI,
  AI_WEEKLY_COMMENTARY,
} from '../../data/mockTrendData.js'

/* ── 유틸 ─────────────────────────────────── */

const thisWeek = getWeekRange()
const lastWeek = getLastWeekRange()

function getWeekNumber() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const diff = now - start
  return Math.ceil((diff / 86400000 + start.getDay() + 1) / 7)
}

const PRIORITY_STYLE = {
  P1: 'bg-red-100 text-red-700',
  P2: 'bg-amber-100 text-amber-700',
  P3: 'bg-slate-100 text-slate-600',
}

const SIGNAL = {
  red:    { bg: 'bg-red-500',    ring: 'ring-red-200',    label: '위험',   labelStyle: 'bg-red-100 text-red-700' },
  yellow: { bg: 'bg-amber-400',  ring: 'ring-amber-200',  label: '주의',   labelStyle: 'bg-amber-100 text-amber-700' },
  green:  { bg: 'bg-emerald-500', ring: 'ring-emerald-200', label: '정상', labelStyle: 'bg-emerald-100 text-emerald-700' },
}

/* ── 섹션 헤더 ────────────────────────────── */

function SectionHeader({ number, title, rightSlot }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white text-sm font-bold">{number}</div>
        <h3 className="text-lg font-bold text-slate-800">{title}</h3>
      </div>
      {rightSlot}
    </div>
  )
}

/* ── KPI 링 ─────────────────────────────── */

function KpiRing({ value, label, unit, icon: Icon, color }) {
  const colors = {
    indigo:  { ring: 'text-indigo-500', bg: 'bg-indigo-50',  text: 'text-indigo-700' },
    emerald: { ring: 'text-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
    amber:   { ring: 'text-amber-500',  bg: 'bg-amber-50',   text: 'text-amber-700' },
    red:     { ring: 'text-red-500',    bg: 'bg-red-50',     text: 'text-red-700' },
    sky:     { ring: 'text-sky-500',    bg: 'bg-sky-50',     text: 'text-sky-700' },
  }[color]

  return (
    <div className={`${colors.bg} rounded-xl p-5 ring-1 ring-gray-100 text-center`}>
      <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center mx-auto mb-3 ${colors.text}`}>
        <Icon size={20} />
      </div>
      <p className={`text-3xl font-extrabold ${colors.text}`}>{value}<span className="text-sm font-normal ml-0.5">{unit}</span></p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  )
}

/* ── 메인 컴포넌트 ────────────────────────── */

export default function WeeklyReport() {
  const doneTasks = LAST_WEEK_TASKS.filter((t) => t.done).length
  const totalPlanned = LAST_WEEK_TASKS.filter((t) => t.planned).length

  return (
    <div className="space-y-10">

      {/* ═══ 보고서 헤더 ═══ */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-700 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(135deg, transparent 25%, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.1) 50%, transparent 50%, transparent 75%, rgba(255,255,255,0.1) 75%)', backgroundSize: '20px 20px' }} />
        <div className="relative">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <p className="text-teal-200 text-xs font-semibold tracking-widest uppercase mb-1">Weekly Status Report</p>
              <h2 className="text-2xl font-bold">주간업무보고서</h2>
              <p className="text-teal-100 text-sm mt-1">{new Date().getFullYear()}년 제{getWeekNumber()}주</p>
            </div>
            <div className="text-right text-sm space-y-1">
              <p><span className="text-teal-200">보고 일자</span> <span className="font-semibold">{new Date().toLocaleDateString('ko-KR')}</span></p>
              <p><span className="text-teal-200">보고 대상</span> <span className="font-semibold">금주: {thisWeek.label}</span></p>
              <p><span className="text-teal-200">전주 실적</span> <span className="font-semibold">{lastWeek.label}</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ 1. 핵심 요약 (AI) ═══ */}
      <section>
        <SectionHeader number="1" title="금주 핵심 요약" />
        <div className="bg-teal-50 rounded-xl ring-1 ring-teal-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <CircleDot size={16} className="text-teal-600" />
            <span className="text-xs font-bold text-teal-700 tracking-wider uppercase">AI Summary</span>
            <span className="ml-auto px-2 py-0.5 rounded text-[10px] font-bold bg-teal-200 text-teal-800">MOCK</span>
          </div>
          {AI_WEEKLY_COMMENTARY.split('\n').filter(Boolean).map((line, i) => {
            if (line.startsWith('### ')) return null
            if (line.match(/^\d\./)) {
              const parts = line.split('**')
              if (parts.length >= 3) {
                return (
                  <div key={i} className="flex items-start gap-2 my-2">
                    <ChevronRight size={14} className="text-teal-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-slate-700"><strong className="text-slate-800">{parts[1]}</strong>{parts[2]}</p>
                  </div>
                )
              }
            }
            return null
          })}
        </div>
      </section>

      {/* ═══ 2. 주간 KPI ═══ */}
      <section>
        <SectionHeader number="2" title="주간 성과 지표" rightSlot={<span className="text-xs text-gray-400">전주 기준</span>} />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiRing value={WEEKLY_KPI.planCompletion} unit="%" label="계획 달성률" icon={Target} color="indigo" />
          <KpiRing value={WEEKLY_KPI.inspectionCount} unit="건" label="점검 수행" icon={BarChart3} color="sky" />
          <KpiRing value={WEEKLY_KPI.defectsFound} unit="건" label="하자 발견" icon={Bug} color="amber" />
          <KpiRing value={WEEKLY_KPI.reportsPublished} unit="건" label="보고서 발행" icon={FileText} color="emerald" />
          <KpiRing value={WEEKLY_KPI.openIssues} unit="건" label="미결 현안" icon={AlertTriangle} color="red" />
        </div>
      </section>

      {/* ═══ 3. 전주 실적 ═══ */}
      <section>
        <SectionHeader
          number="3"
          title="전주 실적"
          rightSlot={
            <div className="flex items-center gap-3 text-xs">
              <span className="text-gray-400">{lastWeek.label}</span>
              <span className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold">
                달성 {doneTasks}/{totalPlanned}건 ({Math.round(doneTasks / totalPlanned * 100)}%)
              </span>
            </div>
          }
        />
        <div className="bg-white rounded-xl ring-1 ring-gray-100 overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 tracking-wider uppercase">현장</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 tracking-wider uppercase">업무 내용</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 tracking-wider uppercase hidden md:table-cell">담당자</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 tracking-wider uppercase">계획</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 tracking-wider uppercase">실적</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 tracking-wider uppercase hidden lg:table-cell">비고</th>
              </tr>
            </thead>
            <tbody>
              {LAST_WEEK_TASKS.map((t) => (
                <tr key={t.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium text-slate-800 truncate max-w-[200px]">{t.site}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm text-slate-700">{t.task}</p>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <span className="text-sm text-gray-600">{t.assignee}</span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {t.planned ? <CheckCircle2 size={16} className="text-blue-500 mx-auto" /> : <span className="text-xs text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {t.done
                      ? <CheckCircle2 size={16} className="text-emerald-500 mx-auto" />
                      : <XCircle size={16} className="text-red-400 mx-auto" />
                    }
                  </td>
                  <td className="px-4 py-3.5 hidden lg:table-cell">
                    <p className={`text-xs ${t.done ? 'text-gray-500' : 'text-red-500 font-semibold'}`}>{t.note}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ═══ 4. 금주 계획 ═══ */}
      <section>
        <SectionHeader number="4" title="금주 계획" rightSlot={<span className="text-xs text-gray-400">{thisWeek.label}</span>} />
        <div className="bg-white rounded-xl ring-1 ring-gray-100 overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-400 tracking-wider uppercase w-16">우선순위</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 tracking-wider uppercase">현장</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 tracking-wider uppercase">업무 내용</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 tracking-wider uppercase hidden md:table-cell">담당자</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 tracking-wider uppercase hidden md:table-cell">목표일</th>
              </tr>
            </thead>
            <tbody>
              {THIS_WEEK_TASKS.map((t) => (
                <tr key={t.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-3 py-3.5 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${PRIORITY_STYLE[t.priority]}`}>
                      {t.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm font-medium text-slate-800 truncate max-w-[200px]">{t.site}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm text-slate-700">{t.task}</p>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <span className={`text-sm ${t.assignee === '미정' ? 'text-red-500 font-semibold' : 'text-gray-600'}`}>{t.assignee}</span>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <span className="text-sm text-gray-500">{t.targetDate}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ═══ 5. 현안 및 리스크 ═══ */}
      <section>
        <SectionHeader number="5" title="현안 및 리스크" />
        <div className="space-y-3">
          {ISSUES.map((issue) => {
            const sig = SIGNAL[issue.level]
            return (
              <div key={issue.id} className="bg-white rounded-xl ring-1 ring-gray-100 p-5 flex items-start gap-4">
                {/* 신호등 */}
                <div className={`w-4 h-4 rounded-full ${sig.bg} ring-4 ${sig.ring} flex-shrink-0 mt-1`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h5 className="text-sm font-bold text-slate-800">{issue.title}</h5>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${sig.labelStyle}`}>{sig.label}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{issue.desc}</p>
                  <div className="flex items-start gap-1.5">
                    <ChevronRight size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-500"><span className="font-semibold text-gray-600">대응:</span> {issue.action}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── 푸터 ── */}
      <div className="text-center text-[11px] text-gray-400 pt-4 border-t border-gray-100">
        본 보고서는 AeroInspect AI 시스템 데이터 기반으로 자동 구성되었습니다. 실제 LLM 요약은 백엔드 연동 후 활성화됩니다.
      </div>
    </div>
  )
}
