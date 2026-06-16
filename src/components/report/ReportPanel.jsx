/**
 * components/report/ReportPanel.jsx
 * 역할: LLM 기반 하자 점검 보고서 생성 및 스트리밍 표시 패널
 *       - 보고서 생성 버튼 클릭 시 POST /api/v1/report/generate 호출
 *       - 응답을 fetch ReadableStream으로 청크 단위 수신하여 실시간 표시
 *       - Claude / Gemini 제공자 선택
 *       - 생성 완료 후 ReportExport(복사/다운로드) 버튼 표시
 */

import { useState } from 'react'
import { Info } from 'lucide-react'
import { generateReportStream } from '../../api/reportApi.js'
import useDefectStore from '../../store/defectStore.js'
import useTestDetectionsStore from '../../store/testDetectionsStore.js'
import { suggestTradeFromCode, inferInitialLocation } from '../../constants/trades.js'
import ReportExport from './ReportExport.jsx'
import ExcelPreviewModal from './ExcelPreviewModal.jsx'

export default function ReportPanel() {
  const [content, setContent] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [provider, setProvider] = useState('claude')
  const [error, setError] = useState(null)
  const [previewReport, setPreviewReport] = useState(null)   // 양식 미리보기 모달용

  // 양식 내보내기 — 바로 다운로드하지 않고 '미리보기 → Excel/PDF 선택' 흐름을 연다.
  // testDetections(업로드 영상/이미지) + defectStore(누적) 합쳐 id 중복 제거 + trade/위치 보강.
  const handleOpenPreview = () => {
    const test = useTestDetectionsStore.getState().detections || []
    const main = useDefectStore.getState().defects || []
    const seen = new Set()
    const defects = []
    for (const d of [...test, ...main]) {
      if (d?.id && seen.has(d.id)) continue
      if (d?.id) seen.add(d.id)
      defects.push({
        ...d,
        trade: d.trade ?? suggestTradeFromCode(d.category_code),
        location: d.location ?? d.location_label ?? inferInitialLocation(d.area),
        action_note: d.action_note ?? '',
      })
    }
    if (!defects.length) {
      setError('보고서에 담을 검출 하자가 없습니다.')
      return
    }
    setError(null)
    setPreviewReport({ defects, narrative_content: content || '' })
  }

  const handleGenerate = async () => {
    setContent('')
    setError(null)
    setIsGenerating(true)

    await generateReportStream(
      {
        provider,
        language: 'ko',
        include_images: true,
        inspection_title: 'AeroInspect 자율 하자 점검',
      },
      (chunk) => setContent((prev) => prev + chunk),
      () => setIsGenerating(false),
      (err) => {
        setError(err.message)
        setIsGenerating(false)
      }
    )
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          AI 점검 보고서
        </h2>
        <div className="flex items-center gap-2">
          {/* 제공자 선택 */}
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            disabled={isGenerating}
            className="text-xs bg-dashboard-bg border border-dashboard-border text-slate-300 rounded px-2 py-1"
          >
            <option value="claude">Claude</option>
            <option value="gemini">Gemini</option>
          </select>

          {/* 생성 버튼 */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
          >
            {isGenerating ? (
              <>
                <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                생성 중...
              </>
            ) : (
              <>📋 보고서 생성</>
            )}
          </button>

          {/* 양식 내보내기 — 미리보기 → Excel/PDF 선택 다운로드 */}
          <button
            onClick={handleOpenPreview}
            title="검출 하자를 양식으로 미리보기 후 Excel/PDF 다운로드"
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-emerald-700 hover:bg-emerald-600 text-white rounded transition-colors"
          >
            📊 양식 내보내기
          </button>
        </div>
      </div>

      {/* 양식 미리보기 → Excel/PDF 다운로드 (기존 흐름 재사용) */}
      {previewReport && (
        <ExcelPreviewModal report={previewReport} onClose={() => setPreviewReport(null)} />
      )}

      {/* 보고서 내용 */}
      {error && (
        <p className="text-xs text-red-400 mb-2">{error}</p>
      )}

      {/* AI 생성 고지 — 본문이 AI 초안이며 검토가 필요함을 명시(분쟁 대비 provenance). */}
      {(content || isGenerating) && (
        <div className="flex items-start gap-1.5 mb-2 px-2 py-1.5 rounded bg-amber-500/10 border border-amber-500/30">
          <Info size={12} className="mt-0.5 shrink-0 text-amber-400" />
          <p className="text-[10px] leading-snug text-amber-200/90 break-keep">
            {provider === 'gemini' ? 'Gemini' : 'Claude'}가 검출 데이터로 작성한 <b>초안</b>입니다 —
            확정 진단·법적 판단이 아니며, 내보내기 전 점검자 검토가 필요합니다.
          </p>
        </div>
      )}

      {content ? (
        <div className="max-h-48 overflow-y-auto">
          <pre className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">
            {content}
            {isGenerating && <span className="animate-pulse">▌</span>}
          </pre>
          {!isGenerating && <ReportExport content={content} />}
        </div>
      ) : (
        !isGenerating && (
          <p className="text-xs text-slate-600 text-center py-4">
            버튼을 눌러 하자 점검 보고서를 자동 생성하세요
          </p>
        )
      )}
    </div>
  )
}
