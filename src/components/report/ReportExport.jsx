/**
 * components/report/ReportExport.jsx
 * 역할: 생성된 보고서 내보내기 컴포넌트
 *       - 마크다운 텍스트 클립보드 복사
 *       - .md 파일 다운로드
 */

import { useState } from 'react'
import { format } from 'date-fns'

export default function ReportExport({ content }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert('복사에 실패했습니다.')
    }
  }

  const handleDownload = () => {
    const filename = `aeroinspect_report_${format(new Date(), 'yyyyMMdd_HHmmss')}.md`
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-dashboard-border">
      <button
        onClick={handleCopy}
        className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
      >
        {copied ? '✅ 복사됨' : '📋 복사'}
      </button>
      <button
        onClick={handleDownload}
        className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
      >
        💾 .md 다운로드
      </button>
    </div>
  )
}
