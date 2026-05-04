/**
 * components/analytics/TrendReport.jsx
 * 역할: 경향보고서 — 하자 경향 분석 리포트 (PT/납품용 품질)
 *
 *   섹션 구성 (대기업 경향분석 보고서 양식 기준):
 *     1. 보고서 개요 + 핵심 KPI
 *     2. 월별 하자 발생 추이 (꺾은선)
 *     3. 하자 유형별 분류 (수평 막대 — 파레토)
 *     4. 심각도 분포 (도넛) + 조치 현황 (도넛)
 *     5. 시행사별 하자 패턴 (스택 막대)
 *     6. 대표 하자 사례
 *     7. AI 종합 분석 및 권고사항
 */

import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Shield, Thermometer, Camera, FileWarning,
} from 'lucide-react'
import {
  MONTHLY_TREND, DEFECT_BY_CATEGORY, SEVERITY_DIST, ACTION_STATUS,
  BUILDER_PATTERN, SAMPLE_DEFECTS, AI_TREND_COMMENTARY,
  AREA_LABELS, AREA_COLORS,
} from '../../data/mockTrendData.js'

/* ── 유틸 ─────────────────────────────────── */

const SEV_BADGE = {
  HIGH: 'bg-red-100 text-red-700',
  MED:  'bg-orange-100 text-orange-700',
  LOW:  'bg-yellow-100 text-yellow-700',
}

const CUSTOM_TOOLTIP = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-lg shadow-lg ring-1 ring-gray-200 px-4 py-3 text-xs">
      <p className="font-bold text-slate-700 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

/* ── 섹션 헤더 ────────────────────────────── */

function SectionHeader({ number, title, subtitle }) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0 text-white text-sm font-bold">{number}</div>
      <div>
        <h3 className="text-lg font-bold text-slate-800">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

/* ── 메인 컴포넌트 ────────────────────────── */

