/**
 * pages/employee/Analytics.jsx
 * 역할: `/employee/analytics` — 분석·보고서 허브
 *       - 탭 1: 경향보고서 (TrendReport)
 *       - 탭 2: 주간업무보고서 (WeeklyReport)
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, TrendingUp, CalendarDays, Printer } from 'lucide-react'
import TrendReport from '../../components/analytics/TrendReport.jsx'
import WeeklyReport from '../../components/analytics/WeeklyReport.jsx'

const TABS = [
  { key: 'trend',  label: '경향보고서',     icon: TrendingUp,   desc: '하자 경향 분석' },
  { key: 'weekly', label: '주간업무보고서',  icon: CalendarDays, desc: '주간 회의 자료' },
]

export default function Analytics() {
  const [activeTab, setActiveTab] = useState('trend')

  const handlePrint = () => window.print()

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800 font-sans antialiased">

      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200/80 print:hidden">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/employee" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-indigo-600 transition">
              <ArrowLeft size={16} /> 직원 허브
            </Link>
            <div className="h-5 w-px bg-gray-200 hidden md:block" aria-hidden />
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
                <TrendingUp className="text-white" size={16} />
              </div>
              <span className="text-lg font-bold text-slate-800">분석 · 보고서</span>
            </div>
          </div>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
          >
            <Printer size={14} /> 인쇄
          </button>
        </div>
      </header>

      {/* ── 히어로 + 탭 선택 ── */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden print:hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <div className="max-w-7xl mx-auto px-6 md:px-8 pt-8 pb-6 relative">
          <p className="text-violet-400 text-xs font-semibold tracking-widest uppercase mb-2">Analytics & Reports</p>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">분석 · 보고서 센터</h1>
          <p className="text-slate-400 text-sm mb-8">PT·납품·회의에 바로 활용할 수 있는 보고서를 자동 생성합니다.</p>

          {/* 탭 */}
          <div className="flex gap-3">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all text-left
                    ${isActive
                      ? 'bg-white text-slate-800 shadow-lg'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-violet-100 text-violet-600' : 'bg-white/10 text-white/60'}`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${isActive ? 'text-slate-800' : 'text-white'}`}>{tab.label}</p>
                    <p className={`text-xs ${isActive ? 'text-gray-500' : 'text-white/50'}`}>{tab.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── 보고서 콘텐츠 ── */}
      <main className="max-w-7xl mx-auto px-6 md:px-8 py-8">
        {activeTab === 'trend' && <TrendReport />}
        {activeTab === 'weekly' && <WeeklyReport />}
      </main>
    </div>
  )
}
