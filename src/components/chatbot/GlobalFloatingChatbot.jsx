/**
 * components/chatbot/GlobalFloatingChatbot.jsx
 * 역할: App.jsx 에서 한 번만 마운트되는 챗봇 진입점
 *       - /employee/* 경로 + 로그인 상태에서만 노출
 *       - FAB + Panel 모두 렌더 (Panel 은 내부에서 isOpen 체크)
 */

import { useLocation } from 'react-router-dom'
import useAiChatStore from '../../store/aiChatStore.js'
import FloatingChatbotButton from './FloatingChatbotButton.jsx'
import ChatbotPanel from './ChatbotPanel.jsx'

export default function GlobalFloatingChatbot() {
  const { pathname } = useLocation()

  // 로그인 토큰 보유 시에만 노출. sessionStorage 직접 체크 → store 의존성 회피.
  const hasToken = typeof sessionStorage !== 'undefined' && !!sessionStorage.getItem('access_token')

  if (!pathname.startsWith('/employee')) return null
  if (!hasToken) return null

  return (
    <>
      <FloatingChatbotButton />
      <ChatbotPanel />
    </>
  )
}

// 외부에서 프로그래밍 방식 open 필요 시 사용
export const openChatbot = () => useAiChatStore.getState().open()
