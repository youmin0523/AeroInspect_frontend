/**
 * Landing.jsx
 * 역할: 서비스 메인 랜딩 페이지
 *       - 상단 헤더 / Hero / 기능 소개 / B2B·B2C CTA 섹션을 수직 조립
 *       - WebSocket 등 대시보드 전용 리소스는 연결하지 않음 (초기 로딩 가벼움)
 */

import LandingHeader from '../components/landing/LandingHeader.jsx'
import HeroSection from '../components/landing/HeroSection.jsx'
import ServiceIntroSection from '../components/landing/ServiceIntroSection.jsx'
import FeaturesSection from '../components/landing/FeaturesSection.jsx'
import CasesSection from '../components/landing/CasesSection.jsx'
import DualCTASection from '../components/landing/DualCTASection.jsx'

export default function Landing() {
  return (
    <div className="font-sans antialiased text-gray-800 bg-gray-50 min-h-screen">
      <LandingHeader />
      <main>
        <HeroSection />
        <ServiceIntroSection />
        <FeaturesSection />
        <CasesSection />
        <DualCTASection />
        {/* TODO: Footer 섹션 (회사 정보 / 링크 / Copyright) 추후 추가 */}
      </main>
    </div>
  )
}
