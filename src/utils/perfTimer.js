/**
 * utils/perfTimer.js
 * 역할: 사용자 체감 속도 측정 도구.
 *       - 로그인/업로드/재생 시작 같은 핵심 사용자 액션의 정확한 시간 측정
 *       - Performance API 기반 — performance.now()로 ms 단위 마이크로타임
 *       - 측정 결과를 sessionStorage에 누적 저장 + window 이벤트로 위젯에 통보
 *       - 콘솔 출력으로 개발자 즉시 확인 가능
 *
 * 사용 패턴:
 *   import { perfStart, perfEnd } from '../utils/perfTimer'
 *
 *   perfStart('login')
 *   try {
 *     await loginApi(...)
 *   } finally {
 *     perfEnd('login')   // 자동으로 console.log + sessionStorage 누적 + 위젯 통보
 *   }
 */

const STORAGE_KEY = 'perfTimer_records'
const EVENT_NAME = 'perfTimer:record'
const _starts = new Map()

/**
 * 측정 시작. label은 unique key (login, upload-12345, dashboard-mount 등).
 * 같은 label로 다시 호출하면 이전 측정은 폐기됨 (재측정 의도).
 */
export function perfStart(label) {
  if (typeof performance === 'undefined') return
  _starts.set(label, performance.now())
}

/**
 * 측정 종료 + 결과 반환 (ms). 시작이 없으면 null.
 * 결과는 콘솔 출력 + sessionStorage 누적 + window 이벤트 발화.
 */
export function perfEnd(label, extra = null) {
  if (typeof performance === 'undefined') return null
  const start = _starts.get(label)
  if (start === undefined) {
    console.warn(`[PerfTimer] perfEnd("${label}") 호출됐지만 perfStart 누락`)
    return null
  }
  _starts.delete(label)
  const duration = Math.round(performance.now() - start)
  const record = {
    label,
    duration,
    timestamp: Date.now(),
    ...(extra ? { extra } : {}),
  }
  // 콘솔 출력 — 개발자 즉시 확인
  const tag = duration < 200 ? '⚡' : duration < 500 ? '✓' : duration < 1500 ? '⏳' : '🐢'
  console.log(`[PerfTimer] ${tag} ${label}: ${duration}ms`, extra || '')
  // sessionStorage 누적 (최대 50건, FIFO)
  try {
    const arr = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]')
    arr.push(record)
    while (arr.length > 50) arr.shift()
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(arr))
  } catch {
    // quota / parse 실패 무시
  }
  // 위젯/구독자 통보
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: record }))
  }
  return duration
}

/**
 * sessionStorage에 누적된 모든 측정 기록 반환.
 */
export function perfRecords() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

/**
 * 누적 기록 초기화.
 */
export function perfClear() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch { /* ignore */ }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: null }))
  }
}

export const PERF_EVENT = EVENT_NAME
