/**
 * src/lib/sentry.js
 * 역할: 프론트엔드 Sentry 초기화 (브라우저 에러/성능/세션 리플레이 모니터링)
 *  - VITE_SENTRY_DSN 미설정 시 no-op (로컬 개발/CI 영향 0)
 *  - BrowserTracing: 라우트 전환·fetch 트랜잭션 자동 캡처
 *  - Replay: 에러 직전 30초 세션 영상 자동 첨부 (운영 디버깅 핵심)
 *  - beforeSend 훅에서 password/token/secret 키 redact
 *
 * 사용:
 *   import { initSentry } from './lib/sentry.js'
 *   initSentry()  // main.jsx 의 ReactDOM.createRoot 이전 호출
 */

import * as Sentry from '@sentry/react'

const REDACT_KEYS = [
  'password',
  'passwd',
  'token',
  'secret',
  'authorization',
  'api_key',
  'apikey',
  'client_secret',
  'refresh_token',
  'access_token',
  'session',
  'cookie',
]

const REDACTED = '[REDACTED]'

/**
 * dict/array 재귀 순회하며 민감 키 값을 [REDACTED] 로 치환.
 */
function redact(data) {
  if (Array.isArray(data)) return data.map(redact)
  if (data && typeof data === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(data)) {
      const keyLower = String(k).toLowerCase()
      if (REDACT_KEYS.some((needle) => keyLower.includes(needle))) {
        out[k] = REDACTED
      } else {
        out[k] = redact(v)
      }
    }
    return out
  }
  return data
}

/**
 * Sentry beforeSend 훅 — 전송 직전 민감 데이터 sanitize.
 */
function beforeSend(event) {
  try {
    if (event.request) {
      if (event.request.headers) event.request.headers = redact(event.request.headers)
      if (event.request.cookies) event.request.cookies = redact(event.request.cookies)
      if (event.request.data) event.request.data = redact(event.request.data)
      if (event.request.query_string) event.request.query_string = redact(event.request.query_string)
    }
    if (event.extra) event.extra = redact(event.extra)
    if (event.contexts) event.contexts = redact(event.contexts)
  } catch (e) {
    // 훅 자체 실패는 절대 이벤트 전송을 막지 않음 (관측 가능성 우선)
    console.warn('[sentry] beforeSend redact failed:', e)
  }
  return event
}

/**
 * Sentry 초기화. 안전(idempotent + no-op fallback).
 * Returns: true 면 실제 초기화됨, false 면 DSN 미설정으로 skip.
 */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) {
    // 로컬 개발 / 미설정 환경 — 조용히 skip
    return false
  }

  const environment = import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE || 'production'
  const release = import.meta.env.VITE_SENTRY_RELEASE || undefined
  const tracesSampleRate = Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0.1)
  const replaysSessionSampleRate = Number(import.meta.env.VITE_SENTRY_REPLAYS_SESSION_RATE ?? 0.0)
  const replaysOnErrorSampleRate = Number(import.meta.env.VITE_SENTRY_REPLAYS_ERROR_RATE ?? 1.0)

  try {
    Sentry.init({
      dsn,
      environment,
      release,
      // BrowserTracing + Replay 통합 (v8 신규 API)
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,         // 텍스트 마스킹 (사용자 입력 노출 방지)
          maskAllInputs: true,
          blockAllMedia: true,       // 카메라/드론 스트림 영상 차단
        }),
      ],
      tracesSampleRate,
      replaysSessionSampleRate,
      replaysOnErrorSampleRate,
      // 민감정보 자동 첨부 차단 (이메일/IP 등)
      sendDefaultPii: false,
      // 노이즈 줄이기 — 알려진 사용자 측 무시 가능 에러
      ignoreErrors: [
        'ResizeObserver loop completed with undelivered notifications',
        'ResizeObserver loop limit exceeded',
        'Non-Error promise rejection captured',
      ],
      beforeSend,
    })
    return true
  } catch (e) {
    // 어떤 이유로도 앱 부팅을 막지 않는다
    console.warn('[sentry] init failed:', e)
    return false
  }
}

export { Sentry }
