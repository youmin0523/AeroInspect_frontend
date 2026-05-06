/**
 * LandingHeader.jsx
 * 역할: 랜딩 페이지 상단 네비게이션 바
 *       - 히어로 위에 투명 오버레이로 시작 → 스크롤 시 흰색 배경으로 전환 (C 전략)
 *       - 로고 / 메뉴 링크 / "도입 문의하기" CTA 버튼
 *       - 모바일에서는 햄버거 메뉴로 전환
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { handleAnchorClick, smoothScrollTo } from '../../utils/smoothScroll.js';
import ContactModal from './ContactModal.jsx';
import useAuthStore from '../../store/authStore.js';

// 네이비 원본(스크롤 후 흰 헤더용) + 흰색(최상단 어두운 히어로용)
import logoDark from '../../assets/logo/logo_transparent-removebg-preview.png';
import logoWhite from '../../assets/logo/logo_white.png';

// 네비 메뉴 항목
const NAV_LINKS = [
  { label: '서비스 소개', href: '#intro' },
  { label: '핵심 기술', href: '#features' },
  { label: '도입 사례', href: '#cases' },
];

// 스크롤 전환 기준 (px): 이 값을 넘으면 배경이 흰색으로 바뀜
const SCROLL_THRESHOLD = 50;

export default function LandingHeader() {
  // 최상단 여부: true면 투명 오버레이, false면 흰색 배경
  const [isAtTop, setIsAtTop] = useState(true);
  // 도입 문의 모달 open 여부
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef(null);
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  // 로고 클릭: 이미 "/" 경로면 Link가 리렌더를 발생시키지 않아 스크롤이 안 먹음.
  // 현재 경로가 "/"일 때만 기본 동작을 가로채 최상단까지 스무스 스크롤.
  const handleLogoClick = (event) => {
    if (location.pathname === '/') {
      event.preventDefault();
      smoothScrollTo(0, 1000);
      if (window.history?.replaceState) {
        window.history.replaceState(null, '', '/');
      }
    }
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    // 초기 렌더 시 현재 스크롤 위치 반영 (새로고침 후 중간이면 바로 흰 배경)
    const syncScrollState = () => {
      setIsAtTop(window.scrollY < SCROLL_THRESHOLD);
    };
    syncScrollState();

    // passive: true → 스크롤 성능 향상 (기본 동작 막지 않음 명시)
    window.addEventListener('scroll', syncScrollState, { passive: true });
    return () => window.removeEventListener('scroll', syncScrollState);
  }, []);

  // 모바일 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target)) {
        setIsMobileMenuOpen(false);
      }
    };
    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

  // //* [Modified Code] C 전략: 상단에서 투명, 스크롤 시 흰 배경 + 그림자
  const headerBgClass = isAtTop ? 'bg-transparent' : 'bg-white shadow-md';

  // 네비 링크 텍스트 색: 최상단(어두운 히어로 위)에서는 흰색, 스크롤 후엔 회색
  const navTextClass = isAtTop
    ? 'text-white/90 hover:text-white'
    : 'text-gray-600 hover:text-blue-600';

  const handleContactOpen = () => {
    setIsMobileMenuOpen(false);
    setIsContactOpen(true);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 grid grid-cols-[auto_1fr_auto] items-center px-4 sm:px-6 md:px-8 py-2 transition-colors duration-300 ${headerBgClass}`}
    >
      {/* 로고 */}
      <Link
        to="/"
        onClick={handleLogoClick}
        aria-label="DRONE INSPECT 홈"
        className="flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
      >
        {/* //* [Modified Code] 상태에 따라 흰/네이비 로고 스왑 + 소형 폰에선 약간 축소 */}
        <img
          src={isAtTop ? logoWhite : logoDark}
          alt="DRONE INSPECT"
          className="h-14 sm:h-16 md:h-[4.5rem] lg:h-[5rem] w-auto object-contain transition-opacity duration-300"
        />
      </Link>

      {/* 주 메뉴 (데스크탑) — 로그인 시 "직원 전용"이 네비 링크에 합류하여 중앙 정렬 */}
      {/* //* [Modified Code] 태블릿(md~lg)은 햄버거 사용 → 데스크탑 네비는 lg부터 노출 */}
      <nav
        aria-label="주 메뉴"
        className="hidden lg:flex justify-center space-x-10 font-semibold text-lg xl:text-xl"
      >
        {NAV_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            onClick={(e) => handleAnchorClick(e, link.href, 96, 1400)}
            className={`${navTextClass} transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded`}
          >
            {link.label}
          </a>
        ))}

        {/* 직원 전용 — 로그인 상태에서만 네비 링크로 표시 */}
        {isAuthenticated && (
          <Link
            to="/employee"
            className={`inline-flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 rounded ${
              isAtTop
                ? 'text-yellow-300 hover:text-yellow-100'
                : 'text-yellow-600 hover:text-yellow-500'
            }`}
          >
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${isAtTop ? 'bg-yellow-300' : 'bg-yellow-500'}`} />
            직원 전용
          </Link>
        )}
      </nav>

      {/* 우측 버튼 그룹 */}
      <div className="flex items-center gap-3 justify-end">
        {/* 로그인 / 로그아웃 (데스크탑) */}
        {isAuthenticated ? (
          <button
            type="button"
            onClick={() => useAuthStore.getState().logout()}
            className={`hidden lg:inline-block px-4 py-2 rounded-md font-semibold text-base transition focus:outline-none focus:ring-2 focus:ring-blue-400 ${
              isAtTop
                ? 'text-white/90 hover:text-white hover:bg-white/10'
                : 'text-gray-600 hover:text-red-600 hover:bg-gray-100'
            }`}
          >
            로그아웃
          </button>
        ) : (
          <Link
            to="/login"
            className={`hidden lg:inline-block px-4 py-2 rounded-md font-semibold text-base transition focus:outline-none focus:ring-2 focus:ring-blue-400 ${
              isAtTop
                ? 'text-white/90 hover:text-white hover:bg-white/10'
                : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100'
            }`}
          >
            로그인
          </Link>
        )}

        {/* CTA: 최상단에서는 살짝 투명 처리, 스크롤 후엔 솔리드 */}
        {/* 도입 문의하기 CTA (데스크탑) */}
        <button
          type="button"
          onClick={handleContactOpen}
          className={`hidden lg:block px-5 py-2.5 rounded-md font-semibold text-base xl:text-lg transition shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 ${
            isAtTop
              ? 'bg-blue-600/90 hover:bg-blue-600 text-white backdrop-blur-sm'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          도입 문의하기
        </button>

        {/* 햄버거 버튼 (모바일/태블릿) */}
        <div className="relative lg:hidden" ref={mobileMenuRef}>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label={isMobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
            aria-expanded={isMobileMenuOpen}
            className={`flex items-center justify-center w-10 h-10 rounded-md transition focus:outline-none ${
              isAtTop
                ? 'text-white hover:bg-white/10'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <i
              className={`text-2xl ${isMobileMenuOpen ? 'ri-close-line' : 'ri-menu-line'}`}
            />
          </button>

          {/* 모바일 드롭다운 메뉴 */}
          {isMobileMenuOpen && (
            <div
              className={`absolute right-0 top-12 w-56 rounded-xl shadow-2xl overflow-hidden transition-all duration-200 ${
                isAtTop
                  ? 'bg-slate-900/95 backdrop-blur-md border border-white/10'
                  : 'bg-white border border-gray-100'
              }`}
            >
              {/* 직원 전용 — 로그인 상태에서만 */}
              {isAuthenticated && (
                <Link
                  to="/employee"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-5 py-3.5 font-semibold text-sm transition ${
                    isAtTop
                      ? 'text-yellow-300 hover:bg-white/10'
                      : 'text-yellow-700 hover:bg-yellow-50'
                  }`}
                >
                  <i className="ri-shield-user-line text-lg" />
                  <span>직원 전용</span>
                </Link>
              )}

              {/* 구분선 */}
              <div className={`mx-4 h-px ${isAtTop ? 'bg-white/10' : 'bg-gray-100'}`} />

              {/* 로그인 / 로그아웃 */}
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false)
                    useAuthStore.getState().logout()
                  }}
                  className={`flex items-center gap-3 w-full px-5 py-3.5 font-semibold text-sm transition ${
                    isAtTop
                      ? 'text-red-300 hover:bg-white/10'
                      : 'text-red-600 hover:bg-red-50'
                  }`}
                >
                  <i className="ri-logout-box-line text-lg" />
                  <span>로그아웃</span>
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-5 py-3.5 font-semibold text-sm transition ${
                    isAtTop
                      ? 'text-white/90 hover:bg-white/10'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <i className="ri-login-box-line text-lg" />
                  <span>로그인</span>
                </Link>
              )}

              {/* 구분선 */}
              <div className={`mx-4 h-px ${isAtTop ? 'bg-white/10' : 'bg-gray-100'}`} />

              {/* 도입 문의하기 */}
              <button
                type="button"
                onClick={handleContactOpen}
                className={`flex items-center gap-3 w-full px-5 py-3.5 font-semibold text-sm transition ${
                  isAtTop
                    ? 'text-blue-300 hover:bg-white/10'
                    : 'text-blue-600 hover:bg-blue-50'
                }`}
              >
                <i className="ri-mail-send-line text-lg" />
                <span>도입 문의하기</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
      />
    </header>
  );
}
