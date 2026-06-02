/**
 * components/manual/ManualModal.jsx
 * 역할: Sidebar 운영 매뉴얼 아이콘 클릭 시 노출되는 인앱 매뉴얼 패널
 *       - 좌측: 섹션 목차 / 우측: 본문
 *       - 외부 문서 PDF/Notion 링크는 본문 하단에 별도 표기
 *       - 본 라운드(R-v1.1.18) 최소 매뉴얼. 추후 PDF 뷰어/검색 기능 추가.
 */

import { useState } from 'react'
import { X, BookOpen, ExternalLink } from 'lucide-react'

const SECTIONS = [
  {
    key: 'start',
    title: '1. 빠른 시작',
    body: [
      '① 로그인 후 좌측 사이드바에서 사용 기능을 선택합니다.',
      '② "현장 관리" 에서 점검할 사이트를 등록/선택합니다.',
      '③ "사전 점검" 에서 도면·체크리스트 검토 → "대시보드" 진입.',
      '④ 드론 연결 후 START 버튼으로 라이브 점검을 시작합니다.',
    ],
  },
  {
    key: 'inspection',
    title: '2. 현장 점검 운용',
    body: [
      '· 상단 HUD: 비행 상태, WS 연결, 알림, 프로필 표시',
      '· 우측 패널: 실시간 하자 카드 (등급별 색상)',
      '· CONFIRMED(빨강): 보고서 자동 등재 대상',
      '· REVIEW(노랑): 점검자 추가 확인 필요',
      '· REFERENCE(점선 회색): 참고용 — "점검자 모드 ON" 시에만 노출',
    ],
  },
  {
    key: 'report',
    title: '3. 보고서 작성',
    body: [
      '· 대시보드 우측 상단 "보고서 작성" 클릭 → ReportModal',
      '· CONFIRMED + 수동 추가 항목만 보고서에 등재됩니다.',
      '· 수정 후 PDF 출력 / R2 업로드 (배포 후 활성).',
    ],
  },
  {
    key: 'admin',
    title: '4. 조직 관리 (Admin)',
    body: [
      '· "조직원 관리" — owner/admin/superadmin 만 진입 가능',
      '· "GPU 모니터" — drone-gpu-controller 인스턴스 상태/시작/중지',
      '· role 변경, 멤버 초대, 권한 조정',
    ],
  },
  {
    key: 'safety',
    title: '5. 안전 운용 수칙',
    body: [
      '· 드론 비행 전 비행 금지 구역(NFZ) 확인 필수',
      '· 야간/우천/강풍(>10m/s) 비행 금지',
      '· 입주자 거주 공간 진입 시 사전 동의 필수',
      '· 검출된 하자는 출장 검증 전 사용자 공유 금지 (오탐 보호)',
    ],
  },
  {
    key: 'support',
    title: '6. 문의/장애 신고',
    body: [
      '· 이메일: codelabprovide@gmail.com',
      '· 운영 시간: 평일 09:00–19:00 (KST)',
      '· 장애 발생 시 Sentry 자동 보고, 추가 정보는 Floating Chatbot 로 전달',
    ],
  },
]

const EXTERNAL_LINKS = [
  { label: 'GitHub Repo', href: 'https://github.com' },
  { label: 'Notion 운영 문서', href: 'https://www.notion.so' },
]

export default function ManualModal({ isOpen, onClose }) {
  const [active, setActive] = useState('start')

  if (!isOpen) return null

  const section = SECTIONS.find((s) => s.key === active) || SECTIONS[0]

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-dashboard-surface border border-dashboard-border rounded-xl shadow-2xl w-[820px] max-w-[94vw] h-[600px] max-h-[88vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-dashboard-border">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-accent-400" />
            <h2 className="text-base font-semibold text-white">운영 매뉴얼</h2>
            <span className="text-xs text-slate-500">v1.1</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition"
            title="닫기"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* 좌측 목차 */}
          <nav className="w-48 border-r border-dashboard-border p-3 space-y-0.5 overflow-y-auto">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                onClick={() => setActive(s.key)}
                className={`w-full text-left text-xs px-2 py-1.5 rounded transition ${
                  active === s.key
                    ? 'bg-accent-500/15 text-accent-300 font-semibold'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {s.title}
              </button>
            ))}
          </nav>

          {/* 우측 본문 */}
          <div className="flex-1 p-5 overflow-y-auto">
            <h3 className="text-sm font-semibold text-white mb-3">{section.title}</h3>
            <ul className="space-y-1.5 text-sm text-slate-300 leading-relaxed">
              {section.body.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>

            <div className="mt-6 pt-4 border-t border-dashboard-border space-y-1.5">
              <p className="text-xs text-slate-500">외부 문서</p>
              {EXTERNAL_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs text-accent-400 hover:text-accent-300 transition"
                >
                  <ExternalLink size={11} />
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
