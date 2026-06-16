/**
 * components/defects/DefectReviewActions.jsx
 * 역할: DefectCard 하단에 붙는 인라인 검수 액션 UI (R-v1.1.x).
 *       - ✓ 확인(approved): 1클릭 처리
 *       - ✗ 반려(rejected): review_note 필수 입력 모달
 *       - 🚩 오탐(flagged_false_positive): review_note 필수 입력 모달
 *       - 이미 검수된 카드는 "검수자 + 시각 + 재검수" UI 로 전환
 *
 *   사용자 시나리오 ([feedback_strict_all_defects]):
 *     입주자 신뢰가 직결되는 만큼, 검수자가 현장에서 의심 검출을 1탭 안에 거부할 수 있어야 한다.
 *     오탐 신고는 추후 모델 재학습 데이터로 쓰이므로 review_note 를 강제(2000자 한도).
 *
 *   백엔드 계약: defectsApi.reviewDefect(id, { review_status, review_note })
 *     성공 시 응답 DefectLogResponse 를 defectStore.applyReviewedDefect 로 머지.
 *     동일 갱신이 WS "defect.reviewed" 이벤트로도 들어오지만 applyReviewedDefect 가 idempotent 라 안전.
 *
 *   에러 처리: 호출 실패 시 컴포넌트 내부 errorMsg state 로 인라인 빨간 배너 표시 (3초 후 자동 소실).
 *     (에러는 액션 버튼 옆 인라인으로 흐름 차단 0. 성공은 전역 toast 로 '접수/반영' 피드백 닫힘.)
 *
 *   접근성: 모달 내부 textarea autofocus, ESC 닫기, 모바일 viewport 에서 버튼 min-h 36px 확보.
 */

import { useEffect, useRef, useState } from 'react'
import { Check, X, Flag, Loader2, RotateCcw, AlertTriangle } from 'lucide-react'
import { reviewDefect } from '../../api/defectsApi.js'
import useDefectStore from '../../store/defectStore.js'
import useAuthStore from '../../store/authStore.js'
import { toast } from '../../store/toastStore.js'

const NOTE_MAX = 2000
const ERROR_DISMISS_MS = 3000

const STATUS_STYLE = {
  pending: { label: '미검수',     dot: 'bg-slate-400',  text: 'text-slate-300' },
  approved: { label: '확인',      dot: 'bg-emerald-500', text: 'text-emerald-300' },
  rejected: { label: '반려',      dot: 'bg-rose-500',    text: 'text-rose-300' },
  flagged_false_positive: { label: '오탐', dot: 'bg-amber-500', text: 'text-amber-300' },
}

