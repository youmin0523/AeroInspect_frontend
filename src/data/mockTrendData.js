/**
 * data/mockTrendData.js
 * 역할: 경향보고서·주간업무보고서용 목(Mock) 데이터
 *       실제 DefectLog DB 연결 전까지 사용
 */

/* ── 하자 영역 정의 ────────────────────────── */
export const AREA_LABELS = {
  A: '구조체',
  B: '단열·방수',
  C: '마감재',
  D: '바닥',
  E: '창호·문',
}

export const AREA_COLORS = {
  A: '#6366f1', // indigo
  B: '#0ea5e9', // sky
  C: '#f59e0b', // amber
  D: '#10b981', // emerald
  E: '#f43f5e', // rose
}

/* ── 월별 하자 발생 추이 (최근 6개월) ──────── */
export const MONTHLY_TREND = [
  { month: '2025.11', total: 38, HIGH: 8,  MED: 18, LOW: 12, A: 6,  B: 12, C: 8,  D: 7,  E: 5 },
  { month: '2025.12', total: 45, HIGH: 10, MED: 20, LOW: 15, A: 8,  B: 14, C: 10, D: 8,  E: 5 },
  { month: '2026.01', total: 52, HIGH: 12, MED: 24, LOW: 16, A: 9,  B: 16, C: 11, D: 9,  E: 7 },
  { month: '2026.02', total: 41, HIGH: 9,  MED: 18, LOW: 14, A: 7,  B: 13, C: 9,  D: 7,  E: 5 },
  { month: '2026.03', total: 58, HIGH: 14, MED: 26, LOW: 18, A: 10, B: 19, C: 12, D: 10, E: 7 },
  { month: '2026.04', total: 47, HIGH: 11, MED: 21, LOW: 15, A: 8,  B: 15, C: 10, D: 8,  E: 6 },
]

/* ── 하자 유형별 상세 (파레토용) ────────────── */
export const DEFECT_BY_CATEGORY = [
  { code: 'B-02', name: '결로·곰팡이',     area: 'B', count: 34, pct: 12.1 },
  { code: 'B-03', name: '단열재 시공불량',  area: 'B', count: 28, pct: 10.0 },
  { code: 'A-01', name: '균열 (0.3mm 이상)', area: 'A', count: 24, pct: 8.6 },
  { code: 'C-01', name: '도장 불량',        area: 'C', count: 22, pct: 7.9 },
  { code: 'D-01', name: '바닥 레벨 불량',   area: 'D', count: 20, pct: 7.1 },
  { code: 'B-01', name: '누수·침투',        area: 'B', count: 19, pct: 6.8 },
  { code: 'C-03', name: '타일 파손·들뜸',   area: 'C', count: 17, pct: 6.1 },
  { code: 'E-01', name: '창호 기밀 불량',   area: 'E', count: 15, pct: 5.4 },
  { code: 'A-02', name: '철근 노출',        area: 'A', count: 14, pct: 5.0 },
  { code: 'D-02', name: '마루 들뜸',        area: 'D', count: 12, pct: 4.3 },
]

/* ── 심각도 분포 ───────────────────────────── */
export const SEVERITY_DIST = [
  { name: '경미 (LOW)',  value: 90,  color: '#eab308', pct: 32.0 },
  { name: '보통 (MED)',  value: 127, color: '#f97316', pct: 45.2 },
  { name: '중대 (HIGH)', value: 64,  color: '#ef4444', pct: 22.8 },
]

/* ── 시행사(발주처)별 하자 패턴 ─────────────── */
export const BUILDER_PATTERN = [
  { builder: '현대건설', A: 8,  B: 18, C: 10, D: 8,  E: 5, total: 49 },
  { builder: 'GS건설',  A: 12, B: 22, C: 14, D: 10, E: 8, total: 66 },
  { builder: '삼성물산', A: 5,  B: 8,  C: 6,  D: 4,  E: 3, total: 26 },
]

