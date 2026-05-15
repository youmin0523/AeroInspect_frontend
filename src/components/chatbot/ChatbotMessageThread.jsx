/**
 * components/chatbot/ChatbotMessageThread.jsx
 * 역할: 활성 thread 의 메시지 스크롤 영역
 *       - 빈 상태: 안내 문구 + 추천 질문 (선택)
 *       - 스트리밍 중: streamingDraft 를 임시 assistant bubble 로 렌더
 *       - 새 메시지 추가 시 자동 스크롤 하단
 */

import { useEffect, useRef } from 'react'
import { Sparkles, AlertTriangle } from 'lucide-react'
import useAiChatStore from '../../store/aiChatStore.js'
import ChatbotMessageBubble from './ChatbotMessageBubble.jsx'

// zustand selector 가 매 렌더마다 새 `[]` 를 반환하면 useSyncExternalStore 무한 루프 → 패널 unmount.
// 캐시 미스(thread 첫 선택 직후 fetchMessages 응답 전) 시 항상 같은 ref 를 반환하도록 모듈 상수 사용.
const EMPTY_MESSAGES = []

export default function ChatbotMessageThread() {
  const activeThreadId = useAiChatStore((s) => s.activeThreadId)
  const messages = useAiChatStore(
    (s) => s.messagesByThread[s.activeThreadId] || EMPTY_MESSAGES,
  )
  const messagesLoading = useAiChatStore((s) => s.messagesLoading)
  const streaming = useAiChatStore((s) => s.streaming)
  const streamingDraft = useAiChatStore((s) => s.streamingDraft)
  const error = useAiChatStore((s) => s.error)
  const clearError = useAiChatStore((s) => s.clearError)

  const bottomRef = useRef(null)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [activeThreadId, messages.length, streamingDraft])

  const isEmpty = !messagesLoading && messages.length === 0 && !streaming

  return (
    <div className="h-full overflow-y-auto px-4 py-3 bg-gray-50">
      {messagesLoading && (
        <div className="text-center text-xs text-gray-500 py-4">메시지를 불러오는 중…</div>
      )}

      {isEmpty && (
        <div className="flex flex-col items-center justify-center text-center py-10 text-gray-600">
          <Sparkles size={32} className="text-violet-500 mb-3" />
          <p className="text-sm font-semibold text-gray-900">새 대화를 시작해 주세요</p>
          <p className="text-xs text-gray-500 mt-1 max-w-[280px]">
            건축물·하자 도메인 질문(중대 결함·단열·방수·조치 등)을 자유롭게 입력해 주세요.
          </p>
        </div>
      )}

      {messages.map((m) => (
        <ChatbotMessageBubble key={m.id} message={m} />
      ))}

      {streaming && (
        <ChatbotMessageBubble
          message={{
            id: 'streaming',
            role: 'assistant',
            content: streamingDraft || '응답 생성 중…',
            created_at: new Date().toISOString(),
          }}
          streaming={!streamingDraft}
        />
      )}

      {error && (
        <div className="mt-2 flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <div className="flex-1">{error}</div>
          <button
            type="button"
            onClick={clearError}
            className="text-red-600 hover:text-red-800 font-semibold"
          >
            닫기
          </button>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
