/**
 * components/chat/MessageBubble.jsx
 * 역할: 카카오톡 스타일 말풍선 — 노란 내 메시지, 흰 상대 메시지
 *       첨부파일 렌더링 (이미지 인라인 / 비이미지 다운로드 링크)
 *       이미지 클릭 시 모달 뷰어 (X 버튼으로 닫기)
 *       읽음 표시 (DM: "읽음", 그룹: "읽음 N")
 */

import { useState } from 'react'
import { FileText, Download, X } from 'lucide-react'
import { downloadMessageFile } from '../../api/chatApi.js'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

/** blob 다운로드 헬퍼 호출 — 실패 시 alert 으로만 통지 (UI 차단 방지) */
async function triggerDownload(messageId, fallbackName) {
  try {
    await downloadMessageFile(messageId, fallbackName)
  } catch (err) {
    console.error('파일 다운로드 실패', err)
    alert('파일 다운로드에 실패했습니다.')
  }
}

function getCurrentUserId() {
  const stored = JSON.parse(sessionStorage.getItem('user') || 'null')
  return stored?.id || null
}

function formatTime(ts) {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 이미지 모달 뷰어 */
function ImageModal({ src, alt, messageId, onClose }) {
  const handleDownload = (e) => {
    e.stopPropagation()
    triggerDownload(messageId, alt)
  }

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center"
      onClick={onClose}
    >
      {/* X 닫기 버튼 */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition z-10"
        title="닫기"
      >
        <X size={24} />
      </button>

      {/* 다운로드 버튼 — same-origin blob 으로 받아 즉시 로컬 저장 */}
      <button
        type="button"
        onClick={handleDownload}
        className="absolute top-4 right-16 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition z-10"
        title="다운로드"
      >
        <Download size={24} />
      </button>

      {/* 이미지 */}
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
      />

      {/* 파일명 */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 text-white text-sm rounded-lg">
        {alt}
      </div>
    </div>
  )
}

/** 첨부파일 렌더링 */
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp|avif|svg)$/i

function FileAttachment({ message, isMine, onImageClick }) {
  const fullUrl = `${API_BASE}${message.file_url}`
  const isImage = message.file_content_type?.startsWith('image/') || IMAGE_EXT.test(message.file_name || '')

  if (isImage) {
    return (
      <button
        type="button"
        onClick={() => onImageClick(fullUrl, message.file_name, message.id)}
        className="block mb-1 cursor-pointer"
      >
        <img
          src={fullUrl}
          alt={message.file_name}
          className="max-w-[240px] max-h-[180px] rounded-lg object-cover hover:opacity-90 transition"
        />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => triggerDownload(message.id, message.file_name)}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition w-full text-left ${
        isMine ? 'bg-yellow-400/30 hover:bg-yellow-400/50' : 'bg-gray-100 hover:bg-gray-200'
      }`}
      title="다운로드"
    >
      <FileText size={18} className="text-gray-500 shrink-0" />
      <span className="text-sm text-blue-600 truncate max-w-[180px]">{message.file_name}</span>
      <Download size={14} className="text-gray-400 shrink-0 ml-auto" />
    </button>
  )
}

/** 읽음 + 시간 표시 */
function TimeAndRead({ message, isMine }) {
  return (
    <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} shrink-0 pb-0.5`}>
      {isMine && message.read_by_count > 0 && (
        <span className="text-[10px] text-yellow-600 font-medium leading-none">
          읽음{message.read_by_count > 1 ? ` ${message.read_by_count}` : ''}
        </span>
      )}
      <span className="text-[10px] text-gray-400 leading-none mt-0.5">
        {formatTime(message.created_at)}
      </span>
    </div>
  )
}

/** 말풍선 내부 콘텐츠 (파일 + 텍스트) */
function BubbleContent({ message, isMine, onImageClick }) {
  return (
    <>
      {message.file_url && <FileAttachment message={message} isMine={isMine} onImageClick={onImageClick} />}
      {message.text && (
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-keep">{message.text}</p>
      )}
    </>
  )
}

export default function MessageBubble({ message, showAvatar }) {
  const isMine = message.sender_id === getCurrentUserId()
  const [modalImage, setModalImage] = useState(null)

  const handleImageClick = (src, name, id) => setModalImage({ src, name, id })
  const closeModal = () => setModalImage(null)

  return (
    <>
      {/* 이미지 모달 */}
      {modalImage && (
        <ImageModal
          src={modalImage.src}
          alt={modalImage.name}
          messageId={modalImage.id}
          onClose={closeModal}
        />
      )}

      {isMine ? (
        <div className="flex justify-end mb-1 px-4">
          <div className="flex items-end gap-1.5 max-w-[70%]">
            <TimeAndRead message={message} isMine />
            <div className="bg-yellow-300 text-slate-900 rounded-2xl rounded-br-sm px-3.5 py-2 shadow-sm">
              <BubbleContent message={message} isMine onImageClick={handleImageClick} />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex gap-2 mb-1 px-4">
          {showAvatar ? (
            message.sender_profile_image_url ? (
              <img
                src={`${API_BASE}${message.sender_profile_image_url}`}
                alt={message.sender_name}
                className="w-9 h-9 rounded-full object-cover shrink-0 mt-0.5"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                {message.sender_initials}
              </div>
            )
          ) : (
            <div className="w-9 shrink-0" />
          )}

          <div className="max-w-[70%]">
            {showAvatar && (
              <p className="text-xs font-semibold text-slate-600 mb-1 ml-1">{message.sender_name}</p>
            )}
            <div className="flex items-end gap-1.5">
              <div className="bg-white rounded-2xl rounded-bl-sm px-3.5 py-2 shadow-sm border border-gray-100">
                <BubbleContent message={message} isMine={false} onImageClick={handleImageClick} />
              </div>
              <TimeAndRead message={message} isMine={false} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
