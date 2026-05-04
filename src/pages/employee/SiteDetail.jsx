/**
 * pages/employee/SiteDetail.jsx
 * 역할: `/employee/sites/:id` — 현장 상세 페이지
 *       - 히어로 배너 + 기본 정보 그리드
 *       - 미니 KPI (점검건수 / 면적 / 세대수)
 *       - 탭 3개: 보고서 / 도면·3D모델 / 촬영영상
 */

import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, MapPin, Pencil, Play,
  FileText, Layers, Video,
  Building2, Phone, Calendar, Users, MapPinned, Ruler,
  ClipboardCheck, Home, ChevronRight, ExternalLink,
} from 'lucide-react'
import useSitesStore from '../../store/sitesStore.js'
import { STATUS_MAP, CLIENT_TYPE_MAP } from '../../constants/siteTypes.js'
import SiteFormModal from '../../components/site/SiteFormModal.jsx'
import SiteReportsTab from '../../components/site/SiteReportsTab.jsx'
import SiteModelsTab from '../../components/site/SiteModelsTab.jsx'
import SiteRecordingsTab from '../../components/site/SiteRecordingsTab.jsx'

/* ── 유틸 ────────────────────────────────────────────── */

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('ko-KR')
}

/* ── 상태 설정 ───────────────────────────────────────── */

const STATUS_CONFIG = {
  active:    { label: '진행 중', dot: 'bg-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200', heroBg: 'from-emerald-600 to-teal-700' },
  pending:   { label: '예정',    dot: 'bg-amber-400',   bg: 'bg-amber-50',   text: 'text-amber-700',   ring: 'ring-amber-200',   heroBg: 'from-amber-600 to-orange-700' },
  completed: { label: '완료',    dot: 'bg-slate-400',   bg: 'bg-slate-50',   text: 'text-slate-600',   ring: 'ring-slate-200',   heroBg: 'from-slate-600 to-slate-700' },
  cancelled: { label: '취소',    dot: 'bg-red-400',     bg: 'bg-red-50',     text: 'text-red-600',     ring: 'ring-red-200',     heroBg: 'from-red-600 to-rose-700' },
}

/* ── 탭 정의 ─────────────────────────────────────────── */

const TABS = [
  { key: 'reports',    label: '보고서',       icon: FileText },
  { key: 'models',     label: '도면 · 3D 모델',  icon: Layers },
  { key: 'recordings', label: '촬영 영상',     icon: Video },
]

/* ── 메인 컴포넌트 ────────────────────────────────────── */

