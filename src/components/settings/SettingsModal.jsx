/**
 * components/settings/SettingsModal.jsx
 * 역할: Sidebar 설정 아이콘 클릭 시 노출되는 간이 설정 패널
 *       - 알림(브라우저 푸시) 권한 요청
 *       - 테스트 모드 토글 (sessionStore)
 *       - 캐시/세션 정리 버튼
 *       - 현재 사용자/조직 메타 표시
 * 정책: 본 라운드(R-v1.1.18)는 최소 UX. 향후 i18n/테마/단축키는 추가.
 */

import { useState } from 'react'
import { X, Bell, FlaskConical, Trash2, User, Building2 } from 'lucide-react'
import useAuthStore from '../../store/authStore.js'
import useSessionStore from '../../store/sessionStore.js'

export default function SettingsModal({ isOpen, onClose }) {
  const user = useAuthStore((s) => s.user)
  const currentOrg = useAuthStore((s) => s.currentOrg)
  const isTestMode = useSessionStore((s) => s.isTestMode)
  const enterTestMode = useSessionStore((s) => s.enterTestMode)
  const resetSession = useSessionStore((s) => s.reset)
  const [notifPerm, setNotifPerm] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  )

  if (!isOpen) return null

  const handleRequestNotif = async () => {
    if (typeof Notification === 'undefined') return
    const p = await Notification.requestPermission()
    setNotifPerm(p)
  }

  const handleClearCache = () => {
    if (!confirm('브라우저 캐시(localStorage/sessionStorage 인증 키 제외)를 정리할까요?')) return
    const keep = new Set(['access_token', 'refresh_token', 'user', 'current_org', 'last_login_method'])
    for (const key of Object.keys(localStorage)) {
      if (!keep.has(key)) localStorage.removeItem(key)
    }
    for (const key of Object.keys(sessionStorage)) {
      if (!keep.has(key)) sessionStorage.removeItem(key)
    }
    alert('완료. 새로고침 권장합니다.')
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-dashboard-surface border border-dashboard-border rounded-xl shadow-2xl w-[480px] max-w-[92vw] max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-dashboard-border">
          <h2 className="text-base font-semibold text-white">설정</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition"
            title="닫기"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5 text-sm">
          {/* 사용자/조직 메타 */}
          <section className="space-y-2">
            <h3 className="text-xs uppercase tracking-wider text-slate-500">계정</h3>
            <div className="flex items-center gap-2 text-slate-300">
              <User size={14} />
              <span>{user?.username || user?.email || '미로그인'}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Building2 size={14} />
              <span>{currentOrg?.name || '조직 미소속'}</span>
              {currentOrg?.role && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-accent-500/15 text-accent-300">
                  {currentOrg.role}
                </span>
              )}
            </div>
          </section>

          {/* 알림 권한 */}
          <section className="space-y-2">
            <h3 className="text-xs uppercase tracking-wider text-slate-500">알림</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-300">
                <Bell size={14} />
                <span>브라우저 푸시 알림</span>
              </div>
              <button
                onClick={handleRequestNotif}
                disabled={notifPerm === 'granted' || notifPerm === 'unsupported'}
                className={`text-xs px-2 py-1 rounded border transition ${
                  notifPerm === 'granted'
                    ? 'border-emerald-500/40 text-emerald-300 cursor-default'
                    : notifPerm === 'denied'
                      ? 'border-red-500/40 text-red-300'
                      : 'border-dashboard-border text-slate-300 hover:bg-white/5'
                }`}
              >
                {notifPerm === 'granted' && '허용됨'}
                {notifPerm === 'denied' && '차단됨 — 브라우저 설정에서 변경'}
                {notifPerm === 'default' && '권한 요청'}
                {notifPerm === 'unsupported' && '미지원'}
              </button>
            </div>
          </section>

          {/* 테스트 모드 */}
          <section className="space-y-2">
            <h3 className="text-xs uppercase tracking-wider text-slate-500">개발/시연</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-300">
                <FlaskConical size={14} />
                <span>테스트 모드 (시연용 가상 드론 스트림)</span>
              </div>
              <button
                onClick={() => {
                  if (isTestMode) {
                    if (confirm('테스트 모드를 종료할까요? 현재 세션이 초기화됩니다.')) {
                      resetSession()
                    }
                  } else {
                    enterTestMode()
                    onClose()
                  }
                }}
                className={`text-xs px-2 py-1 rounded border transition ${
                  isTestMode
                    ? 'border-amber-500/40 text-amber-300 bg-amber-500/10'
                    : 'border-dashboard-border text-slate-400 hover:bg-white/5'
                }`}
              >
                {isTestMode ? 'ON (종료)' : 'OFF (진입)'}
              </button>
            </div>
            <p className="text-xs text-slate-500 pl-6">
              ON 시 backend stream/test/init 호출. 실제 드론 연결 없이 검출 데모.
            </p>
          </section>

          {/* 캐시 정리 */}
          <section className="space-y-2">
            <h3 className="text-xs uppercase tracking-wider text-slate-500">유지보수</h3>
            <button
              onClick={handleClearCache}
              className="flex items-center gap-2 text-xs px-3 py-1.5 rounded border border-dashboard-border text-slate-300 hover:bg-white/5 hover:border-neutral-500 transition"
            >
              <Trash2 size={13} />
              <span>인증 외 캐시 정리</span>
            </button>
            <p className="text-xs text-slate-500">
              로그인 토큰은 보존됩니다. 알림 캐시·임시 폼 데이터 등만 삭제.
            </p>
          </section>

          <p className="text-xs text-slate-600 pt-2 border-t border-dashboard-border">
            ※ 테마/언어/단축키 설정은 다음 라운드에서 추가될 예정입니다.
          </p>
        </div>
      </div>
    </div>
  )
}
