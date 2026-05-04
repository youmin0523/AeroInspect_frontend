/**
 * components/site/SiteRecordingsTab.jsx
 * 역할: 현장 상세 > 촬영영상 탭 — site.recordings[] mock 데이터 기반 영상 카드
 *       실제 영상 재생/다운로드는 추후 백엔드 영상 서비스 연동 시 구현
 */

import { Video, Play, Download, VideoOff } from 'lucide-react'

function formatDuration(sec) {
  if (!sec) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}분 ${String(s).padStart(2, '0')}초`
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('ko-KR')
}

export default function SiteRecordingsTab({ recordings = [] }) {
  if (recordings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <VideoOff size={48} strokeWidth={1} />
        <p className="mt-4 text-sm">등록된 촬영 영상이 없습니다.</p>
        <p className="text-xs text-gray-300 mt-1">점검 완료 후 녹화 영상이 여기에 표시됩니다.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {recordings.map((rec) => (
        <div
          key={rec.id}
          className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition"
        >
          {/* 썸네일 플레이스홀더 */}
          <div className="h-36 bg-slate-900 flex items-center justify-center relative">
            <Video size={40} className="text-slate-600" strokeWidth={1.5} />
            {/* 재생 시간 뱃지 */}
            <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 text-white text-xs font-mono">
              {formatDuration(rec.duration_sec)}
            </span>
          </div>

          {/* 하단 정보 */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-700">
                {rec.type}
              </span>
              <span className="text-xs text-gray-500">{formatDate(rec.date)}</span>
            </div>

            {/* 액션 버튼 */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => alert('영상 재생 기능은 백엔드 연동 후 활성화됩니다.')}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition"
              >
                <Play size={14} /> 재생
              </button>
              <button
                onClick={() => alert('다운로드 기능은 백엔드 연동 후 활성화됩니다.')}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gray-50 text-gray-600 text-xs font-semibold hover:bg-gray-100 transition"
              >
                <Download size={14} /> 다운로드
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
