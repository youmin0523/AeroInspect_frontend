/**
 * components/video/ThermalScreeningOverlay.jsx
 * 역할: 열화상(Drone2) 직접재생 영상 위에 '의사색 단열 스크리닝' 결과를 SVG 오버레이.
 *       - thermalScreeningStore.items 를 video.currentTime ± hold 로 선별(키프레임 sparse → hold+fade)
 *       - 본 검출(DetectionOverlay)과 구분되는 시안 점선 + "단열 의심" 태그 (보고서 미적재 표시)
 *       - viewBox = frame_w × frame_h, preserveAspectRatio="xMidYMid slice" (video object-cover 일치)
 *
 *   //* [Modified Code] (2026-06-16) 검수 액션 parity — 박스 클릭 시 확인/무시/오탐 모달.
 *     스크리닝은 영속 레코드가 없어 백엔드(POST /thermal-screening/review)가 audit_logs 로 피드백만
 *     회수(오탐=재학습 데이터). 검수된 항목은 흐리게+태그 표시(세션 내), WS 로 다른 화면도 반영.
 *
 * ⚠️ 스크리닝 보조 — 컬러바 부재/압축 한계로 상대 색이상 기반. 확정 진단 아님(점검자 수동 채택).
 */

import { useEffect, useRef, useState } from 'react'
import { Check, X, Flag, Loader2, AlertTriangle, Ban } from 'lucide-react'
import useThermalScreeningStore from '../../store/thermalScreeningStore.js'
import { toast } from '../../store/toastStore.js'

// 키프레임 sparse 검출 hold+fade (DetectionOverlay 와 동일 정책).
const LEAD_SEC = 0.25
const HOLD_SEC = 1.8
const FADE_START_SEC = 1.0
const NOTE_MAX = 2000

function opacityForAge(age) {
  if (age < -LEAD_SEC || age > HOLD_SEC) return 0
  if (age <= FADE_START_SEC) return 1
  return Math.max(0, 1 - (age - FADE_START_SEC) / (HOLD_SEC - FADE_START_SEC))
}

const SCREEN_HEX = '#22d3ee'  // cyan-400 — 본 검출(심각도 색)과 구분
const REVIEW_TAG = {
  confirmed: '✓확인',
  dismissed: '·무시',
  flagged_false_positive: '✗오탐',
}

