/**
 * components/chatbot/ChatbotPanel.jsx
 * 역할: 우측 sliding drawer — AI 챗봇 메인 UI
 *       - 뷰 모드: 'list' (대화방 목록) | 'thread' (대화 화면)
 *       - 모달 아니라 sidebar: 사용자가 화면 좌측 데이터를 보면서 질의 가능
 *       - ESC 키로 닫기, 외부 오버레이 클릭으로 닫기
 */

import { useEffect } from 'react'
import useAiChatStore from '../../store/aiChatStore.js'
import ChatbotPanelHeader from './ChatbotPanelHeader.jsx'
import ThreadList from './ThreadList.jsx'
import ChatbotMessageThread from './ChatbotMessageThread.jsx'
import ChatbotInput from './ChatbotInput.jsx'

export default function ChatbotPanel() {
  const isOpen = useAiChatStore((s) => s.isOpen)
  const close = useAiChatStore((s) => s.close)
  const view = useAiChatStore((s) => s.view)
  const activeThreadId = useAiChatStore((s) => s.activeThreadId)

  // ESC 닫기
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, close])

  if (!isOpen) return null

  return (
    <>
      {/* 반투명 오버레이 (메인 콘텐츠 일부 가림, 클릭 시 닫기) */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
        onClick={close}
        aria-hidden
      />

      {/* 우측 슬라이딩 드로어 */}
      <aside
        role="dialog"
        aria-label="AI 챗봇"
        className="fixed top-0 right-0 z-50 h-screen w-full sm:w-[420px] md:w-[480px] lg:w-[560px] bg-white shadow-2xl flex flex-col"
      >
        <ChatbotPanelHeader />

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {view === 'list' || !activeThreadId ? (
            <ThreadList />
          ) : (
            <>
              <div className="flex-1 min-h-0 overflow-hidden">
                <ChatbotMessageThread />
              </div>
              <ChatbotInput />
            </>
          )}
        </div>
      </aside>
    </>
  )
}
