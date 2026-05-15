/**
 * components/chatbot/ThreadList.jsx
 * 역할: 대화방 목록 (ChatGPT 스타일)
 *       - 최신 last_message_at 순
 *       - 클릭 시 selectThread → thread 모드 전환
 *       - 비어있을 때 "새 대화 시작" CTA + 도메인 안내
 */

import { Sparkles, MessageCircle } from 'lucide-react'
import useAiChatStore from '../../store/aiChatStore.js'

const SUGGESTIONS = [
  'B-02 벽체 단열 공백은 왜 위험한가요?',
  '단열 결함을 가장 엄격하게 봐야 하는 이유를 설명해 주세요.',
  '입주 전 시정이 반드시 필요한 하자 항목을 정리해 주세요.',
  '내 사이트의 HIGH 심각도 결함을 알려주세요.',
]

function formatRelative(iso) {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  const diff = (Date.now() - t) / 1000
  if (diff < 60) return '방금'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  const days = Math.floor(diff / 86400)
  if (days < 7) return `${days}일 전`
  return new Date(iso).toLocaleDateString('ko-KR')
}

export default function ThreadList() {
  const threads = useAiChatStore((s) => s.threads)
  const threadsLoading = useAiChatStore((s) => s.threadsLoading)
  const selectThread = useAiChatStore((s) => s.selectThread)
  const createThread = useAiChatStore((s) => s.createThread)

  const handleSuggestion = async (text) => {
    const t = await createThread({})
    if (!t) return
    // 약간의 지연 후 sendMessage — store 상태 갱신 보장
    setTimeout(() => {
      useAiChatStore.getState().sendMessage(text)
    }, 0)
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      {/* 비어있을 때 추천 질문 */}
      {threads.length === 0 && !threadsLoading && (
        <div className="px-4 py-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} className="text-violet-600" />
            <h3 className="text-sm font-bold text-gray-900">무엇을 도와드릴까요?</h3>
          </div>
          <p className="text-xs text-gray-600 mb-4 leading-relaxed">
            건축물 하자(중대 결함·단열·방수·구조 등)에 대해 질의하실 수 있습니다.
            대화는 자동 저장되어 내일 다시 열어도 흐름이 이어집니다.
          </p>
          <div className="space-y-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSuggestion(s)}
                className="w-full text-left px-3 py-2 text-xs text-gray-700 bg-violet-50 hover:bg-violet-100 border border-violet-100 rounded-lg transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 로딩 */}
      {threadsLoading && (
        <div className="px-4 py-6 text-center text-xs text-gray-500">불러오는 중…</div>
      )}

      {/* 목록 */}
      {threads.length > 0 && (
        <ul className="divide-y divide-gray-100">
          {threads.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => selectThread(t.id)}
                className="w-full text-left px-4 py-3 hover:bg-violet-50 transition-colors flex items-start gap-3"
              >
                <MessageCircle size={16} className="mt-0.5 text-violet-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">
                    {t.title || '제목 없음'}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    {formatRelative(t.last_message_at)}
                    {t.has_summary && <span className="ml-2 text-violet-600">· 요약 보유</span>}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
