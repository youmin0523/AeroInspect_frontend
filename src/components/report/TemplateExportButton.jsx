/**
 * components/report/TemplateExportButton.jsx
 * 역할: "양식 내보내기" 버튼 — 클릭 시 ExcelPreviewModal 을 오픈 (바로 다운로드 아님)
 */

import { useState } from 'react'
import { FileSpreadsheet } from 'lucide-react'
import ExcelPreviewModal from './ExcelPreviewModal.jsx'

export default function TemplateExportButton({ report }) {
  const [showPreview, setShowPreview] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setShowPreview(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition"
        title="양식 미리보기 → Excel / PDF 선택 다운로드"
      >
        <FileSpreadsheet size={13} /> 내보내기
      </button>
      {showPreview && (
        <ExcelPreviewModal
          report={report}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  )
}
