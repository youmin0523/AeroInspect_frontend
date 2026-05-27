/**
 * main.jsx
 * 역할: React 18 애플리케이션 진입점
 *       - createRoot로 React 18 동시성 모드 활성화
 *       - #root DOM 노드에 App 컴포넌트 마운트
 *       - 전역 CSS (Tailwind) 임포트
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import { initSentry } from './lib/sentry.js'
import App from './App.jsx'
import './index.css'

// Sentry 초기화 — DSN(VITE_SENTRY_DSN) 미설정 시 자동 no-op (로컬 개발 영향 0)
// createRoot 이전 호출하여 렌더링 도중 발생하는 에러까지 캡처되도록.
initSentry()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
