/**
 * components/site/SiteModelsTab.jsx
 * 역할: 현장 상세 > 도면·3D모델 탭 — preModelStore 에서 siteName 매칭 모델 카드 표시
 */

import { Link } from 'react-router-dom'
import { Layers, Upload, Image, FileCode2 } from 'lucide-react'
import usePreModelStore from '../../store/preModelStore.js'

function formatDate(ms) {
  if (!ms) return '—'
  return new Date(ms).toLocaleDateString('ko-KR')
}

export default function SiteModelsTab({ siteName }) {
  const listForSite = usePreModelStore((s) => s.listForSite)
  const models = listForSite(siteName)

  if (models.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <Layers size={48} strokeWidth={1} />
        <p className="mt-4 text-sm">등록된 도면이 없습니다.</p>
        <Link
          to="/employee/pre-work"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800 transition"
        >
          <Upload size={14} /> 사전작업으로 이동
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {models.map((m) => {
        const isCAD = m.level === 1
        const Icon = isCAD ? FileCode2 : Image
        const levelLabel = isCAD ? 'L1 CAD' : 'L2 평면도'
        const wallCount = m.wallsData?.length ?? 0

        return (
          <div
            key={m.id}
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition"
          >
            {/* 상단 프리뷰 / 아이콘 */}
            {m.imageDataUrl ? (
              <div className="h-36 bg-gray-100 flex items-center justify-center overflow-hidden">
                <img
                  src={m.imageDataUrl}
                  alt={m.fileName}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="h-36 bg-gray-50 flex items-center justify-center">
                <Icon size={40} className="text-gray-300" strokeWidth={1.5} />
              </div>
            )}

            {/* 하단 정보 */}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${isCAD ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                  {levelLabel}
                </span>
                {wallCount > 0 && (
                  <span className="text-xs text-gray-500">벽체 {wallCount}개</span>
                )}
              </div>
              <p className="text-sm font-medium text-slate-800 truncate" title={m.fileName}>
                {m.fileName}
              </p>
              <p className="text-xs text-gray-400 mt-1">{formatDate(m.createdAt)}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
