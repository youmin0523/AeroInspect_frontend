/**
 * pages/employee/SiteManagement.jsx
 * 역할: `/employee/sites` — 현장 관리 목록 페이지
 *       - 히어로 배너 + KPI 요약
 *       - 검색 + 상태 필터 + 등록 버튼
 *       - 현장 테이블 (현장명 클릭 → 상세, 편집/삭제 액션)
 */

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, MapPin, Plus, Search,
  Building, Trash2, Pencil, ChevronRight,
  LayoutGrid, TrendingUp, Clock, CheckCircle2,
  Building2, Home, Briefcase,
} from 'lucide-react'
import useSitesStore from '../../store/sitesStore.js'
import { STATUS_MAP, CLIENT_TYPE_MAP } from '../../constants/siteTypes.js'
import SiteFormModal from '../../components/site/SiteFormModal.jsx'

/* ── 유틸 ────────────────────────────────────────────── */

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

function formatDateRange(start, end) {
  if (!start && !end) return '—'
  return `${formatDate(start)} ~ ${formatDate(end)}`
}

/* ── 상태 뱃지 ───────────────────────────────────────── */

const STATUS_CONFIG = {
  active:    { label: '진행 중', dot: 'bg-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200' },
  pending:   { label: '예정',    dot: 'bg-amber-400',   bg: 'bg-amber-50',   text: 'text-amber-700',   ring: 'ring-amber-200' },
  completed: { label: '완료',    dot: 'bg-slate-400',   bg: 'bg-slate-50',   text: 'text-slate-600',   ring: 'ring-slate-200' },
  cancelled: { label: '취소',    dot: 'bg-red-400',     bg: 'bg-red-50',     text: 'text-red-600',     ring: 'ring-red-200' },
}

/* ── 건물유형 뱃지 색상 ──────────────────────────────── */

const BUILDING_BADGE = {
  '아파트':     { bg: 'bg-blue-50',    text: 'text-blue-700',    icon: Building2 },
  '오피스텔':   { bg: 'bg-violet-50',  text: 'text-violet-700',  icon: Building },
  '오피스':     { bg: 'bg-sky-50',     text: 'text-sky-700',     icon: Briefcase },
  '상가':       { bg: 'bg-teal-50',    text: 'text-teal-700',    icon: Building },
  '주상복합':   { bg: 'bg-indigo-50',  text: 'text-indigo-700',  icon: Building2 },
  '단독주택':   { bg: 'bg-orange-50',  text: 'text-orange-700',  icon: Home },
  '기타':       { bg: 'bg-gray-50',    text: 'text-gray-600',    icon: Building },
}

/* ── 필터 탭 ─────────────────────────────────────────── */

const FILTER_TABS = [
  { value: 'all',       label: '전체' },
  { value: 'active',    label: '진행 중' },
  { value: 'pending',   label: '예정' },
  { value: 'completed', label: '완료' },
]

/* ── 메인 컴포넌트 ────────────────────────────────────── */

