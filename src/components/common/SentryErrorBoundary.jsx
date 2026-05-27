/**
 * SentryErrorBoundary.jsx
 * 역할: React 트리 최상위 ErrorBoundary
 *  - 자식 컴포넌트에서 throw 된 미처리 에러를 Sentry 로 전송
 *  - 사용자에게 친화 fallback UI 노출 (검정화면 방지)
 *  - "다시 시도" 버튼으로 boundary reset → 잘못된 라우트/일시 상태 복구 가능
 *
 * 안전: VITE_SENTRY_DSN 미설정이어도 동작 (Sentry.init 가 no-op 이면 캡처만 skip,
 *       fallback UI 는 그대로 작동 → 검정화면 없음).
 */

import { Sentry } from '../../lib/sentry.js'

function FallbackUI({ error, resetError }) {
  return (
    <div
      role="alert"
      className="min-h-screen flex items-center justify-center bg-neutral-50 px-4"
    >
      <div className="max-w-md w-full bg-white border border-neutral-200 rounded-2xl shadow-sm p-8 text-center">
        <div className="text-5xl mb-3" aria-hidden>!</div>
        <h1 className="text-xl font-semibold text-neutral-900 mb-2">
          예상치 못한 오류가 발생했습니다
        </h1>
        <p className="text-sm text-neutral-600 mb-6 leading-relaxed">
          이미 운영팀에 자동으로 보고되었습니다. 잠시 후 다시 시도해 주세요.
        </p>
        {error?.message && (
          <pre className="text-xs text-left bg-neutral-100 text-neutral-700 rounded-md p-3 mb-4 overflow-auto max-h-32">
            {String(error.message)}
          </pre>
        )}
        <div className="flex gap-2 justify-center">
          <button
            type="button"
            onClick={resetError}
            className="px-4 py-2 rounded-md bg-neutral-900 text-white text-sm hover:bg-neutral-700 transition"
          >
            다시 시도
          </button>
          <button
            type="button"
            onClick={() => {
              window.location.href = '/'
            }}
            className="px-4 py-2 rounded-md bg-white border border-neutral-300 text-neutral-700 text-sm hover:bg-neutral-50 transition"
          >
            처음 화면으로
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Sentry.ErrorBoundary 래퍼.
 * showDialog=false — 별도 피드백 모달 띄우지 않음 (사용자 흐름 방해 최소).
 */
export default function SentryErrorBoundary({ children }) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <FallbackUI error={error} resetError={resetError} />
      )}
      showDialog={false}
    >
      {children}
    </Sentry.ErrorBoundary>
  )
}
