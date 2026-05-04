/**
 * components/report/ExcelExportButton.jsx
 * 역할: 현재 리포트를 자유 형식 `.xlsx` 로 내보내기 (ExcelJS)
 *       - //* [Modified Code v2] SheetJS → ExcelJS 마이그레이션 (의존성 통일)
 *       - 요약 시트 + 하자목록 시트 (이미지 미포함, 양식 내보내기와 별도)
 */

import { useState } from 'react'
import { FileSpreadsheet } from 'lucide-react'
import ExcelJS from 'exceljs'

function buildRows(report) {
  return (report.defects ?? []).map((d, idx) => ({
    '번호': idx + 1,
    '공종': d.trade ?? '',
    '장소': d.location ?? d.location_label ?? '',
    '영역코드': d.area ?? '',
    '하자 유형': d.defect_type ?? d.category_code ?? '',
    '카테고리코드': d.category_code ?? '',
    '심각도': d.severity ?? '',
    '검증': d.verified ? 'Y' : '',
    '수동추가': d.is_manual ? 'Y' : '',
    '조치 메모': d.action_note ?? '',
    '시각': d.timestamp ? new Date(d.timestamp).toLocaleString('ko-KR') : '',
    '이미지': d.image_crop ? '있음' : '',
  }))
}

export default function ExcelExportButton({ report, label = 'Excel (자유형식)', variant = 'secondary' }) {
  const [busy, setBusy] = useState(false)

  const handleExport = async () => {
    setBusy(true)
    try {
      const wb = new ExcelJS.Workbook()

      // Sheet 1: 요약
      const wsSummary = wb.addWorksheet('요약')
      const summaryData = [
        ['항목', '값'],
        ['현장', report.site_name ?? ''],
        ['운용자', report.operator_name ?? ''],
        ['일자', report.inspection_date ?? ''],
        ['Level', report.level ?? ''],
        ['모델 소스', report.model_source ?? ''],
        ['총 하자 수', report.defects?.length ?? 0],
        ['HIGH', (report.defects ?? []).filter((d) => d.severity === 'HIGH').length],
        ['MED', (report.defects ?? []).filter((d) => d.severity === 'MED').length],
        ['LOW', (report.defects ?? []).filter((d) => d.severity === 'LOW').length],
        ['발행 일시', new Date().toLocaleString('ko-KR')],
      ]
      summaryData.forEach((row) => wsSummary.addRow(row))
      wsSummary.getColumn(1).width = 14
      wsSummary.getColumn(2).width = 40

      // Sheet 2: 하자 목록
      const rows = buildRows(report)
      const wsDefects = wb.addWorksheet('하자목록')
      if (rows.length > 0) {
        wsDefects.columns = Object.keys(rows[0]).map((key) => ({ header: key, key, width: 16 }))
        rows.forEach((r) => wsDefects.addRow(r))
      }

      // 다운로드
      const buffer = await wb.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const date = report.inspection_date ?? new Date().toISOString().slice(0, 10)
      const site = (report.site_name ?? 'report').replace(/[\\/:*?"<>|]/g, '_')
      const a = document.createElement('a')
      a.href = url
      a.download = `${date.replace(/-/g, '')}_${site}_하자리포트.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Excel 생성 실패: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  const baseClass =
    variant === 'primary'
      ? 'bg-green-600 text-white hover:bg-green-700'
      : 'bg-white text-green-700 border border-green-600 hover:bg-green-50'

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold shadow-sm transition ${baseClass} disabled:opacity-60`}
      title="자유 형식 Excel (양식 아님 — 데이터 테이블만)"
    >
      <FileSpreadsheet size={13} /> {busy ? '생성 중...' : label}
    </button>
  )
}