function StatusPill({ status }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.pending
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

/**
 * @param {{ defect: object, onAfterReview?: () => void }} props
 */
export default function DefectReviewActions({ defect, onAfterReview }) {
  const applyReviewedDefect = useDefectStore((s) => s.applyReviewedDefect)
  const currentUserName = useAuthStore((s) => s.user?.name) ?? '검수자'

  const [pendingAction, setPendingAction] = useState(null)  // 'approved' | 'rejected' | 'flagged_false_positive' | null
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [showNoteModal, setShowNoteModal] = useState(null)  // null | 'rejected' | 'flagged_false_positive'

  const errorTimerRef = useRef(null)
  const textareaRef = useRef(null)

  // 에러 메시지 자동 소실
  useEffect(() => {
    if (!errorMsg) return
    clearTimeout(errorTimerRef.current)
    errorTimerRef.current = setTimeout(() => setErrorMsg(''), ERROR_DISMISS_MS)
    return () => clearTimeout(errorTimerRef.current)
  }, [errorMsg])

  // 모달 열릴 때 textarea autofocus + ESC 닫기
  useEffect(() => {
    if (!showNoteModal) return
    textareaRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setShowNoteModal(null)
        setNote('')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showNoteModal])

  const handleApprove = async (e) => {
    e?.stopPropagation()
    if (busy) return
    setBusy(true)
    setPendingAction('approved')
    setErrorMsg('')
    try {
      const updated = await reviewDefect(defect.id, { review_status: 'approved' })
      applyReviewedDefect(updated)
      onAfterReview?.('approved')
      // 피드백 닫힘 — 처리됨을 알리고, 1클릭 승인이 되돌릴 수 있음을 함께 안내(승인/반려 비대칭 완화).
      toast.success('확인 처리됐어요. 필요하면 ‘재검수’로 되돌릴 수 있어요.')
    } catch (err) {
      console.error('[DefectReviewActions] approve 실패', err)
      setErrorMsg('검수 저장에 실패했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setBusy(false)
      setPendingAction(null)
    }
  }

  const submitNoteAction = async (e) => {
    e?.preventDefault()
    if (busy || !showNoteModal) return
    const trimmed = note.trim()
    if (trimmed.length === 0) {
      setErrorMsg('사유를 입력해 주세요 (필수).')
      return
    }
    setBusy(true)
    setPendingAction(showNoteModal)
    setErrorMsg('')
    try {
      const updated = await reviewDefect(defect.id, {
        review_status: showNoteModal,
        review_note: trimmed.slice(0, NOTE_MAX),
      })
      applyReviewedDefect(updated)
      onAfterReview?.(showNoteModal)
      // 피드백 닫힘 — 신고/반려가 어디로 가는지 사용자에게 명시(특히 오탐은 재학습 반영을 알림).
      if (showNoteModal === 'flagged_false_positive') {
        toast.success('오탐 신고가 접수됐어요. 모델 재학습 데이터로 반영됩니다.')
      } else {
        toast.success('반려 처리됐어요. 이 하자는 보고서에서 제외됩니다.')
      }
      setShowNoteModal(null)
      setNote('')
    } catch (err) {
      console.error('[DefectReviewActions] review 실패', err)
      setErrorMsg('검수 저장에 실패했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setBusy(false)
      setPendingAction(null)
    }
  }

  const reviewStatus = defect.review_status || 'pending'
  const isReviewed = reviewStatus !== 'pending'

  const reviewedAtLabel = (() => {
    if (!defect.reviewed_at) return null
    try {
      return new Date(defect.reviewed_at).toLocaleString('ko-KR', {
        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
      })
    } catch { return null }
  })()

  // 카드 안 클릭(selectDefect) 으로 이벤트 전파 방지하면서 액션 처리
  const stop = (e) => e.stopPropagation()

  return (
    <div
      className="mt-2 pt-2 border-t border-neutral-700/60"
      onClick={stop}
      onMouseDown={stop}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <StatusPill status={reviewStatus} />
        {isReviewed && reviewedAtLabel && (
          <span className="text-[10px] text-slate-500">
            {currentUserName} · {reviewedAtLabel}
          </span>
        )}
      </div>

      {!isReviewed ? (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleApprove}
            disabled={busy}
            title="이 하자를 정상 검출로 확인"
            className="flex-1 inline-flex items-center justify-center gap-1 min-h-[36px] px-2 rounded-md text-[11px] font-semibold bg-emerald-600/15 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-600/40 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy && pendingAction === 'approved'
              ? <Loader2 size={12} className="animate-spin" />
              : <Check size={12} />}
            확인
          </button>
          <button
            type="button"
            onClick={(e) => { stop(e); setShowNoteModal('rejected') }}
            disabled={busy}
            title="검출 자체는 맞지만 보고 제외(사유 필수)"
            className="flex-1 inline-flex items-center justify-center gap-1 min-h-[36px] px-2 rounded-md text-[11px] font-semibold bg-rose-600/15 hover:bg-rose-600/30 text-rose-300 border border-rose-600/40 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <X size={12} />
            반려
          </button>
          <button
            type="button"
            onClick={(e) => { stop(e); setShowNoteModal('flagged_false_positive') }}
            disabled={busy}
            title="모델 오탐 — 학습 데이터로 회수(사유 필수)"
            className="flex-1 inline-flex items-center justify-center gap-1 min-h-[36px] px-2 rounded-md text-[11px] font-semibold bg-amber-600/15 hover:bg-amber-600/30 text-amber-300 border border-amber-600/40 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Flag size={12} />
            오탐
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          {defect.review_note ? (
            <span className="text-[10px] text-slate-400 truncate" title={defect.review_note}>
              메모: {defect.review_note}
            </span>
          ) : (
            <span className="text-[10px] text-slate-500">메모 없음</span>
          )}
          <button
            type="button"
            onClick={(e) => {
              stop(e)
              // 재검수 = pending 으로 되돌리기. 백엔드가 pending 도 허용.
              if (busy) return
              setBusy(true)
              reviewDefect(defect.id, { review_status: 'pending' })
                .then((u) => { applyReviewedDefect(u); toast.info('미검수 상태로 되돌렸어요.') })
                .catch((err) => {
                  console.error('[DefectReviewActions] re-review 실패', err)
                  setErrorMsg('재검수 전환에 실패했어요.')
                })
                .finally(() => setBusy(false))
            }}
            disabled={busy}
            className="inline-flex items-center gap-1 min-h-[28px] px-2 rounded-md text-[10px] font-semibold bg-neutral-800 hover:bg-neutral-700 text-slate-300 border border-neutral-700 transition disabled:opacity-40"
            title="다시 미검수 상태로 되돌리기"
          >
            {busy ? <Loader2 size={10} className="animate-spin" /> : <RotateCcw size={10} />}
            재검수
          </button>
        </div>
      )}

      {/* 에러 인라인 배너 */}
      {errorMsg && (
        <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-rose-300 bg-rose-900/30 border border-rose-700/40 rounded px-2 py-1">
          <AlertTriangle size={10} />
          {errorMsg}
        </div>
      )}

      {/* 사유 입력 모달 */}
      {showNoteModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={(e) => { stop(e); setShowNoteModal(null); setNote('') }}
        >
          <form
            onSubmit={submitNoteAction}
            onClick={stop}
            className="w-full max-w-md bg-dashboard-panel border border-neutral-700 rounded-xl shadow-2xl p-4"
          >
            <h3 className="text-sm font-semibold text-white mb-1">
              {showNoteModal === 'rejected' ? '하자 반려 사유' : '오탐 신고 사유'}
            </h3>
            <p className="text-[11px] text-slate-400 mb-3">
              {showNoteModal === 'rejected'
                ? '검출은 정확하지만 보고에서 제외할 사유를 적어주세요.'
                : '모델이 잘못 인식한 이유를 적어주세요. 추후 재학습 데이터로 활용됩니다.'}
            </p>
            <textarea
              ref={textareaRef}
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
              placeholder="예: 그림자 음영을 균열로 오인 / 정상 마감 무늬"
              rows={4}
              className="w-full text-sm bg-neutral-900 border border-neutral-700 rounded-md px-2 py-1.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-500/60"
            />
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-slate-500">
                {note.length}/{NOTE_MAX}
              </span>
              {errorMsg && (
                <span className="text-[10px] text-rose-300">{errorMsg}</span>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 mt-3">
              <button
                type="button"
                onClick={() => { setShowNoteModal(null); setNote(''); setErrorMsg('') }}
                disabled={busy}
                className="px-3 py-1.5 rounded-md text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-slate-300 border border-neutral-700 transition disabled:opacity-40"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={busy || note.trim().length === 0}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold text-white transition disabled:opacity-40 disabled:cursor-not-allowed ${
                  showNoteModal === 'rejected'
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-amber-600 hover:bg-amber-500'
                }`}
              >
                {busy ? <Loader2 size={12} className="animate-spin" /> : null}
                저장
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
