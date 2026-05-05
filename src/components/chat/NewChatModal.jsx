/**
 * components/chat/NewChatModal.jsx
 * 역할: 새 대화 시작 모달 — 같은 조직(회사) 멤버 검색/선택, DM 또는 그룹 생성
 *
 * 팀원 목록 기준:
 *   - organizationApi.listOrganizationMembers() 로 같은 회사 멤버 조회
 *   - 방식 1: biz_number(사업자등록번호) 자동 매칭 → 같은 조직
 *   - 방식 2: admin/owner 가 초대한 멤버 → invited/active 상태
 *   - 자기 자신 제외, active + invited 멤버만 표시
 */

import { useState, useEffect } from 'react'
import { X, Search, Building2 } from 'lucide-react'
import useChatStore from '../../store/chatStore.js'
import { USER_STATUS_CONFIG } from '../../constants/chatConstants.js'
import { listOrganizationMembers } from '../../api/organizationApi.js'

function getCurrentUser() {
  return JSON.parse(sessionStorage.getItem('user') || 'null') || { id: null, name: '사용자' }
}

export default function NewChatModal() {
  const closeNewChatModal = useChatStore((s) => s.closeNewChatModal)
  const startDM = useChatStore((s) => s.startDM)
  const createConversation = useChatStore((s) => s.createConversation)

  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState([])
  const [groupName, setGroupName] = useState('')
  const [orgMembers, setOrgMembers] = useState([])
  const [orgInfo, setOrgInfo] = useState(null)
  const [loading, setLoading] = useState(true)

  // 조직 멤버 로드
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { organization, members } = await listOrganizationMembers()
        if (!cancelled) {
          setOrgInfo(organization)
          // 자기 자신 제외, active 멤버 우선 정렬
          const currentUser = getCurrentUser()
          setOrgMembers(
            members
              .filter((m) => m.user_id !== currentUser.id)
              .sort((a, b) => {
                if (a.status === 'active' && b.status !== 'active') return -1
                if (a.status !== 'active' && b.status === 'active') return 1
                return a.name.localeCompare(b.name, 'ko')
              })
          )
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // ESC → 닫기
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') closeNewChatModal() }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [closeNewChatModal])

  // 검색 필터
  const filtered = search.trim()
    ? orgMembers.filter((m) =>
        m.name.includes(search) ||
        (m.department || '').includes(search) ||
        (m.position || '').includes(search) ||
        m.email.includes(search)
      )
    : orgMembers

  // 부서별 그룹핑
  const departments = [...new Set(filtered.map((m) => m.department || '미배정'))]

  const toggleMember = (id) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  const handleCreate = async () => {
    if (selected.length === 0) return
    if (selected.length === 1) {
      await startDM(selected[0])
    } else {
      const names = selected.map((id) => orgMembers.find((m) => m.user_id === id)?.name).filter(Boolean)
      const name = groupName.trim() || `${getCurrentUser().name}, ${names.join(', ')}`
      await createConversation({ type: 'group', name, participants: selected })
    }
    closeNewChatModal()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-lg text-slate-800">새 대화 시작</h2>
            {orgInfo && (
              <p className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                <Building2 size={11} />
                {orgInfo.name} · {orgInfo.member_count}명
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={closeNewChatModal}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* 검색 */}
        <div className="px-5 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="이름, 부서, 직위, 이메일로 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* 선택된 멤버 칩 */}
        {selected.length > 0 && (
          <div className="px-5 pb-2 flex flex-wrap gap-1.5">
            {selected.map((id) => {
              const m = orgMembers.find((x) => x.user_id === id)
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full"
                >
                  {m?.name}
                  <button type="button" onClick={() => toggleMember(id)} className="hover:text-blue-900">
                    <X size={12} />
                  </button>
                </span>
              )
            })}
          </div>
        )}

        {/* 그룹명 (2명 이상 선택 시) */}
        {selected.length >= 2 && (
          <div className="px-5 py-2">
            <input
              type="text"
              placeholder="그룹 이름 (선택사항)"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-gray-400"
            />
          </div>
        )}

        {/* 팀원 목록 — 부서별 그룹핑 */}
        <div className="max-h-64 overflow-y-auto px-3 py-2">
          {loading ? (
            <p className="text-center text-sm text-gray-400 py-8">멤버 불러오는 중...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">검색 결과가 없습니다</p>
          ) : (
            departments.map((dept) => {
              const deptMembers = filtered.filter((m) => (m.department || '미배정') === dept)
              if (deptMembers.length === 0) return null
              return (
                <div key={dept}>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 pt-3 pb-1">
                    {dept}
                  </p>
                  {deptMembers.map((m) => {
                    const isSelected = selected.includes(m.user_id)
                    const statusCfg = USER_STATUS_CONFIG[m.online_status] || USER_STATUS_CONFIG.offline
                    return (
                      <label
                        key={m.user_id}
                        className={`flex items-center gap-3 py-2.5 px-3 rounded-lg cursor-pointer transition ${
                          isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                        } ${m.status === 'invited' ? 'opacity-60' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleMember(m.user_id)}
                          disabled={m.status === 'invited'}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold">
                            {m.initials}
                          </div>
                          <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${statusCfg.dot}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold text-slate-800 truncate">{m.name}</p>
                            <span className="text-xs text-gray-500">{m.position}</span>
                            {m.role === 'owner' && (
                              <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">소유자</span>
                            )}
                            {m.role === 'admin' && (
                              <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">관리자</span>
                            )}
                            {m.status === 'invited' && (
                              <span className="text-[9px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">초대됨</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 truncate">{m.email}</p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>

        {/* 하단 */}
        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={closeNewChatModal}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={selected.length === 0}
            className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm"
          >
            {selected.length <= 1 ? '1:1 대화 시작' : '그룹 대화 시작'}
          </button>
        </div>
      </div>
    </div>
  )
}