/* ── 조치 현황 ─────────────────────────────── */
export const ACTION_STATUS = [
  { name: '조치 완료', value: 198, color: '#10b981', pct: 70.5 },
  { name: '진행 중',   value: 53,  color: '#f59e0b', pct: 18.9 },
  { name: '미조치',    value: 30,  color: '#ef4444', pct: 10.6 },
]

/* ── 대표 하자 사례 (image_crop 대신 placeholder) ── */
export const SAMPLE_DEFECTS = [
  { id: 'd1', category: 'B-02', name: '결로·곰팡이', severity: 'HIGH', site: '위례 자이 201동~205동', location: '지하1층 복도 천장', confidence: 0.94, date: '2026-02-20', description: '지하 주차장 상부 슬래브 접합부에서 결로 발생, 곰팡이 확산 확인. 단열 보강 필요.' },
  { id: 'd2', category: 'B-03', name: '단열재 시공불량', severity: 'HIGH', site: '송파 헬리오시티 101동~109동', location: '103동 15층 외벽', confidence: 0.91, date: '2026-04-12', description: '외벽 단열재 이음부 3cm 이상 간격 발생, 열화상 촬영 시 열교 현상 확인.' },
  { id: 'd3', category: 'A-01', name: '균열 (0.3mm 이상)', severity: 'MED', site: '위례 자이 201동~205동', location: '204동 3층 계단실', confidence: 0.88, date: '2026-02-22', description: '계단실 벽체 수직 균열 0.5mm, 구조적 검토 권고.' },
  { id: 'd4', category: 'C-01', name: '도장 불량', severity: 'LOW', site: '송파 헬리오시티 101동~109동', location: '107동 12층 복도', confidence: 0.85, date: '2026-04-15', description: '복도 천장 도장면 박리 및 색상 불균일. 재도장 필요.' },
]

/* ── AI 경향 분석 코멘트 (Mock) ────────────── */
export const AI_TREND_COMMENTARY = `## 종합 경향 분석

### 1. 핵심 발견사항
- **단열·방수(B영역) 하자가 전체의 42.3%**를 차지하며, 특히 결로·곰팡이(B-02)와 단열재 시공불량(B-03)이 상위 1·2위를 기록하고 있습니다.
- 최근 6개월간 하자 발생이 **2026년 3월 최대치(58건)**를 기록한 후 4월 47건으로 감소 추세입니다.
- **GS건설 현장에서 단열·방수 관련 하자가 타 시행사 대비 1.5배** 높게 검출되었습니다.

### 2. 위험 경고
- HIGH 심각도 하자 비율이 22.8%로 전월(24.1%) 대비 소폭 감소했으나, **미조치 건수(30건, 10.6%)가 지속 증가** 중이므로 조치 속도 개선이 필요합니다.
- 균열(A-01) 발생이 3월 이후 증가 추세이며, 구조 안전 관련 중점 모니터링이 필요합니다.

### 3. 권고사항
1. **GS건설 위례 자이 현장**: 단열재 시공 품질 관리 강화 — 외벽 이음부 시공 기준 재교육 실시
2. **단열·방수 집중 점검**: 하절기 진입 전 결로 취약 구간(지하층, 최상층) 사전 점검 시행
3. **미조치 하자 처리**: 30건 미조치 하자에 대한 시행사별 시정 기한 설정 및 추적 관리
4. **열화상 카메라 활용 확대**: 단열 하자 조기 발견을 위해 전 현장 열화상 비행 비율 확대 권고`

/* ── 주간업무보고서용 데이터 ───────────────── */

/** 금주 날짜 범위 계산 (월요일 기준) */
export function getWeekRange(baseDate = new Date()) {
  const d = new Date(baseDate)
  const day = d.getDay()
  const diffToMon = day === 0 ? -6 : 1 - day
  const mon = new Date(d)
  mon.setDate(d.getDate() + diffToMon)
  const fri = new Date(mon)
  fri.setDate(mon.getDate() + 4)
  return {
    start: mon.toISOString().slice(0, 10),
    end: fri.toISOString().slice(0, 10),
    label: `${mon.getMonth() + 1}/${mon.getDate()} ~ ${fri.getMonth() + 1}/${fri.getDate()}`,
  }
}

