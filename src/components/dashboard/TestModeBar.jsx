/**
 * components/dashboard/TestModeBar.jsx
 * 역할: 테스트 모드 전용 제어 바
 *       - 시작 / 일시중지 / 정지 재생 제어
 *       - 프로젝트 데이터 ↔ 직접 업로드 소스 전환
 *       - 직접 업로드 모드: 이미지/영상 대량 첨부
 */

import { useCallback, useRef, useState } from 'react'
import {
  Camera, FlaskConical, Upload, Trash2, FolderOpen, Check, Loader2,
  Database, HardDrive, Play, Pause, Square, Box, ScanSearch,
} from 'lucide-react'
import useSessionStore from '../../store/sessionStore.js'
import useDefectStore from '../../store/defectStore.js'
import { perfStart, perfEnd } from '../../utils/perfTimer'
import { maybeDownsampleAll } from '../../utils/imageDownsample'
import { uploadWithProgress } from '../../utils/uploadWithProgress'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

// 테스트모드 제어 엔드포인트(/test/start, /source, /upload 등)는 백엔드에서 인증을 요구한다.
// 여기서는 axios API 인스턴스(interceptor 자동 첨부) 대신 fetch/XHR 를 쓰므로 토큰을 수동 첨부.
// 누락 시 401 → res.ok=false → 상태 미변경 → "버튼 눌러도 반응 없음" 사고.
function authHeaders(extra = {}) {
  const token = sessionStorage.getItem('access_token')
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra
}