export default function TrendReport() {
  const totalDefects = MONTHLY_TREND.reduce((s, m) => s + m.total, 0)
  const latestMonth = MONTHLY_TREND[MONTHLY_TREND.length - 1]
  const prevMonth = MONTHLY_TREND[MONTHLY_TREND.length - 2]
  const momChange = ((latestMonth.total - prevMonth.total) / prevMonth.total * 100).toFixed(1)
  const momPositive = latestMonth.total >= prevMonth.total

  return (
    <div className="space-y-10">

      {/* ═══ 1. 보고서 개요 + KPI ═══ */}
      <section>
        <SectionHeader number="1" title="보고서 개요" subtitle={`분석 기간: ${MONTHLY_TREND[0].month} ~ ${latestMonth.month} (${MONTHLY_TREND.length}개월)`} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: '총 하자 건수', value: totalDefects, unit: '건', icon: FileWarning, color: 'indigo', sub: `${MONTHLY_TREND.length}개월 누적` },
            { label: '전월 대비', value: `${momPositive ? '+' : ''}${momChange}%`, icon: momPositive ? TrendingUp : TrendingDown, color: momPositive ? 'red' : 'emerald', sub: `${prevMonth.total}건 → ${latestMonth.total}건` },
            { label: 'HIGH 비율', value: `${SEVERITY_DIST[2].pct}%`, icon: AlertTriangle, color: 'red', sub: `${SEVERITY_DIST[2].value}건` },
            { label: '조치 완료율', value: `${ACTION_STATUS[0].pct}%`, icon: CheckCircle2, color: 'emerald', sub: `${ACTION_STATUS[0].value}건 완료` },
          ].map((kpi) => {
            const Icon = kpi.icon
            const colors = {
              indigo:  'bg-indigo-50 text-indigo-600 ring-indigo-100',
              red:     'bg-red-50 text-red-600 ring-red-100',
              emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
            }[kpi.color]
            return (
              <div key={kpi.label} className={`rounded-xl p-5 ring-1 ${colors}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon size={18} />
                  <span className="text-xs font-semibold tracking-wide">{kpi.label}</span>
                </div>
                <p className="text-3xl font-extrabold">{kpi.value}{kpi.unit && <span className="text-base font-normal ml-1">{kpi.unit}</span>}</p>
                <p className="text-[11px] mt-1 opacity-70">{kpi.sub}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* ═══ 2. 월별 추이 ═══ */}
      <section>
        <SectionHeader number="2" title="월별 하자 발생 추이" subtitle="심각도별 분류 — 최근 6개월 트렌드" />
        <div className="bg-white rounded-xl ring-1 ring-gray-100 p-6">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={MONTHLY_TREND} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <Tooltip content={CUSTOM_TOOLTIP} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="total" name="전체" stroke="#334155" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="HIGH" name="중대" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 2" />
              <Line type="monotone" dataKey="MED" name="보통" stroke="#f97316" strokeWidth={1.5} strokeDasharray="4 2" />
              <Line type="monotone" dataKey="LOW" name="경미" stroke="#eab308" strokeWidth={1.5} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ═══ 3. 하자 유형별 분류 (파레토) ═══ */}
      <section>
        <SectionHeader number="3" title="하자 유형별 분류" subtitle="상위 10개 하자 유형 — 파레토 분석" />
        <div className="bg-white rounded-xl ring-1 ring-gray-100 p-6">
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={DEFECT_BY_CATEGORY} layout="vertical" margin={{ top: 5, right: 40, bottom: 5, left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#475569' }} width={95} />
              <Tooltip content={CUSTOM_TOOLTIP} />
              <Bar dataKey="count" name="건수" radius={[0, 6, 6, 0]} barSize={20}>
                {DEFECT_BY_CATEGORY.map((d) => (
                  <Cell key={d.code} fill={AREA_COLORS[d.area]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-4 mt-4 justify-center">
            {Object.entries(AREA_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: AREA_COLORS[key] }} />
                {key}. {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 4. 심각도 분포 + 조치 현황 ═══ */}
      <section>
        <SectionHeader number="4" title="심각도 분포 및 조치 현황" />
        <div className="grid md:grid-cols-2 gap-6">
          {/* 심각도 */}
          <div className="bg-white rounded-xl ring-1 ring-gray-100 p-6">
            <h4 className="text-sm font-bold text-slate-700 mb-4">심각도 분포</h4>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={SEVERITY_DIST} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                  {SEVERITY_DIST.map((s) => <Cell key={s.name} fill={s.color} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [`${v}건`, n]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-5 mt-2">
              {SEVERITY_DIST.map((s) => (
                <div key={s.name} className="text-center">
                  <div className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.name}
                  </div>
                  <p className="text-lg font-bold text-slate-800 mt-1">{s.value}<span className="text-xs font-normal text-gray-400 ml-0.5">건</span></p>
                  <p className="text-[11px] text-gray-400">{s.pct}%</p>
                </div>
              ))}
            </div>
          </div>
          {/* 조치 현황 */}
          <div className="bg-white rounded-xl ring-1 ring-gray-100 p-6">
            <h4 className="text-sm font-bold text-slate-700 mb-4">시정조치 현황</h4>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={ACTION_STATUS} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                  {ACTION_STATUS.map((s) => <Cell key={s.name} fill={s.color} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [`${v}건`, n]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-5 mt-2">
              {ACTION_STATUS.map((s) => (
                <div key={s.name} className="text-center">
                  <div className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.name}
                  </div>
                  <p className="text-lg font-bold text-slate-800 mt-1">{s.value}<span className="text-xs font-normal text-gray-400 ml-0.5">건</span></p>
                  <p className="text-[11px] text-gray-400">{s.pct}%</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 5. 시행사별 하자 패턴 ═══ */}
      <section>
        <SectionHeader number="5" title="시행사(발주처)별 하자 패턴" subtitle="영역별 하자 분포 비교 — 동일 기간 기준" />
        <div className="bg-white rounded-xl ring-1 ring-gray-100 p-6">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={BUILDER_PATTERN} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="builder" tick={{ fontSize: 12, fill: '#475569' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip content={CUSTOM_TOOLTIP} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {Object.entries(AREA_LABELS).map(([key, label]) => (
                <Bar key={key} dataKey={key} name={`${key}. ${label}`} stackId="a" fill={AREA_COLORS[key]} radius={key === 'E' ? [4, 4, 0, 0] : undefined} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ═══ 6. 대표 하자 사례 ═══ */}
      <section>
        <SectionHeader number="6" title="대표 하자 사례" subtitle="자체 드론 촬영·검출 이미지 기반 — 카테고리별 주요 사례" />
        <div className="grid md:grid-cols-2 gap-4">
          {SAMPLE_DEFECTS.map((d) => (
            <div key={d.id} className="bg-white rounded-xl ring-1 ring-gray-100 overflow-hidden">
              {/* 이미지 플레이스홀더 */}
              <div className="h-36 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                <div className="text-center">
                  <Camera size={28} className="text-slate-400 mx-auto mb-1" strokeWidth={1.5} />
                  <p className="text-[10px] text-slate-400">자체 검출 이미지</p>
                </div>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${SEV_BADGE[d.severity]}`}>{d.severity}</span>
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600">{d.category}</span>
                  <span className="text-xs text-gray-400 ml-auto">{d.date}</span>
                </div>
                <h5 className="text-sm font-bold text-slate-800">{d.name}</h5>
                <p className="text-xs text-gray-500">{d.site} · {d.location}</p>
                <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 rounded-lg px-3 py-2">{d.description}</p>
                <p className="text-[11px] text-gray-400">AI 신뢰도: {(d.confidence * 100).toFixed(0)}%</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ 7. AI 종합 분석 및 권고사항 ═══ */}
      <section>
        <SectionHeader number="7" title="AI 종합 분석 및 권고사항" subtitle="Claude AI 기반 자동 생성 — 데이터 기반 경향 분석 코멘트" />
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl ring-1 ring-indigo-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Shield size={14} className="text-white" />
            </div>
            <span className="text-xs font-bold text-indigo-700 tracking-wider uppercase">AI Analysis</span>
            <span className="ml-auto px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-200 text-indigo-800">MOCK</span>
          </div>
          <div className="prose prose-sm prose-slate max-w-none text-sm leading-relaxed">
            {AI_TREND_COMMENTARY.split('\n').map((line, i) => {
              if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-bold text-slate-800 mt-4 mb-2">{line.slice(3)}</h2>
              if (line.startsWith('### ')) return <h3 key={i} className="text-base font-bold text-slate-700 mt-4 mb-1">{line.slice(4)}</h3>
              if (line.startsWith('- **')) {
                const parts = line.slice(2).split('**')
                return <p key={i} className="text-sm text-slate-700 ml-4 my-1">&#8226; <strong>{parts[1]}</strong>{parts[2]}</p>
              }
              if (line.match(/^\d\. /)) {
                const parts = line.split('**')
                if (parts.length > 1) return <p key={i} className="text-sm text-slate-700 ml-4 my-1">{parts[0]}<strong>{parts[1]}</strong>{parts[2]}</p>
                return <p key={i} className="text-sm text-slate-700 ml-4 my-1">{line}</p>
              }
              if (line.trim() === '') return null
              return <p key={i} className="text-sm text-slate-600 my-1">{line}</p>
            })}
          </div>
        </div>
      </section>

      {/* ── 푸터 ── */}
      <div className="text-center text-[11px] text-gray-400 pt-4 border-t border-gray-100">
        본 보고서는 AeroInspect AI 시스템에 의해 자동 생성되었습니다. 실제 LLM 분석은 백엔드 연동 후 활성화됩니다.
      </div>
    </div>
  )
}
