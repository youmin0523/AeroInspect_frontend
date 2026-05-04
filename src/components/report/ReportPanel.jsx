/**
 * components/report/ReportPanel.jsx
 * 역할: LLM 기반 하자 점검 보고서 생성 및 스트리밍 표시 패널
 *       - 보고서 생성 버튼 클릭 시 POST /api/v1/report/generate 호출
 *       - 응답을 fetch ReadableStream으로 청크 단위 수신하여 실시간 표시
 *       - Claude / Gemini 제공자 선택
 *       - 생성 완료 후 ReportExport(복사/다운로드) 버튼 표시
 */

import { useState } from 'react'
import { generateReportStream } from '../../api/reportApi.js'
import ReportExport from './ReportExport.jsx'

export default function ReportPanel() {
  const [content, setContent] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [provider, setProvider] = useState('claude')
  const [error, setError] = useState(null)

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
        </div>
      </div>

      {/* 보고서 내용 */}
      {error && (
        <p className="text-xs text-red-400 mb-2">{error}</p>
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
