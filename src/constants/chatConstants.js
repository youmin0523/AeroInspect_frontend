/**
 * constants/chatConstants.js
 * 역할: 사내 메신저 상수 정의 — 대화 유형 · 사용자 상태 · 필터 탭 · 팀원 목록
 */

export const CONVERSATION_TYPES = {
  DM: 'dm',
  GROUP: 'group',
  CHANNEL: 'channel',
}

export const USER_STATUS = {
  ONLINE: 'online',
  AWAY: 'away',
  OFFLINE: 'offline',
}

export const USER_STATUS_CONFIG = {
  online:  { label: '온라인',   dot: 'bg-green-500' },
  away:    { label: '자리비움', dot: 'bg-yellow-500' },
  offline: { label: '오프라인', dot: 'bg-gray-400' },
}

export const CHAT_FILTER_TABS = [
  { value: 'all',     label: '전체' },
  { value: 'dm',      label: '1:1' },
  { value: 'group',   label: '그룹' },
  { value: 'channel', label: '채널' },
]

export const CHAT_TEAM_MEMBERS = [
  { id: 't1', name: '유민수', role: '과장', team: '안전진단 1팀', status: 'online', initials: 'YS' },
  { id: 't2', name: '백승희', role: '대리', team: '안전진단 1팀', status: 'online', initials: 'BS' },
  { id: 't3', name: '오희진', role: '대리', team: '안전진단 1팀', status: 'away',   initials: 'OH' },
]

/** Phase 1 mock 로그인 사용자 — 백엔드 연결 시 authStore.user 로 교체 */
export const CURRENT_USER = { id: 't1', name: '유민수', role: '과장', team: '안전진단 1팀', initials: 'YS' }
