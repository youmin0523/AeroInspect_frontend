/**
 * utils/templateExport.js
 * 역할: 하자점검_결과보고서.xlsx 양식을 ExcelJS 로 읽고 데이터를 주입해 새 workbook 반환
 *
 *   흐름:
 *     1. `fetch()` 로 양식 파일 로드 (Vite 에서 public asset 이 아닌 src/assets/templates/ 경유)
 *     2. ExcelJS `Workbook.xlsx.load(buffer)` 로 파싱
 *     3. 시트 1(점검 결과보고서): 셀에 값 주입 + 10개 초과 시 행 삽입
 *     4. 시트 2(하자 사진 첨부): 하자별 이미지 삽입 (`addImage`)
 *     5. `workbook.xlsx.writeBuffer()` → Blob → 다운로드 or 미리보기
 *
 *   NOTE: base64 이미지는 ExcelJS addImage 에 직접 전달 가능 (buffer 변환 불필요, extension 명시)
 */

import ExcelJS from 'exceljs'
import {
  TRADE_TO_TEMPLATE_CODE,
  SEVERITY_TO_GRADE,
  GRADE_LABELS,
  TEMPLATE_CODE_LABELS,
} from '../constants/trades.js'

// 양식 파일 URL — Vite 의 `?url` import 로 빌드 시 해싱된 경로 반환
import templateUrl from '../assets/templates/하자점검_결과보고서.xlsx?url'

/**
 * 양식 기반 Excel workbook 생성 (ExcelJS Workbook 반환)
 * @param {{ report, session }} opts
 *   - report: reportsApi 스키마 (defects 배열 포함)
 *   - session: sessionStore 스냅샷 (siteName/siteUnit/operatorName/... 등)
 * @returns {Promise<ExcelJS.Workbook>}
 */
export async function generateTemplateWorkbook({ report, session }) {
  // 1) 양식 로드
  const res = await fetch(templateUrl)
  const buf = await res.arrayBuffer()
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buf)

  const ws1 = wb.getWorksheet('하자점검 결과보고서') ?? wb.worksheets[0]
  const ws2 = wb.getWorksheet('하자 사진 첨부') ?? wb.worksheets[1]

  if (!ws1) throw new Error('시트 "하자점검 결과보고서" 를 찾을 수 없습니다')

  const defects = report.defects ?? []

  // 2) 시트 1 — 점검 개요 (행 5~10)
  setCellSafe(ws1, 'C5', session.siteName ?? '')
  setCellSafe(ws1, 'C6', session.siteUnit ?? '')
  setCellSafe(ws1, 'C7', formatDateKR(session.inspectionDate))
  setCellSafe(ws1, 'C8', session.operatorName ?? '')
  setCellSafe(ws1, 'C9', session.witness ?? '')

  // 점검구분 체크
  const typeMap = { '사전점검': '☑ 사전점검  □ 입주점검  □ 정기', '입주점검': '□ 사전점검  ☑ 입주점검  □ 정기', '정기': '□ 사전점검  □ 입주점검  ☑ 정기' }
  setCellSafe(ws1, 'G5', typeMap[session.inspectionType] ?? '□ 사전점검  □ 입주점검  □ 정기')
  setCellSafe(ws1, 'G6', session.inspectionArea ?? '')

  // 점검시간 — missionStartedAt/EndedAt 기반
  if (session.missionStartedAt) {
    const start = new Date(session.missionStartedAt)
    const end = session.missionEndedAt ? new Date(session.missionEndedAt) : new Date()
    setCellSafe(ws1, 'G7', `${fmtTime(start)} ~ ${fmtTime(end)}`)
  }
  setCellSafe(ws1, 'G8', [session.department, session.position].filter(Boolean).join(' / '))
  setCellSafe(ws1, 'G9', session.phoneNumber ?? '')

  // 3) 점검 결과 총괄 (행 14)
  const gradeA = defects.filter((d) => SEVERITY_TO_GRADE[d.severity] === 'A').length
  const gradeB = defects.filter((d) => SEVERITY_TO_GRADE[d.severity] === 'B').length
  const gradeC = defects.filter((d) => SEVERITY_TO_GRADE[d.severity] === 'C').length
  setCellSafe(ws1, 'A14', defects.length)
  setCellSafe(ws1, 'C14', '—')
  setCellSafe(ws1, 'D14', gradeA)
  setCellSafe(ws1, 'E14', gradeB)
  setCellSafe(ws1, 'F14', gradeC)
  // 종합판정
  const total = defects.length
  const judgment = total === 0 ? '☑ 양호   □ 보통   □ 불량' : total <= 5 ? '□ 양호   ☑ 보통   □ 불량' : '□ 양호   □ 보통   ☑ 불량'
  setCellSafe(ws1, 'G14', judgment)

  // 4) 하자 상세 내역 (행 19~28 기본 10행, 초과 시 행 삽입)
  const startRow = 19
  const baseRows = 10
  const extraNeeded = Math.max(0, defects.length - baseRows)

  // 초과분 행 삽입 (행 28 아래에)
  if (extraNeeded > 0) {
    ws1.insertRows(startRow + baseRows, extraNeeded)
  }

  defects.forEach((d, i) => {
    const row = startRow + i
    const templateCode = TRADE_TO_TEMPLATE_CODE[d.trade] ?? 'E'
    const grade = SEVERITY_TO_GRADE[d.severity] ?? 'B'

    setCellSafe(ws1, `A${row}`, i + 1)
    setCellSafe(ws1, `B${row}`, templateCode)
    setCellSafe(ws1, `C${row}`, d.location ?? '')
    setCellSafe(ws1, `D${row}`, d.defect_type ?? d.category_code ?? '')
    setCellSafe(ws1, `F${row}`, grade)
    setCellSafe(ws1, `G${row}`, d.action_note ?? '')
    setCellSafe(ws1, `H${row}`, '') // 처리기한 — 기입 불필요
  })

  // 5) 종합 의견 (범례/하자 아래, 동적 행 offset)
  const offsetFromBase = extraNeeded
  const opinionRow = 33 + offsetFromBase
  setCellSafe(ws1, `A${opinionRow}`, report.narrative_content || session.opinion || '')

  // 6) 서명 (동적 offset)
  const signDateRow = 38 + offsetFromBase
  const signRow = 39 + offsetFromBase
  setCellSafe(ws1, `A${signDateRow}`, `작성일 :  ${formatDateKR(session.inspectionDate)}`)
  setCellSafe(ws1, `B${signRow}`, session.operatorName ?? '')
  setCellSafe(ws1, `E${signRow}`, session.witness ?? '')
  setCellSafe(ws1, `H${signRow}`, session.confirmer ?? report.confirmer ?? '')

  // 7) 시트 2 — 하자 사진 첨부
  if (ws2 && defects.length > 0) {
    fillPhotoSheet(wb, ws2, defects)
  }

  return wb
}

