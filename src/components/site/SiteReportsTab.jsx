/**
 * components/site/SiteReportsTab.jsx
 * 역할: 현장 상세 > 보고서 탭 — reportsStore 에서 site_id 매칭 보고서 목록 표시
 *
 *   저장 보고서 스키마(ReportSavedResponse): site_id / building_name / inspector_name /
 *   provider / defect_count / high_count / med_count / low_count / created_at(ISO 문자열).
 *   (과거엔 site_name·defects·inspection_type·status 같은 없는 필드를 읽어 항상 빈 값이었다.)
 */

import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FileText, ArrowRight } from 'lucide-react'
import useReportsStore from '../../store/reportsStore.js'

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ko-KR')
}

const SEV_STYLE = {
  HIGH: 'bg-red-100 text-red-700',
  MED: 'bg-orange-100 text-orange-700',
  LOW: 'bg-yellow-100 text-yellow-700',
}

export default function SiteReportsTab({ siteId }) {
  const { reports, fetchAll } = useReportsStore()

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const matched = siteId ? reports.filter((r) => r.site_id === siteId) : []

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
            <th className="text-left px-4 py-3">건물명</th>
            <th className="text-left px-4 py-3">하자건수</th>
            <th className="text-left px-4 py-3">작성자</th>
            <th className="text-right px-4 py-3">액션</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {matched.map((r) => {
            const high = r.high_count ?? 0
            const med = r.med_count ?? 0
            const low = r.low_count ?? 0
            const total = r.defect_count ?? high + med + low
            return (
              <tr key={r.id} className="hover:bg-gray-50 transition">
                <td className="px-4 py-3 whitespace-nowrap">{formatDate(r.created_at)}</td>
                <td className="px-4 py-3 whitespace-nowrap">{r.building_name ?? r.title ?? '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {high > 0 && <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${SEV_STYLE.HIGH}`}>H {high}</span>}
                    {med > 0 && <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${SEV_STYLE.MED}`}>M {med}</span>}
                    {low > 0 && <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${SEV_STYLE.LOW}`}>L {low}</span>}
                    {total === 0 && <span className="text-gray-400 text-xs">없음</span>}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{r.inspector_name ?? '—'}</td>
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
