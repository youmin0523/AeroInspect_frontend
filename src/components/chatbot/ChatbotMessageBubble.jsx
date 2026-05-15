/**
 * components/chatbot/ChatbotMessageBubble.jsx
 * 역할: 단일 메시지 bubble
 *       - role=user  → 우측 정렬, violet 배경
 *       - role=assistant → 좌측 정렬, 흰 배경, react-markdown 렌더 (raw HTML 비허용)
 *       - streaming=true 시 펄스 인디케이터
 */

import ReactMarkdown from 'react-markdown'
import { Sparkles } from 'lucide-react'

export default function ChatbotMessageBubble({ message, streaming = false }) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-[80%] px-3 py-2 rounded-2xl rounded-tr-sm bg-violet-600 text-white text-sm whitespace-pre-wrap break-words shadow-sm">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start mb-3 gap-2">
      <div className="shrink-0 w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center mt-0.5">
        <Sparkles size={14} className="text-violet-600" />
      </div>
      <div
        className={`max-w-[85%] px-3 py-2 rounded-2xl rounded-tl-sm bg-white border border-gray-200 text-sm text-gray-900 break-words shadow-sm ${
          streaming ? 'opacity-70' : ''
        }`}
      >
        <ReactMarkdown
          // raw HTML/스크립트 차단 — XSS 방어
          disallowedElements={['script', 'iframe', 'style', 'object', 'embed']}
          unwrapDisallowed
          components={{
            p: (props) => <p className="leading-relaxed mb-2 last:mb-0" {...props} />,
            ul: (props) => <ul className="list-disc pl-5 mb-2 last:mb-0" {...props} />,
            ol: (props) => <ol className="list-decimal pl-5 mb-2 last:mb-0" {...props} />,
            li: (props) => <li className="mb-1" {...props} />,
            strong: (props) => <strong className="font-bold text-gray-900" {...props} />,
            code: (props) => (
              <code className="px-1 py-0.5 bg-gray-100 rounded text-[12px]" {...props} />
            ),
            table: (props) => (
              <div className="overflow-x-auto my-2">
                <table className="text-xs border-collapse" {...props} />
              </div>
            ),
            th: (props) => (
              <th className="border border-gray-300 px-2 py-1 bg-gray-50 font-semibold" {...props} />
            ),
            td: (props) => <td className="border border-gray-200 px-2 py-1" {...props} />,
            a: (props) => (
              <a
                className="text-violet-600 underline hover:text-violet-800"
                target="_blank"
                rel="noopener noreferrer"
                {...props}
              />
            ),
          }}
        >
          {message.content}
        </ReactMarkdown>
        {streaming && (
          <span className="inline-block ml-1 w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
        )}
      </div>
    </div>
  )
}
