/**
 * components/video/GpuStatusNotice.jsx
 * 역할: 검출이 기대되는 상황(영상 분석 대기 / AI 모델 로딩)이 오래 지속되면 GPU 추론 서버 상태를
 *       조회해 'GPU 꺼짐 / 켜지는 중'을 명확히 안내한다.
 *       (이전: GPU 가 꺼져 있어도 'AI 모델 로딩 중' 배너만 무한정 노출 → 무음 실패였음.)
 *
 *   동작:
 *     - enabled=true 인 동안에만 GPU 상태를 늦게(PROBE_DELAY_MS) 1회 조회 후 주기 재조회.
 *       → 정상 검출은 보통 수 초 내 박스가 뜨므로, 그보다 길게 기다린 뒤에만 조회해 오탐(거짓 경고) 방지.
 *     - GPU 가 OFF/전환중일 때만 배너 렌더. RUNNING / 미확인이면 렌더 0(기존 로딩 배너 그대로).
 *     - admin(owner/admin/superadmin)에게는 'GPU 켜기' 링크, 그 외엔 '관리자에게 요청' 안내.
 *
 *   안전(기존 동작 불변): 조회 실패(권한/네트워크)면 fetchedOk=false → 아무 것도 렌더하지 않음.
 */

import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PowerOff, Loader2, ArrowRight } from 'lucide-react'
import useGpuStatusStore, { GPU_OFF_STATES, GPU_TRANSITION_STATES } from '../../store/gpuStatusStore.js'
import useAuthStore from '../../store/authStore.js'

// 정상 검출이면 수 초 내 박스가 뜬다. 콜드 모델 로드를 감안해 그보다 넉넉히 기다린 뒤에만 조회.
const PROBE_DELAY_MS = 8000
const REPROBE_MS = 12000

export default function GpuStatusNotice({ enabled }) {
  const status = useGpuStatusStore((s) => s.status)
  const fetchedOk = useGpuStatusStore((s) => s.fetchedOk)
  const fetchStatus = useGpuStatusStore((s) => s.fetchStatus)
  const user = useAuthStore((s) => s.user)
  const currentOrg = useAuthStore((s) => s.currentOrg)

  // enabled 인 동안에만 지연 조회 + 주기 재조회. 비활성/언마운트 시 타이머 정리.
  useEffect(() => {
    if (!enabled) return
    const first = setTimeout(fetchStatus, PROBE_DELAY_MS)
    const poll = setInterval(fetchStatus, PROBE_DELAY_MS + REPROBE_MS)
    return () => { clearTimeout(first); clearInterval(poll) }
  }, [enabled, fetchStatus])

  if (!enabled || !fetchedOk || !status) return null
  const isOff = GPU_OFF_STATES.has(status)
  const isTransition = GPU_TRANSITION_STATES.has(status)
  if (!isOff && !isTransition) return null  // RUNNING 등 정상이면 안내 안 함

  const isAdmin = !!user?.is_superadmin || (currentOrg && ['owner', 'admin'].includes(currentOrg.role))

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 max-w-[92%] flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-950/90 border border-rose-400/50 shadow-xl">
      {isTransition ? (
        <Loader2 size={14} className="shrink-0 text-amber-300 animate-spin" />
      ) : (
        <PowerOff size={14} className="shrink-0 text-rose-300" />
      )}
      <div className="text-[11px] leading-tight">
        {isTransition ? (
          <span className="font-semibold text-amber-200">
            GPU 추론 서버가 켜지는 중입니다 — 1~2분 후 검출이 시작돼요.
          </span>
        ) : (
          <>
            <span className="font-semibold text-rose-200">
              GPU 추론 서버가 꺼져 있어 하자 검출이 동작하지 않아요.
            </span>
            {isAdmin ? (
              <Link
                to="/employee/admin/gpu"
                className="ml-2 inline-flex items-center gap-0.5 font-semibold text-rose-100 underline decoration-rose-400/60 underline-offset-2 hover:text-white"
              >
                GPU 켜기 <ArrowRight size={11} />
              </Link>
            ) : (
              <span className="ml-1 text-rose-300/90">관리자에게 서버 시작을 요청하세요.</span>
            )}
          </>
        )}
      </div>
    </div>
  )
}
