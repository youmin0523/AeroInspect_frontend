/**
 * AdminGpu.jsx
 * 역할: 슈퍼어드민 전용 — GCP GPU VM (drone-stream-api) 원격 제어
 *       - 상태 조회 / 시작 / 정지
 *       - 로컬 bat 파일 의존 제거 → 어떤 브라우저든 admin 권한이면 제어 가능 (상용 멀티유저 운영)
 *       - 시간당 ~$0.71 (L4 GPU) 과금 시각화 + 누적 분 단위 사용 시간 표시
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { ArrowLeft, Power, PowerOff, RefreshCw, Cpu, AlertTriangle, Clock, RotateCcw } from 'lucide-react'
import useAuthStore from '../../store/authStore'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const STATUS_BADGE = {
  RUNNING: 'bg-green-100 text-green-700 border-green-200',
  STAGING: 'bg-amber-100 text-amber-700 border-amber-200',
  PROVISIONING: 'bg-amber-100 text-amber-700 border-amber-200',
  STOPPING: 'bg-orange-100 text-orange-700 border-orange-200',
  TERMINATED: 'bg-gray-100 text-gray-600 border-gray-200',
}

const STATUS_LABEL = {
  RUNNING: '실행 중',
  STAGING: '준비 중',
  PROVISIONING: '준비 중',
  STOPPING: '정지 중',
  TERMINATED: '정지됨',
}

const HOURLY_RATE_USD = 0.71  // L4 GPU asia-northeast3-a 기준
const USD_TO_KRW = 1380       // 환율은 운영 시 환경변수로 빼는 게 정석. 데드라인상 상수 고정.
const POLL_INTERVAL_MS = 10_000

const formatMinutes = (totalSec) => {
  const m = Math.floor(totalSec / 60)
  const h = Math.floor(m / 60)
  return h > 0 ? `${h}시간 ${m % 60}분` : `${m}분`
}
const usdFromSec = (sec) => (sec / 3600) * HOURLY_RATE_USD
const krwFromUsd = (usd) => Math.round(usd * USD_TO_KRW)

export default function AdminGpu() {
  const navigate = useNavigate()
  const { token, user } = useAuthStore()
  const isSuperadmin = user?.is_superadmin

  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)  // start/stop 중일 때 버튼 비활성화
  const [error, setError] = useState('')
  const [confirmAction, setConfirmAction] = useState(null)  // 'start' | 'stop' | 'reset' | null
  const [resetting, setResetting] = useState(false)

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])
  const pollTimerRef = useRef(null)

  const fetchStatus = useCallback(async () => {
    try {
      setError('')
      const res = await axios.get(`${API_BASE}/api/v1/admin/gpu/status`, { headers })
      setStatus(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'GPU 상태 조회에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [headers])

  useEffect(() => {
    if (!isSuperadmin) return
    fetchStatus()
    pollTimerRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS)
    return () => clearInterval(pollTimerRef.current)
  }, [fetchStatus, isSuperadmin])

  const handleStart = async () => {
    setBusy(true)
    setError('')
    try {
      await axios.post(`${API_BASE}/api/v1/admin/gpu/start`, {}, { headers })
      await fetchStatus()
    } catch (err) {
      setError(err.response?.data?.detail || 'GPU 시작 요청에 실패했습니다.')
    } finally {
      setBusy(false)
      setConfirmAction(null)
    }
  }

  const handleStop = async () => {
    setBusy(true)
    setError('')
    try {
      await axios.post(`${API_BASE}/api/v1/admin/gpu/stop`, {}, { headers })
      await fetchStatus()
    } catch (err) {
      setError(err.response?.data?.detail || 'GPU 정지 요청에 실패했습니다.')
    } finally {
      setBusy(false)
      setConfirmAction(null)
    }
  }

  // 이번 사이클(현재 RUNNING 중인 세션) — 백엔드 usage.in_progress_seconds 사용.
  // GCP last_start_at 직접 계산보다 백엔드 추적이 reset/롤오버까지 정합.
  const cycleInfo = useMemo(() => {
    const sec = status?.usage?.in_progress_seconds ?? 0
    if (sec <= 0) return null
    const usd = usdFromSec(sec)
    return { seconds: sec, label: formatMinutes(sec), usd, krw: krwFromUsd(usd) }
  }, [status])

  // 이번 달 누적 (KST 매월 1일 자동 롤오버, 사용자 리셋 시 그 시점 이후만 누적)
  const monthInfo = useMemo(() => {
    const usage = status?.usage
    if (!usage) return null
    const sec = usage.total_seconds ?? 0
    const usd = usdFromSec(sec)
    return {
      seconds: sec,
      label: formatMinutes(sec),
      usd,
      krw: krwFromUsd(usd),
      periodLabel: usage.period_label,
      periodStart: usage.period_start,
    }
  }, [status])

  const handleReset = async () => {
    setResetting(true)
    setError('')
    try {
      await axios.post(`${API_BASE}/api/v1/admin/gpu/usage/reset`, {}, { headers })
      await fetchStatus()
    } catch (err) {
      setError(err.response?.data?.detail || '누적 사용량 초기화에 실패했습니다.')
    } finally {
      setResetting(false)
      setConfirmAction(null)
    }
  }

  if (!isSuperadmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">접근 권한 없음</h2>
          <p className="text-sm text-gray-500 mb-6">GPU 제어는 플랫폼 슈퍼어드민 전용입니다.</p>
          <button onClick={() => navigate('/employee')} className="px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 transition">
            대시보드로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  const currentStatus = status?.status
  const isRunning = currentStatus === 'RUNNING'
  const isTransitioning = currentStatus === 'STAGING' || currentStatus === 'PROVISIONING' || currentStatus === 'STOPPING'

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* 헤더 */}
        <button onClick={() => navigate('/employee')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2">
          <ArrowLeft className="w-4 h-4" /> 대시보드로 돌아가기
        </button>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Cpu className="w-6 h-6 text-blue-600" /> GPU 추론 서버 제어
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              GCP L4 GPU VM (drone-stream-api) — 점검 시작 전 켜고, 종료 후 정지하세요.
            </p>
          </div>
          <span className="inline-block text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">슈퍼어드민</span>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>
        )}

        {/* 상태 카드 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">현재 상태</div>
              {loading ? (
                <div className="text-gray-400">불러오는 중...</div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className={`inline-block px-3 py-1 text-sm font-semibold border rounded-full ${STATUS_BADGE[currentStatus] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {STATUS_LABEL[currentStatus] || currentStatus || '알 수 없음'}
                  </span>
                  {status?.machine_type && (
                    <span className="text-xs text-gray-400">{status.machine_type} · {status.zone}</span>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={fetchStatus}
              disabled={busy}
              title="상태 새로고침"
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-gray-500 ${busy ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* 사용량 카드: 이번 사이클 + 이번 달 누적 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 text-sm">
            {/* 이번 사이클 — RUNNING 중일 때만 의미 있음 */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                <Clock className="w-3 h-3" /> 이번 사이클 (현재 실행)
              </div>
              {cycleInfo ? (
                <>
                  <div className="font-semibold text-slate-900">{cycleInfo.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    ${cycleInfo.usd.toFixed(2)} · ₩{cycleInfo.krw.toLocaleString('ko-KR')}
                  </div>
                </>
              ) : (
                <div className="text-gray-400 text-xs">실행 중 아님</div>
              )}
            </div>

            {/* 이번 달 누적 */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs text-gray-400">
                  이번 달 누적{monthInfo?.periodLabel ? ` (${monthInfo.periodLabel})` : ''}
                </div>
                <button
                  onClick={() => setConfirmAction('reset')}
                  disabled={resetting || !monthInfo}
                  title="누적 초기화 — 이 시점 이후로 다시 카운트"
                  className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 disabled:opacity-40"
                >
                  <RotateCcw className={`w-3 h-3 ${resetting ? 'animate-spin' : ''}`} />
                </button>
              </div>
              {monthInfo ? (
                <>
                  <div className="font-semibold text-slate-900">{monthInfo.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    ${monthInfo.usd.toFixed(2)} · ₩{monthInfo.krw.toLocaleString('ko-KR')}
                  </div>
                </>
              ) : (
                <div className="text-gray-400 text-xs">집계 대기 중</div>
              )}
            </div>
          </div>

          {/* 버튼 */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setConfirmAction('start')}
              disabled={busy || isRunning || isTransitioning}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <Power className="w-4 h-4" /> 시작
            </button>
            <button
              onClick={() => setConfirmAction('stop')}
              disabled={busy || !isRunning}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <PowerOff className="w-4 h-4" /> 정지
            </button>
          </div>

          {isTransitioning && (
            <p className="text-xs text-amber-600 mt-3 text-center">
              상태 전환 중입니다. 1~2분 정도 걸릴 수 있어요. (10초마다 자동 갱신)
            </p>
          )}
        </div>

        {/* 비용 가이드 */}
        <div className="bg-white rounded-2xl shadow-sm p-5 text-sm text-gray-600 space-y-2">
          <div className="font-semibold text-slate-900">비용 가이드</div>
          <ul className="list-disc list-inside space-y-1">
            <li><span className="font-medium text-green-700">실행 중</span>: 시간당 ~${HOURLY_RATE_USD.toFixed(2)} (L4 GPU)</li>
            <li><span className="font-medium text-gray-700">정지됨</span>: GPU 과금 중단, 디스크/IP 만 ~$13/월 유지</li>
            <li>점검 직전 켜고, 종료 직후 정지하는 운영을 권장합니다.</li>
          </ul>
        </div>

        {/* 확인 모달 */}
        {confirmAction && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {confirmAction === 'start' && 'GPU 서버를 시작할까요?'}
                {confirmAction === 'stop' && 'GPU 서버를 정지할까요?'}
                {confirmAction === 'reset' && '이번 달 누적 사용량을 초기화할까요?'}
              </h3>
              <p className="text-sm text-gray-600 mb-5">
                {confirmAction === 'start' && `시작 직후 시간당 ~$${HOURLY_RATE_USD.toFixed(2)} 과금이 시작됩니다. 점검이 끝나면 반드시 정지해주세요.`}
                {confirmAction === 'stop' && '진행 중인 추론 세션이 모두 끊깁니다. 점검이 완전히 끝났는지 확인해주세요.'}
                {confirmAction === 'reset' && '누적이 0으로 초기화되고, 지금 시점부터 다시 카운트됩니다. 진행 중인 세션은 절단되어 새 누적의 일부로만 잡힙니다.'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmAction(null)}
                  disabled={busy || resetting}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  onClick={
                    confirmAction === 'start' ? handleStart
                    : confirmAction === 'stop' ? handleStop
                    : handleReset
                  }
                  disabled={busy || resetting}
                  className={`flex-1 px-4 py-2.5 text-white rounded-lg transition disabled:opacity-50 ${
                    confirmAction === 'start' ? 'bg-green-600 hover:bg-green-700'
                    : confirmAction === 'reset' ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-slate-900 hover:bg-slate-800'
                  }`}
                >
                  {(busy || resetting) ? '처리 중...'
                    : confirmAction === 'start' ? '시작'
                    : confirmAction === 'reset' ? '초기화'
                    : '정지'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
