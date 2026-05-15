/**
 * components/chatbot/ChatbotPanelHeader.jsx
 * 역할: 패널 상단 헤더 — 모드별 액션 노출
 *       - list 모드: 제목 + "새 대화" + 닫기
 *       - thread 모드: 뒤로(목록) + 현재 대화방 제목 + 새 대화 + 닫기
 */

import { ArrowLeft, Plus, Sparkles, X, Trash2 } from 'lucide-react'
import useAiChatStore from '../../store/aiChatStore.js'

export default function ChatbotPanelHeader() {
  const view = useAiChatStore((s) => s.view)
  const setView = useAiChatStore((s) => s.setView)
  const close = useAiChatStore((s) => s.close)
  const createThread = useAiChatStore((s) => s.createThread)
  const deleteThread = useAiChatStore((s) => s.deleteThread)
  const activeThreadId = useAiChatStore((s) => s.activeThreadId)
  const threads = useAiChatStore((s) => s.threads)
  const streaming = useAiChatStore((s) => s.streaming)

  const activeThread = threads.find((t) => t.id === activeThreadId)
  const title = activeThread?.title || '새 대화'

  const onNew = async () => {
    if (streaming) return
    await createThread({})
  }

  const onDelete = async () => {
    if (!activeThreadId) return
    if (streaming) return
    const ok = window.confirm('이 대화를 삭제할까요? (보관함으로 이동)')
    if (!ok) return
    await deleteThread(activeThreadId)
  }

  return (
    <header className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-violet-50 to-white">
      {view === 'thread' && (
        <button
          type="button"
          onClick={() => setView('list')}
          className="p-2 -ml-2 text-gray-600 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
          aria-label="대화방 목록으로"
          title="목록"
        >
          <ArrowLeft size={18} />
        </button>
      )}

      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Sparkles size={18} className="text-violet-600 shrink-0" />
        <div className="min-w-0">
          <div className="text-sm font-bold text-gray-900 truncate">
            {view === 'thread' ? title : 'AI 어시스턴트'}
          </div>
          <div className="text-[11px] text-gray-500">
            건축물·하자 도메인 보조자
          </div>
        </div>
      </div>

      {view === 'thread' && activeThreadId && (
        <button
          type="button"
          onClick={onDelete}
          disabled={streaming}
          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="대화 삭제"
          title="대화 삭제"
        >
          <Trash2 size={18} />
        </button>
      )}

      <button
        type="button"
        onClick={onNew}
        disabled={streaming}
        className="flex items-center gap-1 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label="새 대화"
        title="새 대화"
      >
        <Plus size={14} />
        새 대화
      </button>

      <button
        type="button"
        onClick={close}
        className="p-2 -mr-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="닫기"
        title="닫기 (Esc)"
      >
        <X size={18} />
      </button>
    </header>
  )
}