export function getLastWeekRange(baseDate = new Date()) {
  const d = new Date(baseDate)
  d.setDate(d.getDate() - 7)
  return getWeekRange(d)
}

/** 전주 실적 (Mock) */
export const LAST_WEEK_TASKS = [
  { id: 'lw1', site: '송파 헬리오시티 101동~109동', task: '103동~105동 사전점검 비행', assignee: '유민수', planned: true, done: true, note: '하자 18건 검출, 보고서 발행 완료' },
  { id: 'lw2', site: '송파 헬리오시티 101동~109동', task: '106동 도면 사전 업로드', assignee: '백승희', planned: true, done: true, note: 'L1 CAD 업로드 완료' },
  { id: 'lw3', site: '성북구 성북로 23-5', task: '하자점검 1차 비행', assignee: '백승희', planned: true, done: true, note: '하자 5건 검출' },
  { id: 'lw4', site: '판교 알파돔시티 A·B·C동', task: '사전 도면 확보 및 현장 답사', assignee: '오희진', planned: true, done: false, note: '도면 수령 지연 (삼성물산 회신 대기)' },
  { id: 'lw5', site: '위례 자이 201동~205동', task: '최종 보고서 납품', assignee: '유민수', planned: false, done: true, note: '긴급 요청으로 추가 진행' },
]

/** 금주 계획 (Mock) */
export const THIS_WEEK_TASKS = [
  { id: 'tw1', site: '송파 헬리오시티 101동~109동', task: '107동~109동 사전점검 비행', assignee: '유민수', priority: 'P1', targetDate: '04/21~22' },
  { id: 'tw2', site: '성북구 성북로 23-5', task: '하자점검 2차 비행 + 보고서 작성', assignee: '백승희', priority: 'P1', targetDate: '04/22' },
  { id: 'tw3', site: '판교 알파돔시티 A·B·C동', task: '도면 수령 및 L1 업로드', assignee: '오희진', priority: 'P2', targetDate: '04/23' },
  { id: 'tw4', site: '강남 래미안 1단지 103동 1201호', task: '담당자 배정 및 일정 조율', assignee: '백승희', priority: 'P2', targetDate: '04/24' },
  { id: 'tw5', site: '—', task: '월간 경향보고서 작성 및 공유', assignee: '유민수', priority: 'P3', targetDate: '04/25' },
]

/** 현안·리스크 (Mock) */
export const ISSUES = [
  { id: 'i1', level: 'red', title: '판교 알파돔시티 도면 미수령', desc: '삼성물산 측 도면 회신 3일째 지연 중. 5월 착수 일정에 영향 우려.', action: '금주 수요일까지 미수령 시 오희진 직접 방문 수령 예정' },
  { id: 'i2', level: 'yellow', title: '강남 래미안 담당자 배정 완료', desc: 'B2C 의뢰 건 담당자 배정 완료 (백승희). 점검일(4/25) 일정 확정.', action: '백승희 주도, 유민수 백업 지원' },
  { id: 'i3', level: 'green', title: '송파 헬리오시티 일정 정상 진행', desc: '전체 9동 중 6동 완료(66.7%), 금주 잔여 3동 점검 예정.', action: '예정대로 진행' },
]

/** 주간 KPI (Mock) */
export const WEEKLY_KPI = {
  planCompletion: 80,   // 계획 달성률
  inspectionCount: 4,    // 전주 점검 건수
  defectsFound: 23,      // 전주 하자 발견 건수
  reportsPublished: 3,   // 전주 보고서 발행 건수
  openIssues: 2,         // 미결 현안 건수
}

/** AI 주간 코멘트 (Mock) */
export const AI_WEEKLY_COMMENTARY = `### 금주 핵심 요약
1. **전주 계획 달성률 80%** — 5건 중 4건 완료, 판교 도면 수령 건 이월
2. **하자 23건 검출** — 송파 헬리오시티 18건, 성북구 단독주택 5건. 단열 관련 하자 비중 높음
3. **강남 래미안 B2C 건 긴급 배정 필요** — 4/25 점검일까지 담당자 확정 필수`
