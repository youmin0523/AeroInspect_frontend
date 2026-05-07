/**
 * Landing.jsx
 * 역할: 서비스 메인 랜딩 페이지
 *       - 상단 헤더 / Hero / 기능 소개 / B2B·B2C CTA 섹션을 수직 조립
 *       - WebSocket 등 대시보드 전용 리소스는 연결하지 않음 (초기 로딩 가벼움)
 *       - 진입 시 백엔드 root 핑 1회 → Fly.io 콜드 스타트 미리 깨워 로그인 체감속도 개선
 */

import { useEffect } from 'react'
import LandingHeader from '../components/landing/LandingHeader.jsx'
import HeroSection from '../components/landing/HeroSection.jsx'
import ServiceIntroSection from '../components/landing/ServiceIntroSection.jsx'
import FeaturesSection from '../components/landing/FeaturesSection.jsx'
import CasesSection from '../components/landing/CasesSection.jsx'
import DualCTASection from '../components/landing/DualCTASection.jsx'
import Footer from '../components/landing/Footer.jsx'

export default function Landing() {
  // Fly.io auto_stop_machines 콜드 스타트 완화 워밍 핑.
  // 랜딩에서 로그인까지 가는 동안 머신이 부팅되어 첫 로그인 응답이 빨라짐.
  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || ''
    fetch(`${apiBase}/`, { method: 'GET' }).catch(() => {})
  }, [])

  return (
    <div className="font-sans antialiased text-gray-800 bg-gray-50 min-h-screen">
      <LandingHeader />
      <main>
        <HeroSection />
        <ServiceIntroSection />
        <FeaturesSection />
        <CasesSection />
        {/* DualCTA + Footer — 자연 크기. DualCTA flex-1 강제 확장 제거하여 panel 이 컨텐츠 + 패딩 만큼만 차지 */}
        <DualCTASection />
        <Footer />
      </main>
    </div>
  )
}