/**
 * Workbook → Blob 변환
 */
export async function workbookToBlob(wb) {
  const buffer = await wb.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

/**
 * Workbook → 파일 다운로드
 */
export async function downloadWorkbook(wb, filename) {
  const blob = await workbookToBlob(wb)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/* ────────── Helpers ────────── */

function setCellSafe(ws, ref, value) {
  try {
    const cell = ws.getCell(ref)
    cell.value = value
  } catch (e) {
    console.warn(`[templateExport] 셀 ${ref} 쓰기 실패:`, e)
  }
}

function formatDateKR(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d)) return dateStr
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
}

function fmtTime(d) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * 사진 첨부 시트 — 하자별 근경+원경 좌우 배치
 * 기본 템플릿은 사진 2쌍(4행씩) 분량. 초과 시 동적 확장.
 */
function fillPhotoSheet(wb, ws, defects) {
  // 사진 시작 행 (기본 템플릿: 행 4 부터)
  let row = 4
  const photoBlockHeight = 5 // 사진 영역 + 설명 행들

  defects.forEach((d, i) => {
    // 행이 부족하면 삽입
    const neededRow = row + photoBlockHeight
    while (ws.rowCount < neededRow) {
      ws.addRow([])
    }

    // 근경 (좌측 A~C)
    setCellSafe(ws, `A${row + photoBlockHeight - 2}`, `사진 ${i + 1}`)
    setCellSafe(ws, `B${row + photoBlockHeight - 2}`, `위치 : ${d.location ?? ''}`)
    setCellSafe(ws, `C${row + photoBlockHeight - 2}`, `분류코드 : ${TRADE_TO_TEMPLATE_CODE[d.trade] ?? ''}`)
    setCellSafe(ws, `A${row + photoBlockHeight - 1}`, `설명 : ${d.defect_type ?? ''}`)

    if (d.image_crop) {
      try {
        const ext = guessImageExt(d.image_crop)
        const imgId = wb.addImage({ base64: stripBase64Header(d.image_crop), extension: ext })
        ws.addImage(imgId, {
          tl: { col: 0, row: row - 1 },
          br: { col: 3, row: row - 1 + 3 },
        })
      } catch {
        setCellSafe(ws, `A${row}`, '[이미지 삽입 실패]')
      }
    } else {
      setCellSafe(ws, `A${row}`, '[사진 없음]')
    }

    // 원경 (우측 E~G)
    setCellSafe(ws, `E${row + photoBlockHeight - 2}`, `사진 ${i + 1}-1`)
    setCellSafe(ws, `F${row + photoBlockHeight - 2}`, `위치 : ${d.location ?? ''}`)
    setCellSafe(ws, `G${row + photoBlockHeight - 2}`, `분류코드 : ${TRADE_TO_TEMPLATE_CODE[d.trade] ?? ''}`)
    setCellSafe(ws, `E${row + photoBlockHeight - 1}`, `설명 : ${d.defect_type ?? ''} (원경)`)

    if (d.image_wide) {
      try {
        const ext = guessImageExt(d.image_wide)
        const imgId = wb.addImage({ base64: stripBase64Header(d.image_wide), extension: ext })
        ws.addImage(imgId, {
          tl: { col: 4, row: row - 1 },
          br: { col: 7, row: row - 1 + 3 },
        })
      } catch {
        setCellSafe(ws, `E${row}`, '[이미지 삽입 실패]')
      }
    } else {
      setCellSafe(ws, `E${row}`, '[사진 없음]')
    }

    row += photoBlockHeight
  })
}

/** base64 data URL 에서 mime → 확장자 추정 */
function guessImageExt(dataUrl) {
  if (!dataUrl) return 'png'
  if (dataUrl.includes('image/jpeg') || dataUrl.includes('image/jpg')) return 'jpeg'
  if (dataUrl.includes('image/png')) return 'png'
  if (dataUrl.includes('image/webp')) return 'png' // ExcelJS 가 webp 미지원 — png fallback
  return 'png'
}

/** "data:image/png;base64,xxxx" → "xxxx" */
function stripBase64Header(dataUrl) {
  if (!dataUrl) return ''
  const idx = dataUrl.indexOf(',')
  return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl
}
