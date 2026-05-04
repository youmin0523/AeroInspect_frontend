/**
 * components/site/SiteReportsTab.jsx
 * 역할: 현장 상세 > 보고서 탭 — reportsStore 에서 site_name 매칭 보고서 목록 표시
 */

import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FileText, ArrowRight, AlertTriangle } from 'lucide-react'
import useReportsStore from '../../store/reportsStore.js'

function formatDate(ms) {
  if (!ms) return '—'
  return new Date(ms).toLocaleDateString('ko-KR')
}

function severityCounts(defects) {
  const acc = { HIGH: 0, MED: 0, LOW: 0 }
  for (const d of defects ?? []) acc[d.severity] = (acc[d.severity] || 0) + 1
  return acc
}

const SEV_STYLE = {
  HIGH: 'bg-red-100 text-red-700',
  MED:  'bg-orange-100 text-orange-700',
  LOW:  'bg-yellow-100 text-yellow-700',
}

export default function SiteReportsTab({ siteName }) {
  const { reports, fetchAll } = useReportsStore()

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const matched = reports.filter((r) => r.site_name === siteName)

  if (matched.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <FileText size={48} strokeWidth={1} />
        <p className="mt-4 text-sm">아직 작성된 보고서가 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
          <tr>
            <th className="text-left px-4 py-3">일자</th>
            <th className="text-left px-4 py-3">점검구분</th>
            <th className="text-left px-4 py-3">하자건수</th>
            <th className="text-left px-4 py-3">상태</th>
            <th className="text-right px-4 py-3">액션</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {matched.map((r) => {
            const sev = severityCounts(r.defects)
            return (
              <tr key={r.id} className="hover:bg-gray-50 transition">
                <td className="px-4 py-3 whitespace-nowrap">{formatDate(r.created_at)}</td>
                <td className="px-4 py-3 whitespace-nowrap">{r.inspection_type ?? '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    {sev.HIGH > 0 && <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${SEV_STYLE.HIGH}`}>H {sev.HIGH}</span>}
                    {sev.MED > 0 && <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${SEV_STYLE.MED}`}>M {sev.MED}</span>}
                    {sev.LOW > 0 && <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${SEV_STYLE.LOW}`}>L {sev.LOW}</span>}
                    {(r.defects?.length ?? 0) === 0 && <span className="text-gray-400 text-xs">없음</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {r.status === 'published' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">발행</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">초안</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`/employee/reports/${r.id}`}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-800 transition"
                  >
                    보기 <ArrowRight size={14} />
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
