/**
 * HeroSection.jsx
 * 역할: 랜딩 페이지 Hero (메인 비주얼)
 *       - 배경에 3개 이미지 슬롯을 랜덤 배치
 *       - 5초마다 새 이미지 3장 랜덤 선택하여 교체
 *       - 이미지는 frontend/src/assets/hero/ 하위에서 Vite가 자동 스캔
 *         → 파일명/확장자 관계 없이 드롭만 해두면 자동 인식
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ContactModal from './ContactModal.jsx'

// //! [Original Code] 하드코딩된 파일명 배열 + public/images 경로 사용
// const HERO_IMAGES = [
//   '스크린샷 2026-04-15 114459.png',
//   ...
// ]
// backgroundImage: `url("/images/${encodeURIComponent(imgName)}")`

// //* [Modified Code] Vite의 import.meta.glob 으로 폴더 내 이미지 자동 스캔
// - eager: true  → 번들 시점에 즉시 import (런타임 동적 import 비용 없음)
// - import: 'default' → 모듈의 default export(= 이미지 URL 문자열)만 추출
// - 파일명 한글/공백/대소문자 상관없이 모두 허용
const imageModules = import.meta.glob(
  '../../assets/hero/*.{png,jpg,jpeg,webp,gif,PNG,JPG,JPEG,WEBP,GIF}',
  { eager: true, import: 'default' },
)

// { 'path.png': 'url', ... } → ['url', 'url', ...]
const HERO_IMAGES = Object.values(imageModules)

// 로테이션 주기 (ms)
const ROTATION_MS = 5000

// 크로스페이드 전환 시간 (ms) — Tailwind duration 클래스와 반드시 동일해야 함
const FADE_MS = 1500

// 슬롯 개수: 데스크탑 3칸
const SLOT_COUNT = 3

// 후보 배열에서 중복 없이 n개 랜덤 선택
// 이미지가 n개 미만이면 있는 만큼만 반환 (에러 대신 안전 동작)
function pickDistinct(pool, count) {
  const copy = [...pool]
  const picks = []
  const take = Math.min(count, copy.length)
  for (let i = 0; i < take; i++) {
    const idx = Math.floor(Math.random() * copy.length)
    picks.push(copy.splice(idx, 1)[0])
  }
  return picks
}

// 이미지 3개를 한 레이어로 렌더 (모바일 2열, 데스크탑 3열)
// opacityClass로 레이어 전체의 투명도 제어 → 크로스페이드 구현
function ImageLayer({ picks, opacityClass }) {
  return (
    <div
      className={`absolute inset-0 grid grid-cols-2 md:grid-cols-3 transition-opacity ease-in-out ${opacityClass}`}
      style={{ transitionDuration: `${FADE_MS}ms` }}
      aria-hidden="true"
    >
      {picks.map((imgUrl, i) => (
        <div
          key={`${i}-${imgUrl}`}
          // 2번째 슬롯은 모바일에서 숨김
          className={`bg-cover bg-center ${i === 1 ? 'hidden md:block' : ''}`}
          style={{ backgroundImage: `url("${imgUrl}")` }}
        />
      ))}
    </div>
  )
}

export default function HeroSection() {
  const navigate = useNavigate()
  const [isContactOpen, setIsContactOpen] = useState(false)

  // 2개의 레이어를 번갈아 보여주는 "더블 버퍼링" 패턴
  // - layerA / layerB 각각이 슬롯 3개를 품음
  // - activeLayer 가 가리키는 쪽이 opacity:1, 반대쪽은 0 → transition 으로 dissolve
  const [layerA, setLayerA] = useState(() => pickDistinct(HERO_IMAGES, SLOT_COUNT))
  const [layerB, setLayerB] = useState(() => pickDistinct(HERO_IMAGES, SLOT_COUNT))
  const [activeLayer, setActiveLayer] = useState('A')

  // 현재 활성 레이어를 ref로 추적 (setInterval 콜백에서 최신값 참조 필요)
  const activeRef = useRef(activeLayer)
  activeRef.current = activeLayer

  useEffect(() => {
    // 이미지가 1개 이하면 전환 의미가 없으므로 생략
    if (HERO_IMAGES.length <= 1) return

    const intervalId = setInterval(() => {
      // 비활성 레이어에 새 이미지 미리 세팅 → 그 후 active 전환
      const nextPicks = pickDistinct(HERO_IMAGES, SLOT_COUNT)
      if (activeRef.current === 'A') {
        setLayerB(nextPicks)
        setActiveLayer('B')
      } else {
        setLayerA(nextPicks)
        setActiveLayer('A')
      }
    }, ROTATION_MS)

    return () => clearInterval(intervalId)
  }, [])

  return (
    <section className="relative bg-slate-900 text-white min-h-screen flex items-center justify-center text-center px-4 sm:px-6 overflow-hidden">
      {/* 배경: 2개 레이어를 겹쳐두고 opacity로 크로스페이드 */}
      <ImageLayer picks={layerA} opacityClass={activeLayer === 'A' ? 'opacity-100' : 'opacity-0'} />
      <ImageLayer picks={layerB} opacityClass={activeLayer === 'B' ? 'opacity-100' : 'opacity-0'} />

      {/* 어두운 그라데이션 오버레이 */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/85 via-slate-900/75 to-slate-900/95" />

      {/* 점무늬 데코 */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#fbbf24 1px, transparent 1px)',
          backgroundSize: '30px 30px',
        }}
      />

      {/* 텍스트 & CTA */}
      <div className="relative z-10 max-w-3xl md:max-w-4xl lg:max-w-5xl">
        {/* //* [Modified Code] 소형 폰(<375)에서도 안정 — 기본 text-3xl로 시작, sm부터 4xl 단계 상승 */}
        <h1 className="text-3xl sm:text-4xl md:text-[2.75rem] lg:text-6xl font-extrabold leading-[1.3] sm:leading-[1.35] md:leading-[1.4] mb-5 sm:mb-6 break-keep">
          <span className="lg:whitespace-nowrap">도면이 없어도 완벽한 3D 모델링,</span>
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-yellow-400">
            <span className="lg:whitespace-nowrap">드론이 건축물의</span>
            <br />
            <span className="lg:whitespace-nowrap">디지털 트윈을 완성합니다.</span>
          </span>
        </h1>
        <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-300 mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed break-keep">
          CAD 데이터부터 실시간 자율비행 스캔까지.
          <br />
          어떤 환경에서도 빈틈없는 3D 기반 정밀 하자점검 플랫폼.
        </p>
        {/* //* [Modified Code] 모바일에서는 버튼 폭 100% (가로 꽉 차) + 사이즈 축소 → 작은 폰 가독성 향상 */}
        <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-2 sm:px-0">
          <button
            type="button"
            onClick={() => navigate('/sample-report')}
            className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-400 text-slate-900 px-6 sm:px-8 py-3 sm:py-3.5 rounded-md font-bold text-base sm:text-lg transition shadow-lg focus:outline-none focus:ring-2 focus:ring-yellow-300"
          >
            3D 리포트 샘플 보기
          </button>
          <button
            type="button"
            onClick={() => setIsContactOpen(true)}
            className="w-full sm:w-auto bg-transparent border-2 border-gray-400 hover:border-white px-6 sm:px-8 py-3 sm:py-3.5 rounded-md font-bold text-base sm:text-lg transition focus:outline-none focus:ring-2 focus:ring-white"
          >
            서비스 도입 문의
          </button>
        </div>
      </div>

      {/* 도입 문의 모달 */}
      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </section>
  )
}
