/**
 * components/report/ExcelPreviewModal.jsx
 * 역할: 양식 기반 Excel 내보내기 미리보기 — HTML 테이블로 내용 재현 + "다운로드" 버튼
 *       Excel 은 브라우저 인라인 렌더 불가 → 데이터를 HTML 로 보여주고 확인 후 다운로드.
 */

import { useState } from 'react'
import { X, Download, FileSpreadsheet, FileText, Loader2, Image as ImageIcon } from 'lucide-react'
import { generateTemplateWorkbook, downloadWorkbook } from '../../utils/templateExport.js'
import {
  TRADE_TO_TEMPLATE_CODE, SEVERITY_TO_GRADE,
  TEMPLATE_CODE_LABELS, GRADE_LABELS,
} from '../../constants/trades.js'
import useSessionStore from '../../store/sessionStore.js'
import useDroneStore from '../../store/droneStore.js'
import { pdf } from '@react-pdf/renderer'
import { ReportDocument } from './PdfExportButton.jsx'

export default function ExcelPreviewModal({ report, onClose }) {
  const session = useSessionStore()
  const { missionStartedAt, missionEndedAt } = useDroneStore()
  const [downloading, setDownloading] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  const defects = report.defects ?? []

  const gradeA = defects.filter((d) => SEVERITY_TO_GRADE[d.severity] === 'A').length
  const gradeB = defects.filter((d) => SEVERITY_TO_GRADE[d.severity] === 'B').length
  const gradeC = defects.filter((d) => SEVERITY_TO_GRADE[d.severity] === 'C').length

  const filePrefix = (() => {
    const date = (session.inspectionDate ?? '').replace(/-/g, '')
    const site = (session.siteName ?? 'report').replace(/[\\/:*?"<>|]/g, '_')
    const unit = session.siteUnit ? `_${session.siteUnit.replace(/[\\/:*?"<>|]/g, '_')}` : ''
    return `${date}_${site}${unit}_하자점검결과보고서`
  })()

  const handlePdfDownload = async () => {
    setDownloadingPdf(true)
    try {
      // report 에 site_unit 보강
      const enrichedReport = { ...report, site_unit: report.site_unit || session.siteUnit || '' }
      const blob = await pdf(<ReportDocument report={enrichedReport} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filePrefix}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('PDF 생성 실패: ' + (err?.message || err))
    } finally {
      setDownloadingPdf(false)
    }
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const wb = await generateTemplateWorkbook({
        report,
        session: { ...session, missionStartedAt, missionEndedAt, confirmer: report.confirmer ?? session.confirmer },
      })
      await downloadWorkbook(wb, `${filePrefix}.xlsx`)
    } catch (err) {
      alert('Excel 생성 실패: ' + err.message)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}
    >
      <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col border-t-4 border-green-600">
        <header className="px-6 py-4 border-b border-gray-200 flex items-start justify-between bg-gradient-to-r from-green-50 to-white flex-shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-600 text-white flex items-center justify-center shadow-md shadow-green-600/30">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">양식 내보내기 미리보기</h2>
              <p className="text-xs text-gray-500 mt-0.5">내용 확인 후 "다운로드" 를 클릭하세요.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded text-gray-400 hover:bg-gray-100 hover:text-slate-800 transition">
            <X size={16} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-sm text-slate-800">
          {/* 점검 개요 */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-green-700 mb-2">점검 개요</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
              <Row label="현장명" value={session.siteName} />
              <Row label="동/호수" value={session.siteUnit} />
              <Row label="점검일자" value={session.inspectionDate} />
              <Row label="점검구분" value={session.inspectionType} />
              <Row label="점검자" value={session.operatorName} />
              <Row label="입회자" value={session.witness || '—'} />
              <Row label="소속/직책" value={[session.department, session.position].filter(Boolean).join(' / ') || '—'} />
              <Row label="연락처" value={session.phoneNumber || '—'} />
              <Row label="점검면적" value={session.inspectionArea || '—'} />
            </div>
          </section>

          {/* 점검 결과 총괄 */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-green-700 mb-2">점검 결과 총괄</h3>
            <div className="grid grid-cols-4 gap-2">
              <StatCell label="총 하자" value={defects.length} accent />
              <StatCell label="경미 (A)" value={gradeA} />
              <StatCell label="보통 (B)" value={gradeB} />
              <StatCell label="중대 (C)" value={gradeC} />
            </div>
          </section>

          {/* 하자 상세 내역 */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-green-700 mb-2">
              하자 상세 내역 ({defects.length}건)
            </h3>
            {defects.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 text-center">하자 없음</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-1.5 text-left border">#</th>
                      <th className="px-2 py-1.5 text-left border">분류코드</th>
                      <th className="px-2 py-1.5 text-left border">위치/부위</th>
                      <th className="px-2 py-1.5 text-left border">하자내용</th>
                      <th className="px-2 py-1.5 text-left border">등급</th>
                      <th className="px-2 py-1.5 text-left border">조치방법</th>
                      <th className="px-2 py-1.5 text-left border">사진</th>
                    </tr>
                  </thead>
                  <tbody>
                    {defects.map((d, i) => {
                      const tc = TRADE_TO_TEMPLATE_CODE[d.trade] ?? 'E'
                      const gr = SEVERITY_TO_GRADE[d.severity] ?? 'B'
                      return (
                        <tr key={d.id ?? i} className="hover:bg-gray-50">
                          <td className="px-2 py-1 border">{i + 1}</td>
                          <td className="px-2 py-1 border font-mono">{tc}. {TEMPLATE_CODE_LABELS[tc]}</td>
                          <td className="px-2 py-1 border">{d.location ?? '—'}</td>
                          <td className="px-2 py-1 border">{d.defect_type ?? d.category_code ?? '—'}</td>
                          <td className="px-2 py-1 border font-mono">{gr} ({GRADE_LABELS[gr]})</td>
                          <td className="px-2 py-1 border">{d.action_note ?? '—'}</td>
                          <td className="px-2 py-1 border text-center">
                            {d.image_crop ? '📷' : '—'}
                            {d.image_wide ? ' 📷' : ''}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* 종합 의견 미리보기 */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-green-700 mb-2">종합 의견</h3>
            <p className="text-xs text-gray-700 bg-gray-50 rounded p-3 min-h-[40px] whitespace-pre-wrap">
              {report.narrative_content || '(미작성)'}
            </p>
          </section>

          {/* 하자 사진 첨부 미리보기 (시트 2) */}
          {defects.length > 0 && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-green-700 mb-2">
                <span className="inline-flex items-center gap-1"><ImageIcon size={11} /> 하자 사진 첨부</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {defects.map((d, i) => (
                  <div key={d.id ?? i} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                    <div className="text-[10px] font-semibold text-gray-600 mb-2">
                      #{i + 1} · {d.defect_type ?? d.category_code ?? '—'} · {d.location ?? '—'}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-[9px] text-gray-500 mb-1">근경</div>
                        {d.image_crop ? (
                          <img src={d.image_crop} alt="근경" className="w-full h-20 object-cover rounded border border-gray-200" />
                        ) : (
                          <div className="w-full h-20 rounded border border-dashed border-gray-300 bg-white flex items-center justify-center text-[10px] text-gray-400">없음</div>
                        )}
                      </div>
                      <div>
                        <div className="text-[9px] text-gray-500 mb-1">원경</div>
                        {d.image_wide ? (
                          <img src={d.image_wide} alt="원경" className="w-full h-20 object-cover rounded border border-gray-200" />
                        ) : (
                          <div className="w-full h-20 rounded border border-dashed border-gray-300 bg-white flex items-center justify-center text-[10px] text-gray-400">없음</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <footer className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between flex-shrink-0">
          <button type="button" onClick={onClose} className="text-xs text-gray-500 hover:text-slate-800 px-3 py-1.5">
            닫기
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition shadow-sm disabled:opacity-60"
            >
              {downloading ? <Loader2 size={12} className="animate-spin" /> : <FileSpreadsheet size={12} />}
              {downloading ? '생성 중...' : 'Excel (.xlsx)'}
            </button>
            <button
              type="button"
              onClick={handlePdfDownload}
              disabled={downloadingPdf}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition shadow-sm disabled:opacity-60"
            >
              {downloadingPdf ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
              {downloadingPdf ? '생성 중...' : 'PDF (.pdf)'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-baseline gap-2 py-0.5">
      <span className="text-gray-500 w-20 shrink-0 font-semibold">{label}</span>
      <span className="text-slate-800">{value || '—'}</span>
    </div>
  )
}

function StatCell({ label, value, accent }) {
  return (
    <div className={`rounded px-3 py-2 border text-center ${accent ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
      <div className="text-[10px] font-semibold text-gray-500 uppercase">{label}</div>
      <div className={`text-lg font-bold ${accent ? 'text-green-700' : 'text-slate-800'}`}>{value}</div>
    </div>
  )
}
