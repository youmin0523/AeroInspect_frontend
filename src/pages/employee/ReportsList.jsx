/**
 * pages/employee/ReportsList.jsx
 * 역할: `/employee/reports` — 사무실에서 아카이브된 리포트 목록
 *       - reportsStore.fetchAll() 로 최신 목록 동기화
 *       - 클릭 시 `/employee/reports/:id` 로 상세 편집
 *       - 행별: 현장명 / 일자 / 공종·하자 요약 / 상태(draft/published) / 액션(열기/삭제)
 */

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, Building, FileText, Plus,
  Trash2, CheckCircle2, Clock, AlertTriangle,
} from 'lucide-react'
import useReportsStore from '../../store/reportsStore.js'

function formatDate(ms) {
  if (!ms) return '—'
  return new Date(ms).toLocaleString('ko-KR')
}

function severityCounts(defects) {
  const acc = { HIGH: 0, MED: 0, LOW: 0 }
  for (const d of defects ?? []) acc[d.severity] = (acc[d.severity] || 0) + 1
  return acc
}

export default function ReportsList() {
  const navigate = useNavigate()
  const { reports, loading, fetchAll, remove } = useReportsStore()
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const handleDelete = async (id) => {
    if (!confirm('이 리포트를 삭제할까요? 되돌릴 수 없습니다.')) return
    setBusyId(id)
    try {
      await remove(id)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800 font-sans antialiased">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 md:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              to="/employee"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-blue-600 transition"
            >
              <ArrowLeft size={16} /> 직원 허브
            </Link>
            <div className="h-5 w-px bg-gray-200 hidden md:block" aria-hidden />
            <div className="flex items-center gap-2">
              <FileText className="text-green-600" size={20} />
              <span className="font-extrabold tracking-tight text-slate-800 uppercase text-sm md:text-base">
                보고서 작성 · 조회
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 md:px-8 py-10 space-y-6">
        <section>
          <p className="text-xs font-bold text-green-700 uppercase tracking-[0.15em]">REPORTS</p>
          <div className="flex items-center justify-between gap-3 mt-1">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
              아카이브된 점검 리포트
            </h1>
            <div className="text-sm text-gray-500">
              총 <span className="font-bold text-slate-800">{reports.length}</span>건
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-2 break-keep max-w-3xl">
            현장에서 비행 종료 시 생성된 리포트와 이곳에서 수동 재편집한 리포트를 확인합니다.
            엑셀·PDF 내보내기와 재편집은 각 상세 페이지에서 가능합니다.
          </p>
        </section>

        {loading ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center text-sm text-gray-500">
            불러오는 중...
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <FileText size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-600">아직 저장된 리포트가 없습니다.</p>
            <p className="text-xs text-gray-500 mt-1">
              현장에서 드론 비행 종료 후 리포트를 저장하면 여기에 누적됩니다.
            </p>
            <Link
              to="/session/setup"
              className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition shadow"
            >
              <Plus size={14} /> 현장 점검 시작
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-3">현장</th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">운용자</th>
                    <th className="text-left px-4 py-3">일자</th>
                    <th className="text-left px-4 py-3">하자 요약</th>
                    <th className="text-left px-4 py-3">상태</th>
                    <th className="text-right px-4 py-3">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reports.map((r) => {
                    const sc = severityCounts(r.defects)
                    return (
                      <tr key={r.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 min-w-[220px]">
                          <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                              <Building size={16} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 truncate break-keep">
                                {r.site_name || '—'}
                              </p>
                              <p className="text-[10px] text-gray-400 font-mono truncate">
                                ID · {r.id?.slice(0, 8)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-gray-600">
                          {r.operator_name || '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {r.inspection_date || '—'}
                          <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                            저장 {formatDate(r.updated_at ?? r.created_at)}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-bold text-slate-800">{r.defects?.length ?? 0}건</span>
                            <span className="inline-flex items-center gap-1 text-red-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> {sc.HIGH}
                            </span>
                            <span className="inline-flex items-center gap-1 text-orange-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> {sc.MED}
                            </span>
                            <span className="inline-flex items-center gap-1 text-yellow-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" /> {sc.LOW}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {r.status === 'published' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-green-50 text-green-700">
                              <CheckCircle2 size={11} /> 발행
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                              <Clock size={11} /> 초안
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => navigate(`/employee/reports/${r.id}`)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold text-blue-700 hover:bg-blue-50 transition"
                            >
                              열기 <ArrowRight size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(r.id)}
                              disabled={busyId === r.id}
                              className="p-1.5 rounded text-gray-400 hover:bg-red-50 hover:text-red-700 transition disabled:opacity-50"
                              title="리포트 삭제"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 간단한 안내 */}
        <section className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 leading-relaxed">
          <p className="font-bold mb-1 flex items-center gap-1">
            <AlertTriangle size={12} /> DB 연결 안내
          </p>
          <p>
            현재는 브라우저 localStorage 에 저장됩니다(기기별 격리). 백엔드 DB 가 연결되면
            <code className="mx-1 px-1 py-0.5 bg-blue-100 rounded font-mono">api/reportsApi.js</code>
            만 교체 후 이 페이지는 변경 없이 동작합니다.
          </p>
        </section>
      </main>
    </div>
  )
}
