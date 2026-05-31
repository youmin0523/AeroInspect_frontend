/**
 * utils/gradeStyle.js
 * 신뢰도 등급(grade) 시각화 헬퍼 — backend confidence_grader.py 와 1:1 대응
 *
 * 등급 (R-v1.1.10 도입, R-v1.1.16 임계 0.85→0.90):
 *   CONFIRMED  : 하자목록 등재(보고서). conf ≥0.90 or (≥0.75 + voting). 빨강.
 *   REVIEW     : 점검자 추가 확인 권장. 0.40~0.90. 노랑.
 *   REFERENCE  : 참고용 (점검자 모드 토글 시만). 0.20~0.40. 점선 회색.
 *   DROP       : 표시 X (backend에서 자동 제거).
 *
 * 사용 정책:
 *   - 보고서 등재: CONFIRMED만 (isListable)
 *   - 점검자 모드: CONFIRMED + REVIEW (isInspectorVisible)
 *   - 디버그 모드: 전부 노출 (REFERENCE 포함)
 */

export const GRADE_LABEL_KO = {
  CONFIRMED: '확정',
  REVIEW: '권장점검',
  REFERENCE: '참고용',
}

export const GRADE_DESCRIPTION = {
  CONFIRMED: '보고서 등재 — 분쟁 시 책임질 수준',
  REVIEW: '점검자 추가 확인 권장 — 보고서 미등재',
  REFERENCE: '참고용 — 점검자 모드 토글 시만 노출',
}

// Tailwind 색상 — DefectCard / DefectMarker / DefectFilter 공통
export const GRADE_STYLE = {
  CONFIRMED: {
    border: 'border-red-500/60 hover:border-red-500/80',
    bg: 'bg-red-500/10',
    text: 'text-red-300',
    badge: 'bg-red-500/20 border border-red-500/40 text-red-200',
    markerColor: '#ef4444', // red-500 (3D 마커/캔버스용)
  },
  REVIEW: {
    border: 'border-amber-500/50 hover:border-amber-500/70',
    bg: 'bg-amber-500/10',
    text: 'text-amber-300',
    badge: 'bg-amber-500/20 border border-amber-500/40 text-amber-200',
    markerColor: '#f59e0b', // amber-500
  },
  REFERENCE: {
    border: 'border-neutral-500/40 hover:border-neutral-500/60 border-dashed',
    bg: 'bg-neutral-500/5',
    text: 'text-neutral-400',
    badge: 'bg-neutral-500/20 border border-neutral-500/40 text-neutral-300',
    markerColor: '#9ca3af', // gray-400
  },
}

export function getGradeStyle(grade) {
  return GRADE_STYLE[grade] ?? GRADE_STYLE.REVIEW
}

export function getGradeLabel(grade) {
  return GRADE_LABEL_KO[grade] ?? grade ?? '미분류'
}

/** 보고서 하자목록 등재 여부 — CONFIRMED만 true */
export function isListable(grade) {
  return grade === 'CONFIRMED'
}

/** 점검자 모드 노출 여부 — CONFIRMED + REVIEW */
export function isInspectorVisible(grade) {
  return grade === 'CONFIRMED' || grade === 'REVIEW'
}

/** 디버그 모드 노출 여부 — 모든 등급 */
export function isDebugVisible(grade) {
  return ['CONFIRMED', 'REVIEW', 'REFERENCE'].includes(grade)
}

/** 검출 배열을 등급별로 그룹핑 */
export function groupByGrade(detections = []) {
  const grouped = { CONFIRMED: [], REVIEW: [], REFERENCE: [] }
  for (const d of detections) {
    const g = d.grade ?? 'REVIEW'
    if (grouped[g]) grouped[g].push(d)
  }
  return grouped
}
