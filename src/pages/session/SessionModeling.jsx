/**
 * pages/session/SessionModeling.jsx
 * 역할: 세션 Step 3 — modelSource 에 따라 2가지 분기
 *
 *   (A) modelSource='premodel' → 짧은 로드 애니메이션 (2.5초) → ready
 *   (B) modelSource='drone' → 11초 Mock 시뮬레이션
 *
 *   완료 후 1.8초 대기 → /dashboard 자동 진입
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, Loader2, Check, Download, Ruler, AlertTriangle } from 'lucide-react'
import ModelingProgress from '../../components/session/ModelingProgress.jsx'
import useSessionStore from '../../store/sessionStore.js'

export default function SessionModeling() {
  const navigate = useNavigate()
  const {
    level,
    modelSource,
    uploadedFileName,
    modelStatus,
    inspectionArea,
    startModeling,
    cancelModeling,
  } = useSessionStore()
  const setSessionInfo = useSessionStore((s) => s.setSessionInfo)

  // L2 사전 모델 + 면적 미입력 시 안내
  const isL2NoArea = modelSource === 'premodel' && level === 2 && !inspectionArea
  const [localArea, setLocalArea] = useState(inspectionArea || '')

  const isModeling = modelStatus === 'modeling'
  const isReady = modelStatus === 'ready'

  // 사전 모델: 진입 즉시 "로드 중" 시뮬레이션 자동 시작
  // [BugFix] 이미 'ready' 면 skip, 그 외('pending'/'modeling' stuck) 는 항상 (재)시작
  useEffect(() => {
    if (modelSource !== 'premodel') return
    const currentStatus = useSessionStore.getState().modelStatus
    if (currentStatus === 'ready') return // 이미 완료 — 재실행 불필요

    const setState = useSessionStore.setState
    setState({ modelStatus: 'modeling', modelProgress: 0, modelStage: '메타데이터 검증' })
    const stages = [
      { at: 400,  stage: '모델 파일 검증', pct: 20 },
      { at: 900,  stage: '메시 로드', pct: 55 },
      { at: 1500, stage: '텍스처 매핑', pct: 85 },
      { at: 2100, stage: '완료 처리', pct: 100 },
    ]
    const timers = stages.map((s) =>
      setTimeout(() => setState({ modelProgress: s.pct, modelStage: s.stage }), s.at)
    )
    const done = setTimeout(
      () => setState({ modelStatus: 'ready', modelProgress: 100 }),
      2500
    )
    return () => {
      timers.forEach(clearTimeout)
      clearTimeout(done)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelSource])

  // 완료 후 대시보드 자동 이동
  useEffect(() => {
    if (!isReady) return
    const t = setTimeout(() => navigate('/dashboard'), 1800)
    return () => clearTimeout(t)
  }, [isReady, navigate])

  const isPreModel = modelSource === 'premodel'
  const isDrone = modelSource === 'drone'

  return (
    <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        {isPreModel ? '사전 모델 로드' : '드론 자율비행 3D 시뮬레이션'}
      </h1>
      <p className="text-sm text-gray-500 mb-6 break-keep">
        {isPreModel
          ? `사무실에서 미리 생성한 Level ${level} 모델을 불러옵니다.`
          : '드론이 현장을 자율비행하며 실시간으로 3D 공간 모델을 생성합니다.'}
      </p>

      {/* 드론 — 사용자 클릭 전 안내 박스 */}
      {isDrone && !isModeling && !isReady && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-5 text-center">
          <div className="w-14 h-14 mx-auto rounded-xl bg-accent-50 border border-accent-500/30 flex items-center justify-center mb-3">
            <Play size={22} className="text-accent-500" />
          </div>
          <p className="text-sm text-gray-700 mb-1 font-semibold">시뮬레이션 준비 완료</p>
          <p className="text-xs text-gray-500 break-keep">
            "3D 시뮬레이션 시작" 을 누르면 드론 가상 비행이 시작되며, 약 10초 후 3D 모델이 완성됩니다.
          </p>
        </div>
      )}

      {/* 사전 모델 — 어떤 모델을 로드하는지 정보 표시 */}
      {isPreModel && (
        <div className="mb-6 rounded-xl border border-accent-500/30 bg-accent-50 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-500/15 border border-accent-500/30 flex items-center justify-center text-accent-600">
              <Download size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-0.5">
                사전 모델 로드 · Level {level}
              </p>
              <p className="text-sm text-gray-800 font-semibold truncate">{uploadedFileName || '사전 모델'}</p>
            </div>
          </div>
        </div>
      )}

      {/* L2 평면도 + 면적 미입력 → 공급 면적 입력 안내 */}
      {isL2NoArea && !isModeling && !isReady && (
        <div className="mb-6 rounded-xl border border-yellow-400 bg-yellow-50 p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-yellow-100 flex items-center justify-center text-yellow-700 shrink-0 mt-0.5">
              <Ruler size={16} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-yellow-800 mb-1">
                공급 면적을 입력하면 실제 치수를 산출할 수 있습니다
              </p>
              <p className="text-xs text-yellow-700 mb-3 break-keep">
                평면도 이미지만으로는 절대 크기(m)를 알 수 없습니다.
                계약서·분양 정보의 전용면적을 입력하면 3D 모델에 실제 치수가 반영됩니다.
                <br />
                입력하지 않으면 상대적 비율만 맞고 절대 치수는 "미산출"로 표기됩니다.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={localArea}
                  onChange={(e) => setLocalArea(e.target.value)}
                  placeholder="예: 84㎡"
                  className="bg-white border border-yellow-300 rounded-lg px-3 py-2 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (localArea.trim()) {
                      // sessionStore 의 inspectionArea 직접 업데이트
                      useSessionStore.setState({ inspectionArea: localArea.trim() })
                    }
                  }}
                  disabled={!localArea.trim()}
                  className="px-3 py-2 rounded-lg bg-yellow-500 text-white text-xs font-bold hover:bg-yellow-600 transition shadow-sm disabled:bg-gray-300 disabled:text-gray-500"
                >
                  적용
                </button>
              </div>
              {inspectionArea && (
                <p className="text-[11px] text-green-700 mt-2 flex items-center gap-1">
                  <Check size={11} /> 면적 적용됨: {inspectionArea}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 진행 중 / 완료 UI */}
      {(isModeling || isReady) && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-5">
          <div className="flex items-center gap-3 mb-4">
            {isReady ? (
              <div className="w-10 h-10 rounded-full bg-accent-50 border border-accent-500 flex items-center justify-center">
                <Check size={20} className="text-accent-600" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <Loader2 size={20} className="text-accent-500 animate-spin" />
              </div>
            )}
            <div>
              <div className="text-sm font-bold text-gray-800">
                {isReady ? '준비 완료' : isPreModel ? '모델 로드 중' : '시뮬레이션 진행 중'}
              </div>
              <div className="text-xs text-gray-500">
                {isReady ? '잠시 후 대시보드로 이동합니다...' : '브라우저 탭을 유지해주세요'}
              </div>
            </div>
          </div>
          <ModelingProgress lightMode />
        </div>
      )}

      {/* 컨트롤 바 */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            if (isModeling) cancelModeling()
            navigate('/session/level')
          }}
          disabled={isReady}
          className="flex items-center gap-2 px-4 py-2 rounded-md border border-gray-300 text-gray-600 text-sm hover:bg-gray-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ArrowLeft size={14} /> 이전
        </button>

        {isDrone && !isModeling && !isReady && (
          <button
            type="button"
            onClick={startModeling}
            className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-accent-500 text-white font-bold text-sm hover:bg-accent-600 transition shadow-sm"
          >
            <Play size={14} /> 3D 시뮬레이션 시작
          </button>
        )}

        {isModeling && (
          <button
            type="button"
            onClick={cancelModeling}
            disabled={isPreModel}
            className="flex items-center gap-2 px-5 py-2.5 rounded-md border border-red-300 text-red-600 text-sm hover:bg-red-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            취소
          </button>
        )}

        {isReady && (
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-accent-500 text-white font-bold text-sm hover:bg-accent-600 transition shadow-sm"
          >
            <Check size={14} /> 대시보드 진입
          </button>
        )}
      </div>
    </div>
  )
}
