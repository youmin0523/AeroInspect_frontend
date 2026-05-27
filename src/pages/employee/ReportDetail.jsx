/**
 * pages/employee/ReportDetail.jsx
 * 역할: `/employee/reports/:id` — 개별 리포트 편집 페이지
 *       - reportsStore.fetchOne(id) → 최신 확보
 *       - ReportEditor 를 `variant="page"` 로 렌더
 *       - 상단에 세션 메타(현장/운용자/일자) + 상태(draft/published) 표시 + 발행 토글
 *       - 저장은 낙관적 업데이트 (debounce 500ms) — 편집 중 연속 수정도 안정적
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Clock, Download, Save, Building } from 'lucide-react'
import ReportEditor from '../../components/report/ReportEditor.jsx'
import useReportsStore from '../../store/reportsStore.js'
import { downloadReport } from '../../api/reportsApi.js'
import RoleGuard from '../../components/common/RoleGuard.jsx'

export default function ReportDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { fetchOne, update } = useReportsStore()

  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const saveTimer = useRef(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetchOne(id).then((r) => {
      if (!alive) return
      if (!r) setError('리포트를 찾을 수 없습니다.')
      setReport(r)
      setLoading(false)
    })
    return () => { alive = false }
  }, [id, fetchOne])

  const scheduleSave = useCallback((next) => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      try {
        await update(id, next)
      } catch (err) {
        setError(err.message)
      } finally {
        setSaving(false)
      }
    }, 500)
  }, [id, update])

  const handleChange = (patch) => {
    setReport((prev) => {
      const next = { ...prev, ...patch }
      scheduleSave(patch)
      return next
    })
  }

  const handleTogglePublish = async () => {
    const next = report.status === 'published' ? 'draft' : 'published'
    await update(id, { status: next })
    setReport((prev) => ({ ...prev, status: next }))
  }

  // 저장 중 페이지 이탈 방지 (간이)
  useEffect(() => () => clearTimeout(saveTimer.current), [])

  const statusLabel = useMemo(() => {
    if (report?.status === 'published') return { text: '발행됨', icon: CheckCircle2, cls: 'text-green-700 bg-green-50 border-green-200' }
    return { text: '초안', icon: Clock, cls: 'text-gray-600 bg-gray-100 border-gray-200' }
  }, [report?.status])

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800 font-sans antialiased">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 md:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              to="/employee/reports"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-blue-600 transition"
            >
              <ArrowLeft size={16} /> 리포트 목록
            </Link>
            <div className="h-5 w-px bg-gray-200 hidden md:block" aria-hidden />
            <div className="flex items-center gap-2">
              <Building className="text-blue-600" size={18} />
              <span className="font-bold text-slate-800 truncate max-w-[320px]">
                {report?.site_name || '—'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saving ? (
              <span className="text-[11px] text-blue-700 inline-flex items-center gap-1">
                <Save size={11} className="animate-pulse" /> 저장 중...
              </span>
            ) : (
              <span className="text-[11px] text-gray-500 inline-flex items-center gap-1">
                <Save size={11} /> 자동 저장
              </span>
            )}
            {report && (
              <button
                type="button"
                onClick={() => downloadReport(id).catch(() => {})}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold border border-gray-300 text-gray-600 hover:bg-gray-100 transition"
              >
                <Download size={11} /> 다운로드
              </button>
            )}
            {report && (
              // 발행/초안 토글은 owner/admin 만. member 는 현재 상태만 표시.
              <RoleGuard
                allowed={['owner', 'admin']}
                fallback={
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold border ${
                    report.status === 'published'
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-gray-50 text-gray-600 border-gray-200'
                  }`}>
                    {report.status === 'published' ? '발행됨' : '초안'}
                  </span>
                }
              >
                <button
                  type="button"
                  onClick={handleTogglePublish}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold border transition ${
                    report.status === 'published'
                      ? 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                      : 'bg-green-600 text-white border-green-600 hover:bg-green-700'
                  }`}
                >
                  {report.status === 'published' ? '초안으로' : '발행'}
                </button>
              </RoleGuard>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 md:px-8 py-8 space-y-6">
        {loading ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center text-sm text-gray-500">
            불러오는 중...
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-sm text-red-700">
            {error}
            <button
              type="button"
              onClick={() => navigate('/employee/reports')}
              className="ml-2 text-xs underline"
            >
              목록으로
            </button>
          </div>
        ) : !report ? null : (
          <>
            {/* 메타 요약 */}
            <section className="bg-white rounded-xl shadow-md p-5">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <div>
                  <p className="text-xs font-mono text-gray-500 uppercase tracking-wider">리포트 ID</p>
                  <p className="text-[11px] font-mono text-gray-700">{report.id}</p>
                </div>
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${statusLabel.cls}`}>
                  <statusLabel.icon size={11} /> {statusLabel.text}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetaCell label="현장" value={report.site_name} />
                <MetaCell label="운용자" value={report.operator_name} />
                <MetaCell label="일자" value={report.inspection_date} />
                <MetaCell label="Level" value={report.level ? `L${report.level} · ${report.model_source ?? '-'}` : '-'} />
              </div>
            </section>

            {/* 편집기 */}
            <section className="bg-white rounded-xl shadow-md overflow-hidden">
              <ReportEditor report={report} onChange={handleChange} variant="page" />
            </section>
          </>
        )}
      </main>
    </div>
  )
}

function MetaCell({ label, value }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2">
      <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-slate-800 truncate mt-0.5">{value || '—'}</p>
    </div>
  )
}
