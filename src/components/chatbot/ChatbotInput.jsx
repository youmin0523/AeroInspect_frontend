/**
 * components/chatbot/ChatbotInput.jsx
 * 역할: 챗봇 하단 입력
 *       - Enter 전송, Shift+Enter 줄바꿈
 *       - 스트리밍 중 비활성 + "중단" 버튼 표시
 *       - 최대 4000자 (백엔드 가드와 동일)
 */

import { useRef, useState } from 'react'
import { Send, Square } from 'lucide-react'
import useAiChatStore from '../../store/aiChatStore.js'

const MAX = 4000

export default function ChatbotInput() {
  const [text, setText] = useState('')
  const ref = useRef(null)
  const sendMessage = useAiChatStore((s) => s.sendMessage)
  const streaming = useAiChatStore((s) => s.streaming)
  const stopStreaming = useAiChatStore((s) => s.stopStreaming)

  const canSend = !streaming && text.trim().length > 0

  const handleSend = () => {
    if (!canSend) return
    const content = text.trim()
    setText('')
    sendMessage(content)
    ref.current?.focus()
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t border-gray-200 bg-white px-3 py-2">
      <div className="flex items-end gap-2">
        <textarea
          ref={ref}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX))}
          onKeyDown={onKeyDown}
          disabled={streaming}
          placeholder={
            streaming
              ? '응답 생성 중…'
              : '하자·건축물에 대해 질문해 주세요 (Enter 전송 / Shift+Enter 줄바꿈)'
          }
          className="flex-1 resize-none max-h-32 px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-violet-500 disabled:bg-gray-50 disabled:opacity-60"
        />
        {streaming ? (
          <button
            type="button"
            onClick={stopStreaming}
            className="shrink-0 p-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors"
            aria-label="응답 중단"
            title="중단"
          >
            <Square size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className="shrink-0 p-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="전송"
            title="전송"
          >
            <Send size={16} />
          </button>
        )}
      </div>
      <div className="mt-1 px-1 flex items-center justify-between text-[10px] text-gray-400">
        <span>건축 도메인 보조자 · 안전 직결 판단은 현장 확인 필수</span>
        <span>
          {text.length}/{MAX}
        </span>
      </div>
    </div>
  )
}
