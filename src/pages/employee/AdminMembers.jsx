/**
 * AdminMembers.jsx
 * 역할: 관리자 멤버 관리 페이지
 *       - 슈퍼어드민: 전체 사용자 목록 (모든 조직)
 *       - 조직 관리자: 조직 멤버 + 미소속 사용자
 *       - 부서 관리 탭 (DB 기반 CRUD)
 *       - 검색, 휴대폰 번호 표시
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import useAuthStore from '../../store/authStore'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export default function AdminMembers() {
  const navigate = useNavigate()
  const { token, user } = useAuthStore()
  const isSuperadmin = user?.is_superadmin
  const [tab, setTab] = useState(isSuperadmin ? 'all' : 'members')
  const [orgInfo, setOrgInfo] = useState(null)
  const [members, setMembers] = useState([])
  const [unaffiliated, setUnaffiliated] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // 조직 목록 (슈퍼어드민용)
  const [allOrgs, setAllOrgs] = useState([])
  // 배정 모달에서 선택한 조직의 부서 목록
  const [assignOrgDepts, setAssignOrgDepts] = useState([])

  // 모달 상태
  const [assignModal, setAssignModal] = useState(null)
  const [assignForm, setAssignForm] = useState({ organization_id: '', role: 'member', department: '', position: '' })
  const [detailModal, setDetailModal] = useState(null)
  const [editForm, setEditForm] = useState({ role: 'member', department: '', position: '', status: 'active', started_at: '', ended_at: '' })
  const [deptEditName, setDeptEditName] = useState('')
  const [deptEditId, setDeptEditId] = useState(null)
  const [newDeptName, setNewDeptName] = useState('')
  const [copied, setCopied] = useState(false)

  // token 별로 참조 안정화 — fetchData useCallback 의존성으로 안전하게 넣기 위함(매 렌더 새 객체 방지).
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // 슈퍼어드민: 전체 사용자 목록 우선, 조직 API는 소속 있을 때만
      if (isSuperadmin) {
        const [allUsersRes, allOrgsRes] = await Promise.all([
          axios.get(`${API_BASE}/api/v1/organizations/admin/all-users`, { headers }),
          axios.get(`${API_BASE}/api/v1/organizations/admin/all-orgs`, { headers }),
        ])
        setAllUsers(allUsersRes.data)
        setAllOrgs(allOrgsRes.data)

        // 조직 소속이면 멤버/부서도 로드, 아니면 빈 배열
        try {
          const [membersRes, unaffRes, deptRes] = await Promise.all([
            axios.get(`${API_BASE}/api/v1/organizations/members`, { headers }),
            axios.get(`${API_BASE}/api/v1/organizations/unaffiliated-users`, { headers }),
            axios.get(`${API_BASE}/api/v1/organizations/departments`, { headers }),
          ])
          setOrgInfo(membersRes.data.organization)
          setMembers(membersRes.data.members)
          setUnaffiliated(unaffRes.data)
          setDepartments(deptRes.data)
        } catch {
          // 조직 미소속 슈퍼어드민 — 조직 관련 데이터 비움
          setOrgInfo(null)
          setMembers([])
          setUnaffiliated([])
          setDepartments([])
        }
      } else {
        // 일반 admin/owner
        const [membersRes, unaffRes, deptRes] = await Promise.all([
          axios.get(`${API_BASE}/api/v1/organizations/members`, { headers }),
          axios.get(`${API_BASE}/api/v1/organizations/unaffiliated-users`, { headers }),
          axios.get(`${API_BASE}/api/v1/organizations/departments`, { headers }),
        ])
        setOrgInfo(membersRes.data.organization)
        setMembers(membersRes.data.members)
        setUnaffiliated(unaffRes.data)
        setDepartments(deptRes.data)
      }
    } catch (err) {
      setError(err.response?.data?.detail || '데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [headers, isSuperadmin])

  useEffect(() => { fetchData() }, [fetchData])

  // 배정 모달에서 조직 변경 시 → 해당 조직의 부서 목록 로드
  const handleAssignOrgChange = async (orgId) => {
    setAssignForm({ ...assignForm, organization_id: orgId, department: '' })
    setAssignOrgDepts([])
    if (!orgId) return
    try {
      const res = await axios.get(`${API_BASE}/api/v1/organizations/admin/orgs/${orgId}/departments`, { headers })
      setAssignOrgDepts(res.data)
    } catch { /* 부서 없으면 빈 배열 유지 */ }
  }

  const handleAssign = async () => {
    if (!assignModal) return
    if (isSuperadmin && !assignForm.organization_id) {
      setError('배정할 조직을 선택해주세요.')
      return
    }
    try {
      await axios.post(`${API_BASE}/api/v1/organizations/members/assign`, {
        user_id: assignModal.id,
        organization_id: isSuperadmin ? assignForm.organization_id : undefined,
        role: assignForm.role,
        department: assignForm.department || null,
        position: assignForm.position || null,
      }, { headers })
      setAssignModal(null)
      setAssignForm({ organization_id: '', role: 'member', department: '', position: '' })
      setAssignOrgDepts([])
      fetchData()
    } catch (err) { setError(err.response?.data?.detail || '배정에 실패했습니다.') }
  }

  const handleAddDept = async () => {
    if (!newDeptName.trim()) return
    try {
      await axios.post(`${API_BASE}/api/v1/organizations/departments`, { name: newDeptName.trim() }, { headers })
      setNewDeptName('')
      fetchData()
    } catch (err) { setError(err.response?.data?.detail || '부서 추가 실패') }
  }

  const handleRenameDept = async (id) => {
    if (!deptEditName.trim()) return
    try {
      await axios.patch(`${API_BASE}/api/v1/organizations/departments/${id}`, { name: deptEditName.trim() }, { headers })
      setDeptEditId(null)
      setDeptEditName('')
      fetchData()
    } catch (err) { setError(err.response?.data?.detail || '부서 수정 실패') }
  }

  const handleDeleteDept = async (id) => {
    try {
      await axios.delete(`${API_BASE}/api/v1/organizations/departments/${id}`, { headers })
      fetchData()
    } catch (err) { setError(err.response?.data?.detail || '부서 삭제 실패') }
  }

  // 검색 필터
  const filteredMembers = members.filter((m) =>
    !search || m.name.includes(search) || m.email.includes(search)
  )
  const filteredAll = allUsers.filter((u) =>
    !search || u.name.includes(search) || u.email.includes(search) || u.phone.includes(search)
  )

  const roleLabel = { owner: '소유자', admin: '관리자', member: '멤버' }
  const statusLabel = { active: '활성', invited: '초대 대기', deactivated: '비활성' }
  const roleBadge = (role) => role === 'owner' ? 'bg-amber-100 text-amber-700' : role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
  const statusBadge = (s) => s === 'active' ? 'bg-green-100 text-green-700' : s === 'invited' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'

  const tabs = []
  if (isSuperadmin) tabs.push({ key: 'all', label: `전체 사용자 (${allUsers.length})` })
  tabs.push({ key: 'members', label: `조직 멤버 (${members.length})` })
  tabs.push({ key: 'unaffiliated', label: `미소속 (${unaffiliated.length})` })
  tabs.push({ key: 'departments', label: `부서 관리 (${departments.length})` })

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button onClick={() => navigate('/employee')} className="text-sm text-gray-500 hover:text-gray-700 mb-1">&larr; 대시보드로 돌아가기</button>
            <h1 className="text-2xl font-bold text-slate-900">
              {isSuperadmin ? '플랫폼 관리' : '멤버 관리'}
            </h1>
            {orgInfo && <p className="text-gray-500 mt-1">{orgInfo.name} &middot; {orgInfo.member_count}명</p>}
            {isSuperadmin && <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">슈퍼어드민</span>}
          </div>
          {orgInfo?.invite_code && (
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-center">
              <div className="text-xs text-gray-500 mb-1">초대 코드</div>
              <div
                onClick={() => {
                  navigator.clipboard.writeText(orgInfo.invite_code).then(() => {
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  })
                }}
                title="클릭하여 복사"
                className="font-mono text-lg font-bold tracking-widest text-slate-900 cursor-pointer hover:text-blue-600 transition"
              >
                {orgInfo.invite_code}
              </div>
              {copied && (
                <div className="text-xs text-green-600 font-medium mt-1 animate-pulse">
                  클립보드에 복사되었습니다
                </div>
              )}
              {orgInfo.invite_code_expires_at && (() => {
                const expires = new Date(orgInfo.invite_code_expires_at)
                const now = new Date()
                const isExpired = expires <= now
                const daysLeft = Math.ceil((expires - now) / (1000 * 60 * 60 * 24))
                return (
                  <div className="mt-1.5">
                    <div className={`text-xs ${isExpired ? 'text-red-500 font-semibold' : daysLeft <= 7 ? 'text-amber-600' : 'text-gray-400'}`}>
                      {isExpired ? '만료됨' : `${daysLeft}일 후 만료`}
                      <span className="text-gray-300 ml-1">({expires.toLocaleDateString('ko-KR')})</span>
                    </div>
                  </div>
                )
              })()}
              <button
                onClick={async () => {
                  if (!confirm('초대 코드를 재생성하시겠습니까?\n기존 코드는 즉시 무효화됩니다.')) return
                  try {
                    const res = await axios.post(`${API_BASE}/api/v1/organizations/invite-code/regenerate`, {}, { headers })
                    setOrgInfo({ ...orgInfo, invite_code: res.data.invite_code, invite_code_expires_at: res.data.invite_code_expires_at })
                  } catch (err) { setError(err.response?.data?.detail || '초대 코드 재생성에 실패했습니다.') }
                }}
                className="mt-2 text-xs text-blue-600 hover:text-blue-800 hover:underline transition"
              >
                코드 재생성
              </button>
            </div>
          )}
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

        {/* 검색 + 탭 */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {tabs.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${tab === t.key ? 'bg-white shadow text-slate-900' : 'text-gray-500 hover:text-gray-700'}`}
              >{t.label}</button>
            ))}
          </div>
          {tab !== 'departments' && (
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="이름, 이메일, 전화번호 검색..."
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm flex-1 max-w-xs"
            />
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">불러오는 중...</div>
        ) : tab === 'all' && isSuperadmin ? (
          /* ─── 슈퍼어드민: 전체 사용자 ─── */
          <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">이름</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">이메일</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">전화번호</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">소속</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">역할</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">부서</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAll.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => {
                    if (u.organization_name) {
                      // 소속 조직 있는 사용자 → 멤버 수정 모달
                      setDetailModal({ user_id: u.id, name: u.name, email: u.email, phone: u.phone, initials: u.name?.slice(0,2)?.toUpperCase() || '??', role: u.role || 'member', department: u.department || '', position: u.position || '', status: u.status || 'active', started_at: null, ended_at: null })
                      setEditForm({ role: u.role || 'member', department: u.department || '', position: u.position || '', status: u.status || 'active', started_at: '', ended_at: '' })
                    } else {
                      // 미소속 사용자 → 조직 배정 모달
                      setAssignModal({ id: u.id, name: u.name, email: u.email })
                      setAssignForm({ organization_id: '', role: 'member', department: '', position: '' })
                      setAssignOrgDepts([])
                    }
                  }}>
                    <td className="px-4 py-3 font-medium text-slate-900 hover:text-blue-600">{u.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{u.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{u.phone}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{u.organization_name || <span className="text-gray-300">미소속</span>}</td>
                    <td className="px-4 py-3">{u.role ? <span className={`text-xs px-2 py-1 rounded-full font-medium ${roleBadge(u.role)}`}>{roleLabel[u.role]}</span> : '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{u.department || '-'}</td>
                    <td className="px-4 py-3">{u.status ? <span className={`text-xs px-2 py-1 rounded-full ${statusBadge(u.status)}`}>{statusLabel[u.status]}</span> : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredAll.length === 0 && <div className="text-center py-8 text-gray-400">검색 결과가 없습니다.</div>}
          </div>
        ) : tab === 'members' ? (
          /* ─── 조직 멤버 ─── */
          <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">이름</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">이메일</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">역할</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">부서</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">직위</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMembers.map((m) => (
                  <tr key={m.user_id} className="hover:bg-gray-50 cursor-pointer" onClick={() => {
                    setDetailModal(m)
                    setEditForm({ role: m.role, department: m.department || '', position: m.position || '', status: m.status, started_at: m.started_at ? m.started_at.slice(0, 10) : '', ended_at: m.ended_at ? m.ended_at.slice(0, 10) : '' })
                  }}>
                    <td className="px-4 py-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">{m.initials}</div>
                      <span className="font-medium text-slate-900 hover:text-blue-600">{m.name}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{m.email}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${roleBadge(m.role)}`}>{roleLabel[m.role] || m.role}</span></td>
                    <td className="px-4 py-3 text-sm text-gray-500">{m.department || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{m.position || '-'}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full ${statusBadge(m.status)}`}>{statusLabel[m.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : tab === 'unaffiliated' ? (
          /* ─── 미소속 사용자 ─── */
          <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
            {unaffiliated.length === 0 ? (
              <div className="text-center py-12 text-gray-400">미소속 사용자가 없습니다.</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">이름</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">이메일</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">계정 유형</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">가입일</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {unaffiliated.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{u.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{u.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{u.account_type === 'personal' ? '개인' : '사업자'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{new Date(u.created_at).toLocaleDateString('ko-KR')}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => { setAssignModal(u); setAssignForm({ organization_id: '', role: 'member', department: '', position: '' }); setAssignOrgDepts([]) }} className="px-3 py-1.5 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 transition">조직 배정</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : tab === 'departments' ? (
          /* ─── 부서 관리 ─── */
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex gap-3 mb-6">
              <input
                type="text" value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)}
                placeholder="새 부서명 입력" onKeyDown={(e) => e.key === 'Enter' && handleAddDept()}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <button onClick={handleAddDept} className="px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 transition">추가</button>
            </div>
            {departments.length === 0 ? (
              <div className="text-center py-8 text-gray-400">등록된 부서가 없습니다.</div>
            ) : (
              <div className="space-y-2">
                {departments.map((d) => (
                  <div key={d.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                    {deptEditId === d.id ? (
                      <div className="flex gap-2 flex-1">
                        <input type="text" value={deptEditName} onChange={(e) => setDeptEditName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleRenameDept(d.id)}
                          className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm" autoFocus />
                        <button onClick={() => handleRenameDept(d.id)} className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">저장</button>
                        <button onClick={() => setDeptEditId(null)} className="px-3 py-1 border border-gray-300 text-gray-500 text-sm rounded hover:bg-gray-100">취소</button>
                      </div>
                    ) : (
                      <>
                        <span className="font-medium text-slate-900">{d.name}</span>
                        <div className="flex gap-2">
                          <button onClick={() => { setDeptEditId(d.id); setDeptEditName(d.name) }} className="text-sm text-blue-600 hover:text-blue-800">이름변경</button>
                          <button onClick={() => handleDeleteDept(d.id)} className="text-sm text-red-500 hover:text-red-700">삭제</button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* 배정 모달 */}
        {assignModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-bold text-slate-900 mb-4">{assignModal.name}님을 조직에 배정</h3>
              <div className="space-y-3">
                {/* 1단계: 소속 조직 선택 (슈퍼어드민만) */}
                {isSuperadmin ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">소속 조직</label>
                    <select value={assignForm.organization_id} onChange={(e) => handleAssignOrgChange(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-slate-900 bg-white">
                      <option value="">조직을 선택하세요</option>
                      {allOrgs.map((o) => <option key={o.id} value={o.id}>{o.name} ({o.member_count}명)</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">소속 조직</label>
                    <input type="text" value={orgInfo?.name || ''} disabled className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed" />
                  </div>
                )}

                {/* 2단계: 역할 선택 (조직 선택 후 활성화) */}
                <div className={(!isSuperadmin || assignForm.organization_id) ? '' : 'opacity-40 pointer-events-none'}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">역할</label>
                  <select value={assignForm.role} onChange={(e) => setAssignForm({ ...assignForm, role: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-slate-900 bg-white">
                    <option value="member">멤버</option>
                    <option value="admin">관리자</option>
                  </select>
                </div>

                {/* 3단계: 부서 선택 (조직 선택 후 해당 조직의 부서 로드) */}
                <div className={(!isSuperadmin || assignForm.organization_id) ? '' : 'opacity-40 pointer-events-none'}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">부서</label>
                  <select value={assignForm.department} onChange={(e) => setAssignForm({ ...assignForm, department: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-slate-900 bg-white">
                    <option value="">부서를 선택하세요</option>
                    {(isSuperadmin ? assignOrgDepts : departments).map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                  {isSuperadmin && assignForm.organization_id && assignOrgDepts.length === 0 && (
                    <p className="text-xs text-gray-400 mt-1">이 조직에 등록된 부서가 없습니다.</p>
                  )}
                </div>

                {/* 4단계: 직위 */}
                <div className={(!isSuperadmin || assignForm.organization_id) ? '' : 'opacity-40 pointer-events-none'}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">직위</label>
                  <input type="text" value={assignForm.position} onChange={(e) => setAssignForm({ ...assignForm, position: e.target.value })} placeholder="예: 과장" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => { setAssignModal(null); setAssignOrgDepts([]) }} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">취소</button>
                <button onClick={handleAssign} disabled={isSuperadmin && !assignForm.organization_id} className="flex-1 px-4 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed">배정하기</button>
              </div>
            </div>
          </div>
        )}

        {/* 멤버 상세/수정 모달 */}
        {detailModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDetailModal(null)}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center text-lg font-bold text-slate-600">{detailModal.initials}</div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{detailModal.name}</h3>
                  <p className="text-sm text-gray-500">{detailModal.email}</p>
                  {detailModal.phone && <p className="text-sm text-gray-400">{detailModal.phone}</p>}
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">역할</label>
                  <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} disabled={detailModal.role === 'owner'} className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50 disabled:text-gray-400 text-slate-900 bg-white">
                    <option value="owner">소유자</option><option value="admin">관리자</option><option value="member">멤버</option>
                  </select>
                  {detailModal.role === 'owner' && <p className="text-xs text-gray-400 mt-1">소유자 역할은 변경할 수 없습니다.</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">소속</label>
                  <input type="text" value={orgInfo?.name || ''} disabled className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">부서</label>
                  <select value={editForm.department} onChange={(e) => setEditForm({ ...editForm, department: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-slate-900 bg-white">
                    <option value="">부서를 선택하세요</option>
                    {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">직위</label>
                  <input type="text" value={editForm.position} onChange={(e) => setEditForm({ ...editForm, position: e.target.value })} placeholder="예: 과장" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">입사일</label>
                    <input type="date" value={editForm.started_at} onChange={(e) => setEditForm({ ...editForm, started_at: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">퇴사일</label>
                    <input type="date" value={editForm.ended_at} onChange={(e) => {
                      const val = e.target.value
                      const newForm = { ...editForm, ended_at: val }
                      if (val && new Date(val) <= new Date()) newForm.status = 'deactivated'
                      setEditForm(newForm)
                    }} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                </div>
                {editForm.ended_at && new Date(editForm.ended_at) <= new Date() && (
                  <p className="text-xs text-red-500 -mt-2">퇴사일이 경과하여 상태가 자동으로 비활성 처리됩니다.</p>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
                  <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} disabled={detailModal.role === 'owner'} className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50 disabled:text-gray-400 text-slate-900 bg-white">
                    <option value="active">활성</option><option value="deactivated">비활성 (접근 차단)</option>
                  </select>
                </div>
              </div>
              {error && <div className="mt-3 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}
              <div className="flex gap-3 mt-6">
                <button onClick={() => setDetailModal(null)} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">취소</button>
                <button onClick={async () => {
                  try {
                    setError('')
                    const body = { role: detailModal.role === 'owner' ? undefined : editForm.role, department: editForm.department || null, position: editForm.position || null, status: detailModal.role === 'owner' ? undefined : editForm.status }
                    if (editForm.started_at) body.started_at = new Date(editForm.started_at).toISOString()
                    if (editForm.ended_at) body.ended_at = new Date(editForm.ended_at).toISOString()
                    await axios.patch(`${API_BASE}/api/v1/organizations/members/${detailModal.user_id}`, body, { headers })
                    setDetailModal(null)
                    fetchData()
                  } catch (err) { setError(err.response?.data?.detail || '수정에 실패했습니다.') }
                }} className="flex-1 px-4 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition">저장</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