export default function ThermalScreeningOverlay({ videoRef, frameW, frameH }) {
  const items = useThermalScreeningStore((s) => s.items)
  const reviews = useThermalScreeningStore((s) => s.reviews)
  const reviewItem = useThermalScreeningStore((s) => s.reviewItem)
  const [active, setActive] = useState([])

  // 검수 모달 대상(스크리닝 item) + 입력 상태
  const [reviewTarget, setReviewTarget] = useState(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const textareaRef = useRef(null)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const v = videoRef.current
      if (v && !v.ended) {
        const t = v.currentTime
        const hits = []
        for (const a of items) {
          const op = opacityForAge(t - a.video_timestamp_sec)
          if (op > 0) hits.push({ ...a, _opacity: op })
        }
        setActive(hits)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [items, videoRef])

  // 모달 열릴 때 autofocus + ESC 닫기 (검수 진행 중이면 닫기 보류)
  useEffect(() => {
    if (!reviewTarget) return
    textareaRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) {
        setReviewTarget(null); setNote(''); setErrorMsg('')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [reviewTarget, busy])

  const closeModal = () => {
    if (busy) return
    setReviewTarget(null)
    setNote('')
    setErrorMsg('')
  }

  const submit = async (review_status) => {
    if (busy || !reviewTarget) return
    const trimmed = note.trim()
    if (review_status === 'flagged_false_positive' && trimmed.length === 0) {
      setErrorMsg('오탐 신고는 사유가 필수입니다.')
      return
    }
    setBusy(true)
    setErrorMsg('')
    try {
      await reviewItem(reviewTarget.id, review_status, trimmed.slice(0, NOTE_MAX) || undefined)
      const msg = review_status === 'flagged_false_positive'
        ? '오탐 신고가 접수됐어요. 모델 재학습에 반영됩니다.'
        : review_status === 'confirmed'
        ? '단열 의심부로 확인 처리했어요.'
        : '무시 처리했어요.'
      toast.success(msg)
      setReviewTarget(null)
      setNote('')
    } catch (err) {
      console.error('[ThermalScreeningOverlay] review 실패', err)
      setErrorMsg('검수 저장에 실패했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  const vbW = frameW || active[0]?.frame_w
  const vbH = frameH || active[0]?.frame_h
  const canRenderSvg = vbW && vbH && active.length > 0

  const sw = Math.max(2, Math.round((vbW || 0) * 0.0028))
  const dash = Math.max(8, Math.round((vbW || 0) * 0.014))
  const fs = Math.max(15, Math.round((vbW || 0) * 0.015))

  return (
    <>
      {canRenderSvg && (
        <svg
          className="absolute inset-0 pointer-events-none z-10"
          viewBox={`0 0 ${vbW} ${vbH}`}
          preserveAspectRatio="xMidYMid slice"
          style={{ width: '100%', height: '100%' }}
        >
          {active.map((a) => {
            const b = a.bbox || {}
            const x = b.x1, y = b.y1
            const w = (b.x2 ?? 0) - (b.x1 ?? 0)
            const h = (b.y2 ?? 0) - (b.y1 ?? 0)
            if (!w || !h) return null
            const isSpot = a.kind === 'spot'
            const reviewed = reviews[a.id]
            const baseLabel = isSpot ? '단열 의심·점' : '단열 의심·면'
            const label = reviewed ? `${baseLabel} ${REVIEW_TAG[reviewed.review_status] || ''}`.trim() : baseLabel
            const labelW = label.length * fs * 0.95 + fs * 0.8
            const labelH = fs + fs * 0.5
            const labelY = (y - labelH - 4 < 0) ? (y + h + 4) : (y - labelH - 4)
            // 미검수 항목만 클릭 가능(svg 는 pointer-events-none 이라 이 g 만 auto 로 재활성).
            const interactive = !reviewed
            return (
              <g
                key={a.id}
                opacity={(a._opacity ?? 1) * (reviewed ? 0.4 : 1)}
                style={{
                  transition: 'opacity 80ms linear',
                  pointerEvents: interactive ? 'auto' : 'none',
                  cursor: interactive ? 'pointer' : 'default',
                }}
                onClick={interactive ? (e) => { e.stopPropagation(); setReviewTarget(a) } : undefined}
              >
                {isSpot ? (
                  <ellipse
                    cx={x + w / 2} cy={y + h / 2} rx={w / 2 + sw} ry={h / 2 + sw}
                    fill={SCREEN_HEX} fillOpacity="0.08"
                    stroke={SCREEN_HEX} strokeWidth={sw} strokeDasharray={`${dash} ${dash * 0.7}`}
                  />
                ) : (
                  <rect
                    x={x} y={y} width={w} height={h}
                    fill={SCREEN_HEX} fillOpacity="0.07"
                    stroke={SCREEN_HEX} strokeWidth={sw} strokeDasharray={`${dash} ${dash * 0.7}`}
                  />
                )}
                <rect x={x} y={labelY} width={labelW} height={labelH} fill={SCREEN_HEX} rx={fs * 0.2} />
                <text
                  x={x + fs * 0.4} y={labelY + fs * 0.5 + fs * 0.78}
                  fill="#06283d" fontSize={fs} fontWeight="700"
                  style={{ fontFamily: 'system-ui, "Pretendard Variable", sans-serif' }}
                >
                  {label}
                </text>
              </g>
            )
          })}
        </svg>
      )}

      {/* 검수 모달 — 박스 클릭 시. active 윈도우를 벗어나도 유지되도록 svg 밖에 렌더. */}
      {reviewTarget && (
        <div
          className="absolute inset-0 z-40 bg-black/60 flex items-center justify-center p-4 pointer-events-auto"
          onClick={(e) => { e.stopPropagation(); closeModal() }}
        >
          <div
            className="w-full max-w-md bg-dashboard-panel border border-neutral-700 rounded-xl shadow-2xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-0 border-t-2 border-dashed" style={{ borderColor: SCREEN_HEX }} />
              <h3 className="text-sm font-semibold text-white">
                단열 스크리닝 검수 — {reviewTarget.kind === 'spot' ? '의심·점' : '의심·면'}
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 mb-3 break-keep">
              스크리닝은 상대 색이상 기반 <b className="text-slate-300">보조 신호</b>입니다(확정 진단 아님).
              검수 결과는 보고서엔 들어가지 않고, 오탐은 모델 재학습 데이터로만 회수됩니다.
            </p>

            <textarea
              ref={textareaRef}
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
              placeholder="오탐 사유(필수) 또는 메모 — 예: 창틀 반사를 단열 의심으로 오인"
              rows={3}
              className="w-full text-sm bg-neutral-900 border border-neutral-700 rounded-md px-2 py-1.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-500/60"
            />
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-slate-500">{note.length}/{NOTE_MAX}</span>
              {errorMsg && (
                <span className="inline-flex items-center gap-1 text-[10px] text-rose-300">
                  <AlertTriangle size={10} /> {errorMsg}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 mt-3">
              <button
                type="button"
                onClick={() => submit('confirmed')}
                disabled={busy}
                title="실제 단열 의심부로 확인(참고용)"
                className="flex-1 inline-flex items-center justify-center gap-1 min-h-[36px] px-2 rounded-md text-[11px] font-semibold bg-emerald-600/15 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-600/40 transition disabled:opacity-40"
              >
                {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} 확인
              </button>
              <button
                type="button"
                onClick={() => submit('dismissed')}
                disabled={busy}
                title="무시 — 추적 불필요"
                className="flex-1 inline-flex items-center justify-center gap-1 min-h-[36px] px-2 rounded-md text-[11px] font-semibold bg-slate-600/15 hover:bg-slate-600/30 text-slate-300 border border-slate-600/40 transition disabled:opacity-40"
              >
                <Ban size={12} /> 무시
              </button>
              <button
                type="button"
                onClick={() => submit('flagged_false_positive')}
                disabled={busy}
                title="모델 오탐 — 학습 데이터로 회수(사유 필수)"
                className="flex-1 inline-flex items-center justify-center gap-1 min-h-[36px] px-2 rounded-md text-[11px] font-semibold bg-amber-600/15 hover:bg-amber-600/30 text-amber-300 border border-amber-600/40 transition disabled:opacity-40"
              >
                <Flag size={12} /> 오탐
              </button>
              <button
                type="button"
                onClick={closeModal}
                disabled={busy}
                aria-label="닫기"
                title="닫기 (Esc)"
                className="inline-flex items-center justify-center min-h-[36px] px-2 rounded-md text-slate-400 hover:text-white hover:bg-neutral-800 border border-neutral-700 transition disabled:opacity-40"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
