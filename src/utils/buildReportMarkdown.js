/**
 * utils/buildReportMarkdown.js
 * 역할: 보고서(미리보기 데이터) → 백엔드 reports.content 에 저장할 마크다운 본문 생성.
 *       - 백엔드 Report 모델은 마크다운 content(Text)를 SoT 로 저장 → 저장/다운로드가 이걸 사용.
 *       - 점검 개요 + 점검 결과 총괄 + 하자 상세(RGB) + 열화상 단열 스크리닝(확인분) + 종합 의견.
 *       - 열화상은 RGB 하자와 '별도 섹션' 으로 — 의사색 스크리닝(점검자 확인분)이라 구분.
 */
import {
  TRADE_TO_TEMPLATE_CODE, SEVERITY_TO_GRADE,
  TEMPLATE_CODE_LABELS, GRADE_LABELS,
} from '../constants/trades.js'

// 마크다운 표 셀 이스케이프(파이프 깨짐 방지)
const cell = (v) => String(v ?? '—').replace(/\|/g, '\\|').replace(/\n/g, ' ')

export function buildReportMarkdown(report, session = {}) {
  const defects = report?.defects ?? []
  const thermal = report?.thermal_findings ?? []

  const gradeA = defects.filter((d) => SEVERITY_TO_GRADE[d.severity] === 'A').length
  const gradeB = defects.filter((d) => SEVERITY_TO_GRADE[d.severity] === 'B').length
  const gradeC = defects.filter((d) => SEVERITY_TO_GRADE[d.severity] === 'C').length

  const L = []
  L.push(`# 하자점검 결과보고서`, '')

  // 점검 개요
  L.push('## 점검 개요', '')
  L.push(`- **현장명**: ${session.siteName ?? '—'}`)
  L.push(`- **동/호수**: ${session.siteUnit ?? '—'}`)
  L.push(`- **점검일자**: ${session.inspectionDate ?? '—'}`)
  L.push(`- **점검구분**: ${session.inspectionType ?? '—'}`)
  L.push(`- **점검자**: ${session.operatorName ?? '—'}`)
  L.push(`- **입회자**: ${session.witness || '—'}`)
  L.push(`- **소속/직책**: ${[session.department, session.position].filter(Boolean).join(' / ') || '—'}`)
  L.push(`- **점검면적**: ${session.inspectionArea || '—'}`, '')

  // 점검 결과 총괄
  L.push('## 점검 결과 총괄', '')
  L.push(`- **총 하자**: ${defects.length}건 (경미 A ${gradeA} / 보통 B ${gradeB} / 중대 C ${gradeC})`, '')

  // 하자 상세 내역 (RGB 가시 하자)
  L.push(`## 하자 상세 내역 (${defects.length}건)`, '')
  if (defects.length === 0) {
    L.push('하자 없음', '')
  } else {
    L.push('| # | 분류코드 | 위치/부위 | 하자내용 | 등급 | 조치방법 |')
    L.push('|---|---|---|---|---|---|')
    defects.forEach((d, i) => {
      const tc = TRADE_TO_TEMPLATE_CODE[d.trade] ?? 'E'
      const gr = SEVERITY_TO_GRADE[d.severity] ?? 'B'
      L.push(`| ${i + 1} | ${cell(`${tc}. ${TEMPLATE_CODE_LABELS[tc] ?? ''}`)} | ${cell(d.location)} | ${cell(d.defect_type ?? d.category_code)} | ${gr} (${GRADE_LABELS[gr] ?? ''}) | ${cell(d.action_note)} |`)
    })
    L.push('')
  }

  // 열화상 단열 스크리닝 (확인분) — 별도 섹션
  if (thermal.length > 0) {
    L.push(`## 열화상 단열 스크리닝 (${thermal.length}건 · 확인분)`, '')
    L.push('> ⚠ 의사색(FLIR) 상대온도 기반 단열 의심부 — 점검자 확인분. 절대 ΔT 확정 진단 아님.', '')
    L.push('| # | 유형 | 영상시점 | 심각도 | 비고 |')
    L.push('|---|---|---|---|---|')
    thermal.forEach((t, i) => {
      const ts = typeof t.video_timestamp_sec === 'number' ? `${t.video_timestamp_sec.toFixed(1)}s` : '—'
      L.push(`| ${i + 1} | ${cell(t.kind_label ?? '단열 의심')} | ${ts} | ${cell(t.severity)} | ${cell(t.note)} |`)
    })
    L.push('')
  }

  // 종합 의견
  L.push('## 종합 의견', '')
  L.push(report?.narrative_content || session.opinion || '(미작성)', '')

  return L.join('\n')
}

export default buildReportMarkdown
