/**
 * constants/defectCategories.js
 * 역할: 하자 카테고리 20종 정의 (계획서 섹션 9 기준)
 *       - 5개 영역(A~E), 심각도(HIGH/MED/LOW) 매핑
 *       - YOLOv8 class_name과 1:1 대응
 *       - 심각도별 UI 컬러 상수 포함
 *       - 백엔드 severity_mapper.py와 동일한 정의 유지
 */

/** 5개 영역 정의 */
export const DEFECT_AREAS = {
  A: { label: '구조·기하학',      color: '#ef4444' },
  B: { label: '단열·방수·기밀',   color: '#f97316' },
  C: { label: '마감재·표면',      color: '#eab308' },
  D: { label: '바닥',             color: '#22c55e' },
  E: { label: '창호·문 외관',     color: '#3b82f6' },
}

/** 심각도별 UI 설정 */
export const SEVERITY_CONFIG = {
  HIGH: {
    label: 'HIGH',
    labelKo: '즉시 보수',
    color: '#ef4444',
    bgClass: 'badge-high',
    description: '구조 안전·방수·단열 성능 직결 — 즉시 보수 필요',
  },
  MED: {
    label: 'MED',
    labelKo: '조치 권고',
    color: '#f97316',
    bgClass: 'badge-med',
    description: '기능 저하 또는 생활 불편 유발 — 입주 전 조치 권고',
  },
  LOW: {
    label: 'LOW',
    labelKo: '협의 보수',
    color: '#eab308',
    bgClass: 'badge-low',
    description: '마감 미관 불량 — 입주 후 협의하여 보수 가능',
  },
}

/** 20종 하자 카테고리 전체 정의 */
export const DEFECT_CATEGORIES = {
  // ── A. 구조·기하학 영역 ─────────────────
  'A-01': {
    code: 'A-01',
    name: '벽·천장 수직·수평도 불량',
    area: 'A',
    severity: 'HIGH',
    technique: 'LiDAR RANSAC',
    className: 'vertical_horizontal_defect',
  },
  'A-02': {
    code: 'A-02',
    name: '균열 (구조 균열)',
    area: 'A',
    severity: 'HIGH',
    technique: 'YOLOv8-seg + 폭 추정',
    className: 'crack_structural',
  },
  'A-03': {
    code: 'A-03',
    name: '균열 (마감 균열)',
    area: 'A',
    severity: 'MED',
    technique: 'YOLOv8 미세 검출',
    className: 'crack_finishing',
  },
  'A-04': {
    code: 'A-04',
    name: '문·창호 틀 직각도 불량',
    area: 'A',
    severity: 'MED',
    technique: 'LiDAR + 엣지',
    className: 'frame_squareness_defect',
  },

  // ── B. 단열·방수·기밀 영역 ──────────────
  'B-01': {
    code: 'B-01',
    name: '창호 단열 불량 (결로·냉교)',
    area: 'B',
    severity: 'HIGH',
    technique: '열화상 (IR)',
    className: 'window_insulation_defect',
  },
  'B-02': {
    code: 'B-02',
    name: '벽체 단열 공백·탈락',
    area: 'B',
    severity: 'HIGH',
    technique: '열화상 융합',
    className: 'wall_insulation_gap',
  },
  'B-03': {
    code: 'B-03',
    name: '코킹 누락·불량',
    area: 'B',
    severity: 'HIGH',
    technique: 'SAM + YOLO',
    className: 'caulking_defect',
  },
  'B-04': {
    code: 'B-04',
    name: '방수층 들뜸 / 누수 흔적',
    area: 'B',
    severity: 'HIGH',
    technique: '열화상 + RGB',
    className: 'waterproof_defect',
  },
  'B-05': {
    code: 'B-05',
    name: '창호 기밀 불량 (틈새)',
    area: 'B',
    severity: 'MED',
    technique: 'LiDAR 미세 측정',
    className: 'window_airtight_defect',
  },

  // ── C. 마감재·표면 영역 ─────────────────
  'C-01': {
    code: 'C-01',
    name: '도배 이음매 불량',
    area: 'C',
    severity: 'MED',
    technique: 'YOLOv8 + Canny',
    className: 'wallpaper_seam_defect',
  },
  'C-02': {
    code: 'C-02',
    name: '도배지 기포·들뜸',
    area: 'C',
    severity: 'MED',
    technique: '이상 탐지 PatchCore',
    className: 'wallpaper_bubble',
  },
  'C-03': {
    code: 'C-03',
    name: '도색 얼룩·붓자국',
    area: 'C',
    severity: 'LOW',
    technique: '색상 균일도 CV 분석',
    className: 'paint_stain',
  },
  'C-04': {
    code: 'C-04',
    name: '찍힘·스크래치 (벽·천장)',
    area: 'C',
    severity: 'LOW',
    technique: 'PatchCore 이상 탐지',
    className: 'scratch_wall',
  },
  'C-05': {
    code: 'C-05',
    name: '걸레받이 오염·파손',
    area: 'C',
    severity: 'LOW',
    technique: 'HSV + ResNet',
    className: 'baseboard_damage',
  },

  // ── D. 바닥 영역 ────────────────────────
  'D-01': {
    code: 'D-01',
    name: '바닥 난방 불량 (온도 편차)',
    area: 'D',
    severity: 'HIGH',
    technique: '열화상 스캔',
    className: 'floor_heating_defect',
  },
  'D-02': {
    code: 'D-02',
    name: '바닥재 들뜸 (공명 감지)',
    area: 'D',
    severity: 'MED',
    technique: '열화상 + 진동 센서 융합',
    className: 'floor_lifting',
  },
  'D-03': {
    code: 'D-03',
    name: '바닥 오염·스크래치',
    area: 'D',
    severity: 'LOW',
    technique: 'RGB + PatchCore',
    className: 'floor_stain',
  },
  'D-04': {
    code: 'D-04',
    name: '줄눈 불량 (타일·마루)',
    area: 'D',
    severity: 'LOW',
    technique: '엣지 검출 + CNN',
    className: 'grout_defect',
  },

  // ── E. 창호·문 외관 영역 ────────────────
  'E-01': {
    code: 'E-01',
    name: '창호 유리 스크래치·파손',
    area: 'E',
    severity: 'MED',
    technique: 'YOLOv8 고반사 탐지',
    className: 'glass_scratch',
  },
  'E-02': {
    code: 'E-02',
    name: '창틀·문틀 도장 불량',
    area: 'E',
    severity: 'LOW',
    technique: 'HSV 균일도',
    className: 'frame_paint_defect',
  },
}

/** 전체 카테고리 배열 (목록 렌더링용) */
export const DEFECT_CATEGORIES_LIST = Object.values(DEFECT_CATEGORIES)

/** 영역별 그룹핑 */
export const DEFECT_BY_AREA = Object.entries(DEFECT_AREAS).reduce((acc, [area]) => {
  acc[area] = DEFECT_CATEGORIES_LIST.filter((d) => d.area === area)
  return acc
}, {})

/** 심각도별 그룹핑 */
export const DEFECT_BY_SEVERITY = {
  HIGH: DEFECT_CATEGORIES_LIST.filter((d) => d.severity === 'HIGH'),
  MED:  DEFECT_CATEGORIES_LIST.filter((d) => d.severity === 'MED'),
  LOW:  DEFECT_CATEGORIES_LIST.filter((d) => d.severity === 'LOW'),
}
