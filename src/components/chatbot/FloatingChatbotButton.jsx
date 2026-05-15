/**
 * components/chatbot/FloatingChatbotButton.jsx
 * 역할: /employee/* 페이지 우하단 FAB — AI 챗봇 패널 토글
 *       - 기존 메신저 FAB(파랑, right-6) 와 시각 구분: violet, right-24
 *       - 아이콘: Sparkles (lucide-react)
 *       - 접근성: aria-expanded + title
 */

import { Sparkles, X } from 'lucide-react'
import useAiChatStore from '../../store/aiChatStore.js'

export default function FloatingChatbotButton() {
  const isOpen = useAiChatStore((s) => s.isOpen)
  const toggle = useAiChatStore((s) => s.toggle)

  return (
    <button
      type="button"
      onClick={toggle}
      aria-expanded={isOpen}
      aria-label={isOpen ? 'AI 어시스턴트 닫기' : 'AI 어시스턴트 열기'}
      title={isOpen ? '닫기' : 'AI 어시스턴트'}
      className="fixed bottom-6 right-24 z-50 group flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 pl-4 pr-4 py-3 hover:pr-5"
    >
      {isOpen ? (
        <X size={20} className="shrink-0" />
      ) : (
        <Sparkles size={20} className="shrink-0" />
      )}
      <span className="text-sm font-semibold max-w-0 overflow-hidden group-hover:max-w-[120px] transition-all duration-200 whitespace-nowrap">
        AI 어시스턴트
      </span>
    </button>
  )
}
