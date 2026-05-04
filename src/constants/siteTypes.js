/**
 * constants/siteTypes.js
 * 역할: 현장관리 관련 enum 상수 — 건물 유형, 현장 상태, 의뢰 유형
 */

/** 건물 유형 */
export const BUILDING_TYPES = [
  { value: '아파트',     label: '아파트' },
  { value: '오피스텔',   label: '오피스텔' },
  { value: '상가',       label: '상가' },
  { value: '주상복합',   label: '주상복합' },
  { value: '오피스',     label: '오피스' },
  { value: '단독주택',   label: '단독주택' },
  { value: '기타',       label: '기타' },
]

/** 현장 상태 */
export const SITE_STATUS = [
  { value: 'active',    label: '진행 중', color: 'green' },
  { value: 'pending',   label: '예정',    color: 'yellow' },
  { value: 'completed', label: '완료',    color: 'gray' },
  { value: 'cancelled', label: '취소',    color: 'red' },
]

/** 점검 구분 */
export const INSPECTION_TYPES = [
  { value: '사전점검',   label: '사전점검' },
  { value: '입주점검',   label: '입주점검' },
  { value: '정기점검',   label: '정기점검' },
  { value: '하자점검',   label: '하자점검' },
  { value: '특별점검',   label: '특별점검' },
  { value: '기타',       label: '기타' },
]

/** 의뢰 유형 (B2B / B2C) */
export const CLIENT_TYPES = [
  { value: 'B2B', label: 'B2B (기업)',  clientLabel: '발주처/시행사', contactLabel: '담당자 연락처' },
  { value: 'B2C', label: 'B2C (개인)',  clientLabel: '의뢰인',       contactLabel: '의뢰인 연락처' },
]

/** 상태 value → 표시 정보 빠른 조회 */
export const STATUS_MAP = Object.fromEntries(SITE_STATUS.map((s) => [s.value, s]))

/** 의뢰 유형 value → 표시 정보 빠른 조회 */
export const CLIENT_TYPE_MAP = Object.fromEntries(CLIENT_TYPES.map((c) => [c.value, c]))
