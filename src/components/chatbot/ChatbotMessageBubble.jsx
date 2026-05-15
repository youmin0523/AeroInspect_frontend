/**
 * components/chatbot/ChatbotMessageBubble.jsx
 * 역할: 단일 메시지 bubble
 *       - role=user  → 우측 정렬, violet 배경
 *       - role=assistant → 좌측 정렬, 흰 배경, react-markdown 렌더 (raw HTML 비허용)
 *       - streaming=true 시 펄스 인디케이터
 *       - assistant 응답(스트리밍 끝난 것)에 한해 우상단 복사 버튼 (hover/터치 노출)
 *         → navigator.clipboard.writeText, 성공 시 1.5초 체크 표시 피드백
 */

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Sparkles, Copy, Check } from 'lucide-react'

export default function ChatbotMessageBubble({ message, streaming = false }) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!message.content) return
    try {
      // HTTPS 환경에서만 동작. 운영(Vercel/Fly) 둘 다 HTTPS 이므로 fallback 불필요.
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message.content)
      } else {
        // 매우 구형 브라우저 fallback (HTTP 또는 권한 거부)
        const ta = document.createElement('textarea')
        ta.value = message.content
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // 권한 거부 등 실패 — 사용자에게 알리지 않음(UI 잡음 방지). 드래그 복사로 우회 가능.
    }
  }

  if (isUser) {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-[80%] px-3 py-2 rounded-2xl rounded-tr-sm bg-violet-600 text-white text-sm whitespace-pre-wrap break-words shadow-sm">
          {message.content}
        </div>
      </div>
    )
  }

  // 스트리밍 중이거나 응답 빈 경우 복사 버튼 숨김 — 완성된 답변에만 의미가 있음
  const showCopy = !streaming && !!message.content?.trim()

  return (
    <div className="group flex justify-start mb-3 gap-2">
      <div className="shrink-0 w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center mt-0.5">
        <Sparkles size={14} className="text-violet-600" />
      </div>
      <div
        className={`relative max-w-[85%] px-3 py-2 rounded-2xl rounded-tl-sm bg-white border border-gray-200 text-sm text-gray-900 break-words shadow-sm ${
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

        {/* 복사 버튼 — bubble 우상단. 데스크톱은 hover 시 fade-in, 모바일/터치는 항상 노출. */}
        {showCopy && (
          <button
            type="button"
            onClick={handleCopy}
            aria-label={copied ? '복사 완료' : '답변 복사'}
            title={copied ? '복사됨' : '답변 복사'}
            className={`absolute -top-2 -right-2 p-1.5 rounded-md border border-gray-200 bg-white shadow-sm transition-all
              opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100
              ${copied ? 'text-emerald-600 border-emerald-200' : 'text-gray-500 hover:text-violet-700 hover:border-violet-200'}`}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>
        )}
      </div>
    </div>
  )
}
