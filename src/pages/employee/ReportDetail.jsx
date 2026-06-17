/**
 * pages/employee/ReportDetail.jsx
 * 역할: `/employee/reports/:id` — 저장된 보고서 조회 (읽기 전용)
 *       - reportsStore.fetchOne(id) → 백엔드 Report(마크다운 content + 메타) 확보
 *       - 백엔드 SoT 가 마크다운 content 이므로 react-markdown 으로 렌더(열화상 단열 섹션 포함)
 *       - 메타/통계는 백엔드 ReportSavedResponse 필드(building_name/inspector_name/defect_count/...)
 *       - 마크다운(.md) 다운로드 제공. (백엔드에 보고서 PATCH/status 없음 → 편집·발행 토글 제거)
 */

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, FileText, Calendar } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import useReportsStore from '../../store/reportsStore.js'
import { downloadReport } from '../../api/reportsApi.js'

function fmtDateTime(v) {
  if (!v) return '—'
  const d = new Date(v)
  return isNaN(d) ? String(v) : d.toLocaleString('ko-KR')
}

export default function ReportDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { fetchOne } = useReportsStore()

  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

  // 백엔드 ReportSavedResponse 필드 매핑 (구 localStorage 스키마와 다름)
  const building = report?.building_name || report?.title || '—'
  const inspector = report?.inspector_name || '—'
  const dcount = report?.defect_count ?? 0
  const hi = report?.high_count ?? 0
  const me = report?.med_count ?? 0
  const lo = report?.low_count ?? 0

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800 font-sans antialiased">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 md:px-8 py-3 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate('/employee/reports')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-blue-600 transition"
          >
            <ArrowLeft size={16} /> 리포트 목록
          </button>
          {report && (
            <button
              type="button"
              onClick={() => downloadReport(id).catch(() => {})}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold border border-gray-300 text-gray-600 hover:bg-gray-100 transition"
            >
              <Download size={11} /> 마크다운 다운로드
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 md:px-8 py-8 space-y-6">
        {loading ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center text-sm text-gray-500">불러오는 중...</div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-sm text-red-700">
            {error}
            <button type="button" onClick={() => navigate('/employee/reports')} className="ml-2 text-xs underline">
              목록으로
            </button>
          </div>
        ) : !report ? null : (
          <>
            {/* 메타 요약 */}
            <section className="bg-white rounded-xl shadow-md p-5">
              <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="text-green-600 shrink-0" size={20} />
                  <h1 className="text-lg font-bold text-slate-800 truncate">{report.title || building}</h1>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-gray-500">
                  <Calendar size={11} /> {fmtDateTime(report.created_at)}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetaCell label="점검 건물" value={building} />
                <MetaCell label="점검자" value={inspector} />
                <MetaCell label="총 하자" value={`${dcount}건`} />
                <MetaCell label="등급" value={`HIGH ${hi} / MED ${me} / LOW ${lo}`} />
              </div>
            </section>

            {/* 보고서 본문 (마크다운) — 열화상 단열 스크리닝 섹션 포함 */}
            <section className="bg-white rounded-xl shadow-md p-6 md:p-8">
              {report.content ? (
                <div className="report-markdown">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">보고서 본문이 없습니다.</p>
              )}
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
      <p className="text-sm font-semibold text-slate-800 truncate" title={value}>{value || '—'}</p>
    </div>
  )
}
