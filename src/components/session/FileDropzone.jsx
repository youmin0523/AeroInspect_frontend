/**
 * components/session/FileDropzone.jsx
 * 역할: L1(CAD) / L2(평면도) 공용 파일 업로드 드롭존
 *       - 드래그&드롭 + 클릭 입력 지원
 *       - accept prop: MIME/확장자 필터 (input accept 로 전달 + 드롭 시 가드)
 *       - 선택된 파일 메타(이름/크기) + 이미지면 썸네일 미리보기
 *       - onFile(file) 콜백으로 부모에 전달
 */

import { useRef, useState } from 'react'
import { Upload, FileText, Image as ImageIcon, X } from 'lucide-react'

const formatBytes = (bytes) => {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB']
  let i = 0
  let n = bytes
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export default function FileDropzone({
  accept,
  hint,
  file,          // { name, size } — 선택된 파일 메타 (부모에서 store 기반으로 전달)
  previewUrl,    // 이미지 미리보기 URL (L2 전용)
  onFile,        // (File) => void
  onClear,       // () => void
}) {
  const inputRef = useRef(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) onFile?.(f)
  }
  const handlePick = (e) => {
    const f = e.target.files?.[0]
    if (f) onFile?.(f)
  }

  const hasFile = !!file?.name

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragOver(true)
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`relative w-full rounded-xl border-2 border-dashed transition px-6 py-8 text-center ${
        isDragOver
          ? 'border-blue-500 bg-blue-50'
          : hasFile
            ? 'border-blue-400 bg-gray-50'
            : 'border-gray-300 bg-white hover:border-gray-400'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handlePick}
        className="hidden"
      />

      {hasFile ? (
        <div className="flex flex-col items-center gap-3">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="미리보기"
              className="max-h-40 rounded-md border border-gray-200 object-contain"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center">
              <FileText size={22} className="text-blue-600" />
            </div>
          )}
          <div className="text-sm text-slate-800 font-mono truncate max-w-[360px]">{file.name}</div>
          <div className="text-[11px] text-gray-500 font-mono">{formatBytes(file.size)}</div>

          <div className="flex items-center gap-2 mt-1">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-[11px] px-3 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-slate-800 transition"
            >
              다시 선택
            </button>
            <button
              type="button"
              onClick={onClear}
              className="text-[11px] px-2 py-1 rounded border border-gray-300 text-gray-500 hover:text-red-600 hover:border-red-300 transition flex items-center gap-1"
              title="선택 해제"
            >
              <X size={12} /> 지우기
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex flex-col items-center gap-2 py-4"
        >
          <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center">
            {accept?.startsWith('image') ? (
              <ImageIcon size={24} className="text-gray-500" />
            ) : (
              <Upload size={24} className="text-gray-500" />
            )}
          </div>
          <div className="text-sm text-slate-700 font-semibold">
            클릭 또는 드래그하여 파일 업로드
          </div>
          {hint && <div className="text-[11px] text-gray-500 font-mono">{hint}</div>}
        </button>
      )}
    </div>
  )
}
