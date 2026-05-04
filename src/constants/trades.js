/**
 * constants/trades.js
 * 역할: 건설 공종(Trade) 목록 + defect.category_code → 공종 1차 매핑 (heuristic)
 *       - 리포트 편집 시 공종 드롭다운의 options 로 사용
 *       - suggestTrade(defect) 가 이 매핑으로 1차 제안 → 사용자가 수정
 *       - 추후 Claude API 엔드포인트로 업그레이드 시 이 휴리스틱은 fallback 으로 보존
 */

/** 공종 마스터 목록 — 리포트 편집 드롭다운 options */
export const TRADES = [
  '골조',          // 콘크리트 구조
  '도배',
  '도장',
  '타일',
  '목공',
  '마루/바닥재',
  '창호',          // 유리·창틀·문틀
  '방수',
  '단열',
  '설비',          // 기계·난방·위생
  '전기',
  '기타',
]

/**
 * DEFECT_CATEGORIES 의 code → 공종 매핑.
 * defectCategories.js 와 병행 유지 — 카테고리가 추가되면 여기에도 매핑 추가.
 * 백엔드 연결 후 DB 의 defect_category 테이블에 trade 컬럼 추가하면 이 상수는 제거/축소 가능.
 */
export const CATEGORY_TRADE_MAP = {
  // A. 구조·기하학
  'A-01': '골조',
  'A-02': '골조',
  'A-03': '도장',     // 마감 균열은 미장/도장
  'A-04': '창호',     // 문·창호 틀 직각도

  // B. 단열·방수·기밀
  'B-01': '창호',     // 창호 단열
  'B-02': '단열',     // 벽체 단열
  'B-03': '방수',     // 코킹 (주로 창호 주변이지만 방수 분류)
  'B-04': '방수',
  'B-05': '창호',

  // C. 마감재·표면
  'C-01': '도배',
  'C-02': '도배',
  'C-03': '도장',
  'C-04': '도장',
  'C-05': '목공',     // 걸레받이

  // D. 바닥
  'D-01': '설비',     // 바닥 난방 (기계설비)
  'D-02': '마루/바닥재',
  'D-03': '마루/바닥재',
  'D-04': '타일',     // 줄눈(타일·마루 구분되지만 주로 타일)

  // E. 창호·문 외관
  'E-01': '창호',
  'E-02': '도장',
}

/**
 * 휴리스틱 공종 제안 — category_code 기반 1차 매핑.
 * 실패 시 '기타' 반환. 향후 Claude API (POST /report/suggest-trade) 로 교체 가능.
 */
export function suggestTradeFromCode(code) {
  if (!code) return '기타'
  return CATEGORY_TRADE_MAP[code] ?? '기타'
}

/**
 * 실내 장소 프리셋 — 리포트 편집기 datalist 에서 제안되는 기본 방 이름.
 * location 은 하자별 자유 입력 문자열(area 와 무관). 사용자가 직접 입력도 가능하고,
 * 리포트 편집기의 "장소 라벨 일괄 편집" 에서 현재 사용 중인 값을 한 번에 rename 할 수 있음.
 */
export const LOCATION_PRESETS = ['거실', '공용주방', '방1', '방2', '방3', '욕실', '발코니', '현관']

/**
 * 신규 하자 수신 시 초기 장소 추정 휴리스틱 — area 코드 기반.
 *   //! [Original Code v1] DEFAULT_LOCATION_MAP 으로 area → 방 1:1 매핑 (개념적으로 혼동 유발)
 *   //* [Modified Code v2] 초기값 추정 용도로만 사용. 하자별 location 필드는 독립 편집.
 *
 * 향후 3D 좌표(lidar_xyz) + 사전 모델의 room segmentation 으로 교체 가능.
 */
const INITIAL_LOCATION_BY_AREA = {
  A: '거실',
  B: '공용주방',
  C: '방1',
  D: '방2',
  E: '방3',
}

/** 초기 location 추정. 사용자 편집 가능 (area 와 무관한 독립 필드). */
export function inferInitialLocation(area) {
  return INITIAL_LOCATION_BY_AREA[area] ?? ''
}

/* ──────────────────────────────────────────────────────────────
   양식 내보내기 전용 매핑 (하자점검_결과보고서.xlsx 대응)
   ────────────────────────────────────────────────────────────── */

/** 시스템 12종 공종 → 양식 분류코드 A~F 6종 매핑 */
export const TRADE_TO_TEMPLATE_CODE = {
  '골조':       'E',
  '도배':       'A',
  '도장':       'A',
  '타일':       'B',
  '목공':       'C',
  '마루/바닥재': 'C',
  '창호':       'D',
  '방수':       'E',
  '단열':       'E',
  '설비':       'E',
  '전기':       'F',
  '기타':       'E',
}

/** 양식 분류코드 → 라벨 (범례 및 미리보기 표시용) */
export const TEMPLATE_CODE_LABELS = {
  A: '도장·도배',
  B: '타일·석재',
  C: '목공·수장',
  D: '창호',
  E: '금속·잡철',
  F: '전기·조명',
}

/** 시스템 심각도 → 양식 등급 (역순) */
export const SEVERITY_TO_GRADE = {
  HIGH: 'C',
  MED:  'B',
  LOW:  'A',
}

/** 양식 등급 → 라벨 */
export const GRADE_LABELS = {
  A: '경미',
  B: '보통',
  C: '중대',
}

/** 양식 분류코드 리스트 (드롭다운 등) */
export const TEMPLATE_CODES_LIST = Object.entries(TEMPLATE_CODE_LABELS).map(
  ([code, label]) => ({ code, label: `${code}. ${label}` })
)
