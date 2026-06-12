/**
 * components/video/ReportReadyCTA.jsx
 * 역할: 영상 분석 완료(analysis_complete) 시 "보고서 준비됨" 배너 → 원클릭으로 양식 미리보기.
 *       검출(testDetections 업로드 + defectStore 누적)을 합쳐 id 중복제거 + trade/위치 보강 후
 *       ExcelPreviewModal(미리보기 → Excel/PDF 다운로드) 오픈. 분석→보고서 자동화 진입점.
 */
import { useState } from 'react'
import { FileSpreadsheet } from 'lucide-react'
import useDefectStore from '../../store/defectStore.js'
import useTestDetectionsStore from '../../store/testDetectionsStore.js'
import { suggestTradeFromCode, inferInitialLocation } from '../../constants/trades.js'
import ExcelPreviewModal from '../report/ExcelPreviewModal.jsx'

export default function ReportReadyCTA({ show }) {
  const [report, setReport] = useState(null)
  const testDets = useTestDetectionsStore((s) => s.detections)
  const mainDefects = useDefectStore((s) => s.defects)

  // 합쳐서 id 중복제거 (영상 트랙 id 재사용 → 같은 하자 1건)
  const seen = new Set()
  const merged = []
  for (const d of [...(testDets || []), ...(mainDefects || [])]) {
    if (d?.id && seen.has(d.id)) continue
    if (d?.id) seen.add(d.id)
    merged.push(d)
  }

  if (!show || merged.length === 0) return null

  const openPreview = () => {
    const defects = merged.map((d) => ({
      ...d,
      trade: d.trade ?? suggestTradeFromCode(d.category_code),
      location: d.location ?? d.location_label ?? inferInitialLocation(d.area),
      action_note: d.action_note ?? '',
    }))
    setReport({ defects, narrative_content: '' })
  }

  return (
    <>
      <button
        type="button"
        onClick={openPreview}
        className="absolute top-3 left-1/2 -translate-x-1/2 z-30 inline-flex items-center gap-2 px-4 py-2 rounded-full
                   bg-emerald-600/95 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/40
                   border border-emerald-300/40 transition animate-[pulse_2s_ease-in-out_2]"
        title="검출 하자를 양식으로 미리보기 후 Excel/PDF 다운로드"
      >
        <FileSpreadsheet size={14} />
        분석 완료 · 보고서 준비됨 ({merged.length}건) — 양식 생성
      </button>
      {report && <ExcelPreviewModal report={report} onClose={() => setReport(null)} />}
    </>
  )
}
