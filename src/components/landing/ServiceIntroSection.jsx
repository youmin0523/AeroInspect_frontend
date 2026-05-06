/**
 * ServiceIntroSection.jsx
 * 역할: 랜딩 페이지 "서비스 소개" 섹션
 *       - 다크 배너(헤드라인 + 서브카피) + 3개 가치 카드(안전성/정밀성/효율성)
 *       - LandingHeader의 `#intro` 앵커 타겟
 */

import Reveal from '../common/Reveal.jsx'

const VALUE_CARDS = [
  {
    tag: '접근성',
    kicker: 'BLIND SPOT ZERO',
    title: '실내 난접근 구역 사각지대 0%',
    desc: '높은 천장, 좁은 틈새, 어두운 배관/공조실 등 사람이 직접 확인하기 까다로운 실내 사각지대를 드론이 안전하게 진입하여 빈틈없이 스캔합니다.',
    accent: 'blue',
  },
  {
    tag: '정밀성',
    kicker: 'ACCURACY',
    title: '육안의 한계를 넘는 정밀 스캔',
    desc: 'AI 비전 기술이 0.1mm 단위의 미세 균열까지 식별합니다. 주관적인 육안 판단이 아닌, 데이터에 기반한 객관적인 하자 근거를 제시합니다.',
    accent: 'yellow',
  },
  {
    tag: '효율성',
    kicker: 'EFFICIENCY',
    title: '점검 시간 60% 단축',
    desc: '수동 점검 방식 대비 획기적인 속도를 자랑합니다. 대단지 아파트 전체 세대 점검도 단 며칠 만에 데이터 구축부터 리포트 발행까지 완료됩니다.',
    accent: 'green',
  },
]

// Tailwind JIT가 런타임 동적 클래스를 tree-shake 하지 못하므로 full class name으로 매핑
const ACCENT_STYLES = {
  blue: {
    topBorder: 'border-t-4 border-blue-600',
    panelBg: 'bg-blue-50 group-hover:bg-blue-100',
    kickerGradient: 'bg-gradient-to-r from-blue-700 via-blue-500 to-sky-400',
    kickerStroke: '[-webkit-text-stroke:1px_rgb(29_78_216)] [paint-order:stroke_fill]',
    tagBg: 'bg-blue-600',
    tagText: 'text-white',
  },
  yellow: {
    topBorder: 'border-t-4 border-yellow-500',
    panelBg: 'bg-yellow-50 group-hover:bg-yellow-100',
    kickerGradient: 'bg-gradient-to-r from-amber-600 via-yellow-500 to-orange-400',
    kickerStroke: '[-webkit-text-stroke:1px_rgb(180_83_9)] [paint-order:stroke_fill]',
    tagBg: 'bg-yellow-400',
    tagText: 'text-slate-800',
  },
  green: {
    topBorder: 'border-t-4 border-green-600',
    panelBg: 'bg-green-50 group-hover:bg-green-100',
    kickerGradient: 'bg-gradient-to-r from-green-700 via-emerald-500 to-teal-400',
    kickerStroke: '[-webkit-text-stroke:1px_rgb(21_128_61)] [paint-order:stroke_fill]',
    tagBg: 'bg-green-600',
    tagText: 'text-white',
  },
}

export default function ServiceIntroSection() {
  return (
    <section id="intro" className="min-h-[calc(100vh-5rem)] md:min-h-[calc(100vh-6rem)] flex flex-col scroll-mt-20 md:scroll-mt-24">
      {/* 다크 배너 — 섹션 헤드라인 */}
      {/* //* [Modified Code] 모바일에서 padding 과도 → 기본 py-14 px-6, 단계 상승 */}
      <div className="bg-slate-900 text-white py-14 sm:py-20 md:py-24 lg:py-28 px-6 sm:px-8 text-center">
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 md:mb-5 break-keep">DRONE INSPECT가 만드는 변화</h2>
        <p className="text-gray-400 text-base sm:text-lg md:text-xl lg:text-2xl break-keep">
          기존 점검 방식의 위험과 한계를 첨단 공간 데이터 기술로 해결합니다.
        </p>
      </div>

      {/* 3개 가치 카드 — flex-1 + items-center 로 잔여 viewport 영역 위/아래 대칭 분배 */}
      <div className="flex-1 flex items-center py-12 md:py-14 lg:py-16">
        {/* //* [Modified Code] 태블릿(md~lg) 2열 시 마지막 카드는 2칸 차지 + 내부에서 데스크탑과 동일한 카드 폭으로 가운데 정렬 */}
        <div className="max-w-7xl w-full mx-auto px-6 md:px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-7 lg:gap-8">
        {VALUE_CARDS.map((card, idx) => {
          const style = ACCENT_STYLES[card.accent]
          const isOrphanLastOnTablet = idx === VALUE_CARDS.length - 1 && VALUE_CARDS.length % 2 === 1
          return (
            <Reveal key={card.tag} delay={idx * 120} className={isOrphanLastOnTablet ? 'md:col-span-2 lg:col-span-1 md:max-w-[calc(50%-0.875rem)] md:mx-auto lg:max-w-none' : ''}>
              <article
                className={`group bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition duration-300 h-full ${style.topBorder}`}
              >
                <div className={`h-24 sm:h-28 md:h-36 lg:h-40 flex items-center justify-center transition px-3 ${style.panelBg}`}>
                  {/* //* [Modified Code] 가장 긴 "BLIND SPOT ZERO"가 작은 폰에서 깨지지 않도록 모바일 한 단계 작게 + tracking 축소 */}
                  <span
                    className={`font-black text-xl sm:text-2xl md:text-3xl lg:text-4xl tracking-[0.04em] sm:tracking-[0.06em] bg-clip-text text-transparent text-center ${style.kickerGradient} ${style.kickerStroke}`}
                  >
                    {card.kicker}
                  </span>
                </div>
                <div className="p-6 md:p-7 lg:p-8">
                  <span
                    className={`text-xs md:text-sm font-bold px-2 py-1 rounded mb-3 inline-block ${style.tagBg} ${style.tagText}`}
                  >
                    {card.tag}
                  </span>
                  <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-2 md:mb-3 break-keep">{card.title}</h3>
                  <p className="text-gray-600 text-sm md:text-base lg:text-lg leading-relaxed break-keep">{card.desc}</p>
                </div>
              </article>
            </Reveal>
          )
        })}
        </div>
      </div>
    </section>
  )
}
