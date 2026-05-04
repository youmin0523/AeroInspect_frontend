/**
 * components/report/PdfPreviewModal.jsx
 * 역할: PDF 미리보기 모달 — @react-pdf/renderer BlobProvider 로 생성 후 iframe 인라인 표시
 *       확인 후 "다운로드" 클릭 시에만 실제 파일 저장. 닫기 시 파일 안 남음.
 */

import { useState, useEffect } from 'react'
import { X, Download, FileText, Loader2, AlertTriangle } from 'lucide-react'
import { pdf } from '@react-pdf/renderer'

export default function PdfPreviewModal({ document: PdfDoc, filename, onClose }) {
  const [blobUrl, setBlobUrl] = useState(null)
  const [blob, setBlob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setErrorMsg(null)

    pdf(PdfDoc)
      .toBlob()
      .then((b) => {
        if (!alive) return
        setBlob(b)
        setBlobUrl(URL.createObjectURL(b))
        setLoading(false)
      })
      .catch((err) => {
        console.error('[PdfPreview] 생성 실패:', err)
        if (alive) {
          setErrorMsg(err?.message || String(err))
          setLoading(false)
        }
      })
    return () => {
      alive = false
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDownload = () => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || 'report.pdf'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}
    >
      <div className="w-full max-w-4xl h-[88vh] overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col border-t-4 border-red-600">
        <header className="px-6 py-4 border-b border-gray-200 flex items-start justify-between bg-gradient-to-r from-red-50 to-white flex-shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-600/30">
              <FileText size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">PDF 미리보기</h2>
              <p className="text-xs text-gray-500 mt-0.5">내용 확인 후 "다운로드" 를 클릭하세요. 닫으면 파일이 남지 않습니다.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded text-gray-400 hover:bg-gray-100 hover:text-slate-800 transition">
            <X size={16} />
          </button>
        </header>

        <div className="flex-1 overflow-hidden bg-gray-100">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Loader2 size={28} className="animate-spin mb-2" />
              <span className="text-sm">PDF 생성 중...</span>
            </div>
          ) : blobUrl ? (
            <iframe
              src={blobUrl}
              title="PDF 미리보기"
              className="w-full h-full border-0"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-red-600 text-sm px-8 gap-3">
              <AlertTriangle size={28} />
              <p className="font-bold">PDF 생성에 실패했습니다</p>
              {errorMsg && (
                <pre className="text-xs text-red-500 bg-red-50 border border-red-200 rounded p-3 max-w-lg overflow-auto whitespace-pre-wrap max-h-40 w-full">
                  {errorMsg}
                </pre>
              )}
              <p className="text-xs text-gray-500">
                원인: 한글 폰트 CDN 로딩 실패 또는 이미지 데이터 이슈일 수 있습니다.
                <br />닫고 다시 시도하거나, 브라우저 콘솔(F12)에서 상세 에러를 확인하세요.
              </p>
            </div>
          )}
        </div>

        <footer className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-2 flex-shrink-0">
          <button type="button" onClick={onClose} className="text-xs text-gray-500 hover:text-slate-800 px-3 py-1.5">
            닫기
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!blob}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition shadow-md shadow-red-600/30 disabled:opacity-60"
          >
            <Download size={12} /> 다운로드 (.pdf)
          </button>
        </footer>
      </div>
    </div>
  )
}