export default function SiteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { fetchOne, update } = useSitesStore()

  const [site, setSite] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('reports')
  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetchOne(id).then((s) => {
      if (!alive) return
      if (!s) setError('현장을 찾을 수 없습니다.')
      setSite(s)
      setLoading(false)
    })
    return () => { alive = false }
  }, [id, fetchOne])

  const handleUpdate = async (data) => {
    const updated = await update(id, data)
    setSite(updated)
    setEditOpen(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !site) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
          <MapPin size={28} className="text-gray-400" strokeWidth={1.5} />
        </div>
        <p className="text-gray-500 font-medium">{error || '현장을 찾을 수 없습니다.'}</p>
        <Link to="/employee/sites" className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition inline-flex items-center gap-1">
          <ArrowLeft size={14} />목록으로 돌아가기
        </Link>
      </div>
    )
  }

  const sc = STATUS_CONFIG[site.status] || STATUS_CONFIG.pending
  const ct = CLIENT_TYPE_MAP[site.client_type] || CLIENT_TYPE_MAP.B2B

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800 font-sans antialiased">

      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200/80">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/employee/sites" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-indigo-600 transition">
              <ArrowLeft size={16} /> 현장 목록
            </Link>
            <ChevronRight size={14} className="text-gray-300" />
            <span className="text-sm font-semibold text-slate-700 truncate max-w-[240px]">{site.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition"
            >
              <Pencil size={14} /> 편집
            </button>
            <Link
              to={`/session/setup?siteName=${encodeURIComponent(site.name)}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition shadow-sm shadow-indigo-200"
            >
              <Play size={14} /> 점검 시작
            </Link>
          </div>
        </div>
      </header>

      {/* ── 히어로 배너 ── */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <div className="max-w-7xl mx-auto px-6 md:px-8 pt-8 pb-24 relative">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-white/20 ${sc.bg} ${sc.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
              {sc.label}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white/80 ring-1 ring-white/10">
              {site.building_type}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ring-1 ring-white/10 ${site.client_type === 'B2B' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'}`}>
              {site.client_type}
            </span>
            {site.inspection_type && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white/80 ring-1 ring-white/10">
                {site.inspection_type}
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{site.name}</h1>
          {site.address && (
            <p className="text-slate-400 text-sm flex items-center gap-1.5">
              <MapPinned size={14} /> {site.address}
            </p>
          )}
        </div>
      </div>

      {/* ── 정보 카드 그리드 (배너에 겹침) ── */}
      <div className="max-w-7xl mx-auto px-6 md:px-8 -mt-16 relative z-10 space-y-6">

        {/* 미니 KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: '누적 점검', value: `${site.inspection_count}건`, sub: site.last_inspection_date ? `최근 ${formatDate(site.last_inspection_date)}` : null, icon: ClipboardCheck, color: 'indigo' },
            { label: '공급면적',  value: site.total_area ? `${site.total_area}㎡` : '—', sub: null, icon: Ruler, color: 'sky' },
            { label: '동 수',     value: site.building_count ?? '—', sub: null, icon: Building2, color: 'violet' },
            { label: '세대 수',   value: site.unit_count ? site.unit_count.toLocaleString() : '—', sub: null, icon: Home, color: 'teal' },
          ].map((stat) => {
            const Icon = stat.icon
            const colors = {
              indigo: { iconBg: 'bg-indigo-500', ring: 'ring-indigo-100' },
              sky:    { iconBg: 'bg-sky-500',    ring: 'ring-sky-100' },
              violet: { iconBg: 'bg-violet-500', ring: 'ring-violet-100' },
              teal:   { iconBg: 'bg-teal-500',   ring: 'ring-teal-100' },
            }[stat.color]
            return (
              <div key={stat.label} className={`bg-white rounded-2xl shadow-lg shadow-gray-200/50 ring-1 ${colors.ring} p-5`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-9 h-9 rounded-lg ${colors.iconBg} flex items-center justify-center`}>
                    <Icon size={16} className="text-white" />
                  </div>
                  <span className="text-xs font-medium text-gray-400 tracking-wide">{stat.label}</span>
                </div>
                <p className="text-2xl font-extrabold text-slate-800">{stat.value}</p>
                {stat.sub && <p className="text-[11px] text-gray-400 mt-1">{stat.sub}</p>}
              </div>
            )
          })}
        </div>

        {/* 상세 정보 */}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">

            {/* 좌측: 의뢰자 정보 */}
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-5 rounded-full bg-indigo-500" />
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">의뢰자 정보</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Building2 size={15} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{ct.clientLabel}</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{site.client_name || '—'}</p>
                  </div>
                </div>
                {site.client_contact && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Phone size={15} className="text-gray-500" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{ct.contactLabel}</p>
                      <p className="text-sm text-slate-700 mt-0.5">{site.client_contact}</p>
                    </div>
                  </div>
                )}
                {(site.contract_start || site.contract_end) && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Calendar size={15} className="text-gray-500" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                        {site.client_type === 'B2B' ? '계약 기간' : '점검 기간'}
                      </p>
                      <p className="text-sm text-slate-700 mt-0.5">{formatDate(site.contract_start)} ~ {formatDate(site.contract_end)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 우측: 운영 정보 */}
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-5 rounded-full bg-teal-500" />
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">운영 정보</h3>
              </div>
              <div className="space-y-4">
                {/* 담당자 */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Users size={15} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">담당자</p>
                    {site.assigned_members?.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {site.assigned_members.map((m) => (
                          <span key={m.id} className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold ring-1 ring-indigo-100">
                            {m.name} <span className="text-indigo-400 ml-1 font-normal">{m.role}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 mt-0.5">배정 대기</p>
                    )}
                  </div>
                </div>

                {/* 메모 */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FileText size={15} className="text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">메모</p>
                    {site.memo ? (
                      <p className="text-sm text-slate-600 mt-1 leading-relaxed bg-gray-50 rounded-lg px-3 py-2">{site.memo}</p>
                    ) : (
                      <p className="text-sm text-gray-400 mt-0.5">—</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 탭 섹션 ── */}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
          {/* 탭 헤더 */}
          <div className="flex border-b border-gray-100 px-2">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex items-center gap-2 px-5 py-4 text-sm font-semibold border-b-2 transition-all mx-1 -mb-px
                    ${isActive
                      ? 'border-indigo-600 text-indigo-700'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                >
                  <Icon size={16} className={isActive ? 'text-indigo-500' : ''} />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* 탭 콘텐츠 */}
          <div className="p-6">
            {activeTab === 'reports' && <SiteReportsTab siteName={site.name} />}
            {activeTab === 'models' && <SiteModelsTab siteName={site.name} />}
            {activeTab === 'recordings' && <SiteRecordingsTab recordings={site.recordings} />}
          </div>
        </div>

        {/* 하단 여백 */}
        <div className="h-4" />
      </div>

      {/* ── 수정 모달 ── */}
      <SiteFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={handleUpdate}
        initialData={site}
        mode="edit"
      />
    </div>
  )
}
