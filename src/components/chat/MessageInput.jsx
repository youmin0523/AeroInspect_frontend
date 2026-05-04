/**
 * components/chat/MessageInput.jsx
 * 역할: 하단 메시지 입력 — 텍스트, 파일 첨부(최대 10개, 200MB/개), 이모지 피커
 */

import { useState, useRef, useEffect } from 'react'
import { Paperclip, Smile, Send, X, FileText, Image as ImageIcon } from 'lucide-react'
import EmojiPicker from 'emoji-picker-react'
import useChatStore from '../../store/chatStore.js'

const MAX_FILES = 10
const MAX_FILE_SIZE = 200 * 1024 * 1024 // 200MB

export default function MessageInput() {
  const [text, setText] = useState('')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [fileSizeError, setFileSizeError] = useState('')
  const inputRef = useRef(null)
  const fileInputRef = useRef(null)
  const emojiRef = useRef(null)
  const sendMessage = useChatStore((s) => s.sendMessage)

  const canSend = text.trim() || selectedFiles.length > 0

  const handleSend = () => {
    if (!canSend) return
    sendMessage({ text: text.trim(), files: selectedFiles.length > 0 ? selectedFiles : undefined })
    setText('')
    setSelectedFiles([])
    setFileSizeError('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileSelect = (e) => {
    const newFiles = Array.from(e.target.files || [])
    setFileSizeError('')

    // 200MB 초과 파일 필터
    const validFiles = []
    const oversized = []
    for (const f of newFiles) {
      if (f.size > MAX_FILE_SIZE) oversized.push(f.name)
      else validFiles.push(f)
    }
    if (oversized.length > 0) {
      setFileSizeError(`200MB 초과: ${oversized.join(', ')}`)
    }

    // 최대 10개 제한
    const combined = [...selectedFiles, ...validFiles].slice(0, MAX_FILES)
    setSelectedFiles(combined)
    e.target.value = '' // 같은 파일 재선택 허용
  }

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
    setFileSizeError('')
  }

  const handleEmojiClick = (emojiData) => {
    const cursor = inputRef.current?.selectionStart || text.length
    const newText = text.slice(0, cursor) + emojiData.emoji + text.slice(cursor)
    setText(newText)
    setShowEmojiPicker(false)
    inputRef.current?.focus()
  }

  // 이모지 피커 외부 클릭 시 닫기
  useEffect(() => {
    if (!showEmojiPicker) return
    const handler = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showEmojiPicker])

  return (
    <div className="bg-white border-t border-gray-200 px-4 py-3">
      {/* 선택된 파일 미리보기 */}
      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedFiles.map((file, i) => {
            const isImage = file.type.startsWith('image/')
            return (
              <div key={i} className="relative group flex items-center gap-1.5 bg-gray-100 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 max-w-[200px]">
                {isImage ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-8 h-8 rounded object-cover shrink-0"
                  />
                ) : (
                  <FileText size={16} className="text-gray-400 shrink-0" />
                )}
                <span className="truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="ml-1 p-0.5 rounded-full hover:bg-gray-300 transition shrink-0"
                >
                  <X size={12} />
                </button>
              </div>
            )
          })}
          {selectedFiles.length >= MAX_FILES && (
            <span className="text-xs text-amber-600 self-center">최대 {MAX_FILES}개</span>
          )}
        </div>
      )}

      {/* 파일 크기 에러 */}
      {fileSizeError && (
        <p className="text-xs text-red-500 mb-1">{fileSizeError}</p>
      )}

      <div className="flex items-center gap-2">
        {/* 파일 첨부 버튼 */}
        <button
          type="button"
          title="파일 첨부"
          onClick={() => fileInputRef.current?.click()}
          disabled={selectedFiles.length >= MAX_FILES}
          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Paperclip size={18} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        <div className="flex-1">
          <textarea
            ref={inputRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요..."
            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder:text-gray-400 max-h-32"
            style={{ minHeight: '40px' }}
          />
        </div>

        {/* 이모지 피커 */}
        <div className="relative" ref={emojiRef}>
          <button
            type="button"
            title="이모지"
            onClick={() => setShowEmojiPicker((v) => !v)}
            className={`p-2 rounded-lg transition ${showEmojiPicker ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'}`}
          >
            <Smile size={18} />
          </button>
          {showEmojiPicker && (
            <div className="absolute bottom-12 right-0 z-50 shadow-2xl rounded-xl overflow-hidden">
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                width={320}
                height={400}
                searchPlaceholder="이모지 검색..."
                previewConfig={{ showPreview: false }}
                lazyLoadEmojis
              />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm"
          title="전송"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}
