/**
 * main.jsx
 * 역할: React 18 애플리케이션 진입점
 *       - createRoot로 React 18 동시성 모드 활성화
 *       - #root DOM 노드에 App 컴포넌트 마운트
 *       - 전역 CSS (Tailwind) 임포트
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