export default function SiteManagement() {
  const navigate = useNavigate()
  const { sites, loading, fetchAll, create, update, remove } = useSitesStore()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSite, setEditingSite] = useState(null)

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  /* 필터링 */
  const filtered = sites.filter((s) => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const haystack = [s.name, s.client_name, s.address, s.building_type, s.inspection_type, s.memo]
        .filter(Boolean).join(' ').toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })

  /* KPI 집계 */
  const kpi = {
    total: sites.length,
    active: sites.filter((s) => s.status === 'active').length,
    pending: sites.filter((s) => s.status === 'pending').length,
    completed: sites.filter((s) => s.status === 'completed').length,
  }

  /* 등록 */
  const handleCreate = async (data) => {
    await create(data)
    setModalOpen(false)
  }

  /* 수정 */
  const handleEdit = (e, site) => {
    e.stopPropagation()
    setEditingSite(site)
    setModalOpen(true)
  }

  const handleUpdate = async (data) => {
    await update(editingSite.id, data)
    setEditingSite(null)
    setModalOpen(false)
  }

  /* 삭제 */
  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm('이 현장을 삭제할까요? 되돌릴 수 없습니다.')) return
    await remove(id)
  }

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800 font-sans antialiased">

      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200/80">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/employee" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-blue-600 transition">
              <ArrowLeft size={16} /> 직원 허브
            </Link>
            <div className="h-5 w-px bg-gray-200 hidden md:block" aria-hidden />
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <MapPin className="text-white" size={16} />
              </div>
              <span className="text-lg font-bold text-slate-800">현장 관리</span>
            </div>
          </div>
          <button
            onClick={() => { setEditingSite(null); setModalOpen(true) }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition shadow-sm shadow-indigo-200"
          >
            <Plus size={16} /> 현장 등록
          </button>
        </div>
      </header>

      {/* ── 히어로 배너 + KPI ── */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        {/* 배경 패턴 */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <div className="max-w-7xl mx-auto px-6 md:px-8 pt-8 pb-20 relative">
          <p className="text-indigo-400 text-xs font-semibold tracking-widest uppercase mb-2">Site Management</p>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">등록된 현장 관리</h1>
          <p className="text-slate-400 text-sm">현장 등록, 의뢰자 관리, 점검 현황을 한눈에 확인합니다.</p>
        </div>
      </div>

      {/* KPI 카드 — 배너에 겹치는 레이아웃 */}
      <div className="max-w-7xl mx-auto px-6 md:px-8 -mt-12 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: '전체 현장', value: kpi.total, icon: LayoutGrid, gradient: 'from-blue-500 to-blue-600',   lightBg: 'bg-blue-50',   lightText: 'text-blue-600' },
            { label: '진행 중',   value: kpi.active, icon: TrendingUp, gradient: 'from-emerald-500 to-emerald-600', lightBg: 'bg-emerald-50', lightText: 'text-emerald-600' },
            { label: '예정',      value: kpi.pending, icon: Clock,      gradient: 'from-amber-500 to-amber-600',   lightBg: 'bg-amber-50',  lightText: 'text-amber-600' },
            { label: '완료',      value: kpi.completed, icon: CheckCircle2, gradient: 'from-slate-500 to-slate-600', lightBg: 'bg-slate-100', lightText: 'text-slate-500' },
          ].map((card) => {
            const Icon = card.icon
            return (
              <div key={card.label} className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 ring-1 ring-gray-100 p-5 flex items-center gap-4 hover:shadow-xl transition-shadow">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-sm flex-shrink-0`}>
                  <Icon size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium tracking-wide">{card.label}</p>
                  <p className="text-3xl font-extrabold text-slate-800 -mt-0.5">{card.value}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 md:px-8 py-8 space-y-6">

        {/* ── 필터 바 ── */}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* 검색 */}
          <div className="relative flex-1 w-full sm:max-w-sm">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="현장명, 의뢰자, 주소, 점검구분 등 통합 검색..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white outline-none transition placeholder:text-gray-400"
            />
          </div>

          {/* 필터 탭 */}
          <div className="flex bg-gray-100 rounded-xl p-1">
            {FILTER_TABS.map((tab) => {
              const count = tab.value === 'all' ? kpi.total : kpi[tab.value]
              return (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all
                    ${statusFilter === tab.value
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  {tab.label}
                  <span className={`ml-1.5 ${statusFilter === tab.value ? 'text-indigo-600' : 'text-gray-400'}`}>{count}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── 테이블 ── */}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-24 text-gray-400">
              <div className="w-8 h-8 border-[3px] border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
              <span className="ml-4 text-sm font-medium">불러오는 중...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <MapPin size={28} strokeWidth={1.5} />
              </div>
              <p className="text-sm font-medium text-gray-500">
                {search || statusFilter !== 'all' ? '조건에 맞는 현장이 없습니다.' : '등록된 현장이 없습니다.'}
              </p>
              {!search && statusFilter === 'all' && (
                <button
                  onClick={() => { setEditingSite(null); setModalOpen(true) }}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-semibold hover:bg-indigo-100 transition"
                >
                  <Plus size={14} /> 첫 현장 등록하기
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-center px-3 py-4 text-xs font-semibold text-gray-400 tracking-wider uppercase w-12">#</th>
                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-400 tracking-wider uppercase">현장</th>
                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-400 tracking-wider uppercase hidden md:table-cell">점검구분</th>
                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-400 tracking-wider uppercase hidden md:table-cell">건물유형</th>
                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-400 tracking-wider uppercase hidden lg:table-cell">의뢰자</th>
                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-400 tracking-wider uppercase hidden lg:table-cell">계약기간</th>
                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-400 tracking-wider uppercase hidden md:table-cell">점검</th>
                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-400 tracking-wider uppercase">상태</th>
                    <th className="text-right px-6 py-4 text-xs font-semibold text-gray-400 tracking-wider uppercase w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((site) => {
                    const sc = STATUS_CONFIG[site.status] || STATUS_CONFIG.pending
                    const bb = BUILDING_BADGE[site.building_type] || BUILDING_BADGE['기타']
                    const BIcon = bb.icon
                    return (
                      <tr
                        key={site.id}
                        onClick={() => navigate(`/employee/sites/${site.id}`)}
                        className="group border-b border-gray-50 last:border-0 hover:bg-indigo-50/40 cursor-pointer"
                      >
                        {/* # 번호 */}
                        <td className="text-center px-3 py-4">
                          <span className="text-xs font-bold text-gray-300">{site.seq ?? '—'}</span>
                        </td>
                        {/* 현장명 */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl ${bb.bg} flex items-center justify-center flex-shrink-0`}>
                              <BIcon size={18} className={bb.text} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 group-hover:text-indigo-700 truncate">{site.name}</p>
                              {site.address && <p className="text-xs text-gray-400 truncate max-w-[220px] mt-0.5">{site.address}</p>}
                            </div>
                          </div>
                        </td>
                        {/* 점검구분 */}
                        <td className="px-4 py-4 hidden md:table-cell">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600">
                            {site.inspection_type || '—'}
                          </span>
                        </td>
                        {/* 건물유형 */}
                        <td className="px-4 py-4 hidden md:table-cell">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${bb.bg} ${bb.text}`}>
                            {site.building_type}
                          </span>
                        </td>
                        {/* 의뢰자 */}
                        <td className="px-4 py-4 hidden lg:table-cell">
                          <div>
                            <p className="text-sm font-medium text-slate-700">{site.client_name || '—'}</p>
                            <span className={`text-[10px] font-bold tracking-wider ${site.client_type === 'B2B' ? 'text-blue-500' : 'text-purple-500'}`}>
                              {site.client_type}
                            </span>
                          </div>
                        </td>
                        {/* 계약기간 */}
                        <td className="px-4 py-4 hidden lg:table-cell">
                          <span className="text-sm text-gray-500">{formatDateRange(site.contract_start, site.contract_end)}</span>
                        </td>
                        {/* 점검 */}
                        <td className="px-4 py-4 hidden md:table-cell">
                          <p className="text-sm font-bold text-slate-800">{site.inspection_count}<span className="font-normal text-gray-400 ml-0.5">건</span></p>
                          {site.last_inspection_date && (
                            <p className="text-[11px] text-gray-400 mt-0.5">최근 {formatDate(site.last_inspection_date)}</p>
                          )}
                        </td>
                        {/* 상태 */}
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ring-1 ${sc.bg} ${sc.text} ${sc.ring}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                            {sc.label}
                          </span>
                        </td>
                        {/* 액션 */}
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={(e) => handleEdit(e, site)}
                              className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
                              title="편집"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={(e) => handleDelete(e, site.id)}
                              className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"
                              title="삭제"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── DB 미연결 안내 ── */}
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/60 rounded-xl px-5 py-3.5">
          <div className="w-2 h-2 rounded-full bg-slate-400 flex-shrink-0" />
          <p className="text-xs text-slate-500">
            <span className="font-semibold text-slate-600">localStorage 모드</span> — 현재 데이터는 브라우저에 저장됩니다. 백엔드 연결 시 자동 전환됩니다.
          </p>
        </div>
      </main>

      {/* ── 등록/수정 모달 ── */}
      <SiteFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingSite(null) }}
        onSubmit={editingSite ? handleUpdate : handleCreate}
        initialData={editingSite}
        mode={editingSite ? 'edit' : 'create'}
      />
    </div>
  )
}