export default function TestModeBar() {
  const testSource = useSessionStore((s) => s.testSource)
  const setTestSource = useSessionStore((s) => s.setTestSource)
  const testPlayState = useSessionStore((s) => s.testPlayState)
  const setTestPlayState = useSessionStore((s) => s.setTestPlayState)
  const testDetectionMode = useSessionStore((s) => s.testDetectionMode)
  const setTestDetectionMode = useSessionStore((s) => s.setTestDetectionMode)
  const resetTestGate = useDefectStore((s) => s.resetTestGate)
  const setDefects = useDefectStore((s) => s.setDefects)
  const fileInputRef = useRef(null)

  const [uploadedCount, setUploadedCount] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [switchingSource, setSwitchingSource] = useState(false)

  const isUploadMode = testSource === 'upload'
  const isStopped = testPlayState === 'stopped'
  const isPlaying = testPlayState === 'playing'
  const isPaused = testPlayState === 'paused'

  // 재생 제어
  const handleStart = useCallback(async () => {
    // ① 게이트 닫고 큐 비우기 + 이전 사이클 누적 카드 제거
    resetTestGate()
    setDefects([])
    try {
      const res = await fetch(`${API_BASE}/api/v1/stream/test/start`, { method: 'POST', headers: authHeaders() })
      if (res.ok) setTestPlayState('playing')
    } catch (err) {
      console.warn('[TestMode] 시작 실패:', err)
    }
  }, [resetTestGate, setDefects, setTestPlayState])

  const handlePause = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/stream/test/pause`, { method: 'POST', headers: authHeaders() })
      if (res.ok) setTestPlayState('paused')
    } catch (err) {
      console.warn('[TestMode] 일시중지 실패:', err)
    }
  }, [setTestPlayState])

  const handleResume = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/stream/test/resume`, { method: 'POST', headers: authHeaders() })
      if (res.ok) setTestPlayState('playing')
    } catch (err) {
      console.warn('[TestMode] 재개 실패:', err)
    }
  }, [setTestPlayState])

  const handleStop = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/stream/test/stop`, { method: 'POST', headers: authHeaders() })
      if (res.ok) {
        setTestPlayState('stopped')
        resetTestGate()  // 잔여 큐 폐기 + 게이트 닫음
      }
    } catch (err) {
      console.warn('[TestMode] 정지 실패:', err)
    }
  }, [resetTestGate, setTestPlayState])

  // 감지 모드 전환 (백엔드 동기화)
  const switchDetectionMode = useCallback(async (newMode) => {
    if (newMode === testDetectionMode) return
    try {
      await fetch(`${API_BASE}/api/v1/stream/test/detection-mode`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ mode: newMode }),
      })
      setTestDetectionMode(newMode)
    } catch (err) {
      console.warn('[TestMode] 감지 모드 전환 실패:', err)
    }
  }, [testDetectionMode, setTestDetectionMode])

  // 소스 전환
  const switchTo = useCallback(async (newSource) => {
    if (newSource === testSource || switchingSource) return
    setSwitchingSource(true)
    try {
      await fetch(`${API_BASE}/api/v1/stream/test/source`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ source: newSource }),
      })
      setTestSource(newSource)
      // 새 소스의 첫 프레임이 다시 떠야 우측 패널 갱신을 허용
      resetTestGate()
    } catch (err) {
      console.warn('[TestMode] 소스 전환 실패:', err)
    } finally {
      setSwitchingSource(false)
    }
  }, [testSource, setTestSource, switchingSource, resetTestGate])

  // 파일 업로드 — 클라이언트 다운샘플 + progress + perf 측정
  const handleFileChange = useCallback(async (e) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    setUploadPct(0)
    perfStart('upload-total')
    try {
      // 0) 이미지 다운샘플 (4K → 1280) — 영상은 그대로
      perfStart('upload-downsample')
      const processed = await maybeDownsampleAll(files)
      perfEnd('upload-downsample')

      // 1) progress 추적 업로드
      perfStart('upload-network')
      const formData = new FormData()
      processed.forEach((f) => formData.append('files', f))
      const res = await uploadWithProgress(
        `${API_BASE}/api/v1/stream/test/upload`,
        formData,
        (p) => setUploadPct(p.percent),
        authHeaders(),
      )
      perfEnd('upload-network', { status: res.status })
      if (res.status < 400 && res.body) {
        setUploadedCount(res.body.total_uploaded || 0)
        perfEnd('upload-total', { ok: true })
      } else {
        perfEnd('upload-total', { ok: false })
      }
    } catch (err) {
      console.warn('[TestMode] 업로드 실패:', err)
      perfEnd('upload-total', { ok: false, err: err.message })
    } finally {
      setUploading(false)
      setUploadPct(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [])

  const handleClearUploads = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/api/v1/stream/test/upload`, { method: 'DELETE', headers: authHeaders() })
      setUploadedCount(0)
    } catch (err) {
      console.warn('[TestMode] 삭제 실패:', err)
    }
  }, [])

  return (
    /* //* [Modified Code] 반응형:
       - 모바일(<md): 자연 흐름 + 가로 스크롤 (DashboardTopBar 가 모바일에서 relative 라 흐름 안 자리)
       - 태블릿/데스크탑(md+): TopBar 가 absolute 라 자체도 absolute top-[56px] 로 띄움 + 컨텐츠 가로 스크롤 fallback */
    <div className="relative md:absolute md:top-[56px] md:left-0 md:right-0 z-20 flex items-center justify-start md:justify-center px-3 md:px-5 py-2 pointer-events-none overflow-x-auto">
      <div className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 rounded-xl bg-neutral-900/80 border border-blue-500/40 backdrop-blur-sm shadow-lg pointer-events-auto whitespace-nowrap shrink-0">

        {/* 1차 배포: 영상 수신기 미도착으로 testMode 를 "현장 점검" 으로 위장 노출.
            수신기 도착 후 라벨/색상/아이콘 원복: Camera→FlaskConical, blue→red, "현장 점검"→"Test Mode" */}
        <div className="flex items-center gap-2">
          <div className="p-1 bg-blue-600 rounded-md">
            <Camera size={12} className="text-white" />
          </div>
          <span className="text-[11px] font-bold tracking-wider text-blue-300">
            현장 점검
          </span>
        </div>

        <div className="w-px h-6 bg-neutral-700" />

        {/* 재생 제어 버튼 */}
        <div className="flex items-center gap-1">
          {/* 시작 / 재개 */}
          {(isStopped || isPaused) && (
            <button
              type="button"
              onClick={isStopped ? handleStart : handleResume}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600/20 border border-green-500/40 hover:bg-green-600/30 text-green-400 hover:text-green-300 transition text-[11px] font-mono font-semibold"
              title={isStopped ? '테스트 시작' : '재생 재개'}
            >
              <Play size={13} fill="currentColor" />
              {isStopped ? 'START' : 'RESUME'}
            </button>
          )}

          {/* 일시중지 */}
          {isPlaying && (
            <button
              type="button"
              onClick={handlePause}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-600/20 border border-yellow-500/40 hover:bg-yellow-600/30 text-yellow-400 hover:text-yellow-300 transition text-[11px] font-mono font-semibold"
              title="일시중지"
            >
              <Pause size={13} />
              PAUSE
            </button>
          )}

          {/* 정지 (재생 또는 일시중지 중에만) */}
          {!isStopped && (
            <button
              type="button"
              onClick={handleStop}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-800 border border-neutral-600 hover:border-red-500/50 hover:bg-red-900/20 text-slate-400 hover:text-red-400 transition text-[11px] font-mono"
              title="정지"
            >
              <Square size={11} fill="currentColor" />
              STOP
            </button>
          )}

          {/* 상태 표시 */}
          <div className="flex items-center gap-1.5 px-2 ml-1">
            <span className={`w-2 h-2 rounded-full ${
              isPlaying ? 'bg-green-400 animate-pulse' :
              isPaused ? 'bg-yellow-400' :
              'bg-neutral-600'
            }`} />
            <span className={`text-[10px] font-mono uppercase tracking-wider ${
              isPlaying ? 'text-green-400' :
              isPaused ? 'text-yellow-400' :
              'text-slate-600'
            }`}>
              {testPlayState}
            </span>
          </div>
        </div>

        <div className="w-px h-6 bg-neutral-700" />

        {/* 감지 모드 토글: BBox ↔ 객체감지 */}
        <div className="flex items-center bg-neutral-800 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => switchDetectionMode('bbox')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-mono transition-all duration-200 ${
              testDetectionMode === 'bbox'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                : 'text-slate-500 hover:text-slate-300'
            }`}
            title="BBox 모드: 네모 박스로 하자 영역 표시"
          >
            <Box size={11} />
            BBOX
          </button>
          <button
            type="button"
            onClick={() => switchDetectionMode('detection')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-mono transition-all duration-200 ${
              testDetectionMode === 'detection'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-500 hover:text-slate-300'
            }`}
            title="객체감지 모드: 윤곽 강조 + 반투명 마스크"
          >
            <ScanSearch size={11} />
            DETECT
          </button>
        </div>

        <div className="w-px h-6 bg-neutral-700" />

        {/* 소스 선택 탭 */}
        <div className="flex items-center bg-neutral-800 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => switchTo('project')}
            disabled={switchingSource}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-mono transition-all duration-200 ${
              !isUploadMode
                ? 'bg-accent-500/20 text-accent-300 border border-accent-500/40 shadow-sm'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Database size={11} />
            프로젝트
          </button>
          <button
            type="button"
            onClick={() => switchTo('upload')}
            disabled={switchingSource}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-mono transition-all duration-200 ${
              isUploadMode
                ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <HardDrive size={11} />
            업로드
          </button>
        </div>

        {/* 파일 업로드 영역 (업로드 모드일 때만) */}
        {isUploadMode && (
          <>
            <div className="w-px h-6 bg-neutral-700" />
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-800 border border-neutral-600 hover:border-red-500/50 hover:bg-neutral-700 text-slate-300 hover:text-white transition text-[11px] font-mono"
              >
                {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                {uploading ? `업로드 중 ${uploadPct}%` : '파일 첨부'}
              </button>
              {uploadedCount > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-neutral-800/60 border border-neutral-700">
                  <FolderOpen size={11} className="text-slate-400" />
                  <span className="text-[11px] font-mono text-slate-300">{uploadedCount}개</span>
                  <Check size={10} className="text-green-400" />
                </div>
              )}
              {uploadedCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearUploads}
                  className="p-1.5 rounded-lg bg-neutral-800 border border-neutral-700 hover:border-red-500/50 hover:bg-red-900/30 text-slate-500 hover:text-red-400 transition"
                  title="업로드 파일 전체 삭제"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
