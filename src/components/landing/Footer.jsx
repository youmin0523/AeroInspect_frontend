/**
 * Footer.jsx
 * 역할: 랜딩 페이지 푸터
 *       - DualCTA 섹션 바로 아래 위치, 둘이 합쳐 정확히 100vh 자연 충족
 *       - 컴팩트 단일 row 레이아웃: 로고+소개 / 사이트맵 / 연락처 가로 배치
 *       - 다크 톤(slate-950) — 배너 톤보다 한 단계 더 어둡게 페이지 종결감 부여
 */

import { useState } from 'react'

import { handleAnchorClick } from '../../utils/smoothScroll.js'
import logoWhite from '../../assets/logo/logo_white.png'
import LegalModal from './LegalModal.jsx'

// 로그인/회원가입 은 헤더에 이미 노출 — Footer 는 메인 섹션 3개만
const FOOTER_NAV = [
  { label: '서비스 소개', href: '#intro' },
  { label: '핵심 기술', href: '#features' },
  { label: '도입 사례', href: '#cases' },
]

// 법적 정보 링크 — type 은 LEGAL_CONTENTS 의 키와 매칭
const LEGAL_LINKS = [
  { type: 'terms', label: '서비스 이용약관' },
  { type: 'privacy', label: '개인정보처리방침' },
  { type: 'noEmail', label: '이메일 무단수집 거부' },
]

export default function Footer() {
  // 어떤 법적 정보 모달을 보여줄지 (null = 닫힘)
  const [legalType, setLegalType] = useState(null)

  return (
    <footer className="bg-slate-950 text-gray-400">
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-6 md:py-7">
        {/* 단일 row: 로고+소개 / 네비 / 연락처 가로 분할 */}
        {/* //* [Modified Code] 태블릿(md~lg)은 주소가 길어 가로 1줄에 안 맞음 → lg부터 가로 정렬, md는 모바일과 동일한 stack 유지 */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6">
          {/* 좌측: 로고 + 한 줄 소개 */}
          <div className="flex items-center gap-3">
            <img src={logoWhite} alt="DRONE INSPECT" className="h-10 w-auto object-contain" />
            <span className="text-sm leading-tight break-keep hidden xl:inline">
              자율비행 드론과 AI 비전이 만드는 정밀 하자점검 플랫폼
            </span>
          </div>

          {/* 중앙: 사이트맵 */}
          <nav aria-label="푸터 네비게이션" className="flex gap-5 text-sm">
            {FOOTER_NAV.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleAnchorClick(e, link.href, 96, 1100)}
                className="hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* 우측: 연락처 — 이메일 / 전화 / 주소 세로 정렬, 구분 위해 줄바꿈으로 분리 */}
          <address className="not-italic flex flex-col lg:items-end text-xs gap-0.5 leading-snug">
            <span>
              <span className="text-gray-500 mr-1.5">EMAIL</span>
              droneinspect.noreply@gmail.com
            </span>
            <span>
              <span className="text-gray-500 mr-1.5">TEL</span>
              02-2038-0800
            </span>
            <span className="lg:text-right break-keep">
              <span className="text-gray-500 mr-1.5">ADDR</span>
              서울 금천구 가산디지털2로 144 현대테라타워 가산DK A동 20층 (코드랩아카데미)
            </span>
          </address>
        </div>

        {/* 하단 Copyright + 법적 정보 라인 */}
        {/* //* [Modified Code] Footer 메인 레이아웃 lg 기준에 맞춰 하단도 lg부터 가로 정렬 */}
        <div className="border-t border-slate-800 mt-5 pt-3 flex flex-col lg:flex-row justify-between items-center gap-2 text-xs">
          <span>© {new Date().getFullYear()} DRONE INSPECT. All rights reserved.</span>
          {/* 법적 정보 — 가운데 점(·) 으로 구분, '개인정보처리방침' 만 흰색 강조(법령 권고) */}
          <nav aria-label="법적 정보" className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {LEGAL_LINKS.map((link, idx) => (
              <span key={link.type} className="flex items-center">
                <button
                  type="button"
                  onClick={() => setLegalType(link.type)}
                  className="hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
                >
                  {link.label}
                </button>
                {idx < LEGAL_LINKS.length - 1 && (
                  <span aria-hidden="true" className="ml-4 text-gray-700">|</span>
                )}
              </span>
            ))}
          </nav>
        </div>
      </div>

      {/* 법적 정보 모달 — 단일 모달로 type 에 따라 컨텐츠 분기 */}
      <LegalModal type={legalType} onClose={() => setLegalType(null)} />
    </footer>
  )
}
