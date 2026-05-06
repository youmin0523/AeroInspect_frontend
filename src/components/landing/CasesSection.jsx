/**
 * CasesSection.jsx
 * 역할: 랜딩 페이지 "도입 사례" 섹션
 *       - B2B 건설사 / 정밀 안전진단 / B2C 입주민 3개 레퍼런스 카드
 *       - LandingHeader의 `#cases` 앵커 타겟
 *       - 카드별 이미지는 assets/cases/{폴더}/ 에서 자동 수집하여 크로스페이드
 */

import Reveal from '../common/Reveal.jsx'
import CaseSlideshow from './CaseSlideshow.jsx'

// Vite glob: 각 케이스 폴더의 이미지를 번들 URL 배열로 수집
// NOTE: import.meta.glob의 두 번째 인자는 반드시 "객체 리터럴" 이어야 한다 (Vite 정적 분석 제약)
const toSortedUrls = (modules) =>
  Object.entries(modules)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, url]) => url)

const b2bImages = toSortedUrls(
  import.meta.glob('../../assets/cases/b2b-construction/*.{png,jpg,jpeg,webp}', {
    eager: true,
    import: 'default',
    query: '?url',
  })
)
const diagnosisImages = toSortedUrls(
  import.meta.glob('../../assets/cases/inspection/*.{png,jpg,jpeg,webp}', {
    eager: true,
    import: 'default',
    query: '?url',
  })
)
const b2cImages = toSortedUrls(
  import.meta.glob('../../assets/cases/b2c-resident/*.{png,jpg,jpeg,webp}', {
    eager: true,
    import: 'default',
    query: '?url',
  })
)

const CASE_CARDS = [
  {
    key: 'b2b',
    tag: 'B2B 건설사',
    images: b2bImages,
    placeholder: '[신축 대단지 현장 사진]',
    interval: 4000,
    startDelay: 0,
    title: '대규모 신축 단지 실내 전수조사',
    desc: '수천 세대 규모의 현장도 문제없이 완벽한 전수조사 지원. 기존 인력 대비 점검 기간을 60% 단축하며, 전 세대 내부 마감재 스캔 및 하자 리포트를 일괄 제출합니다.',
    accent: 'blue',
  },
  {
    key: 'diagnosis',
    tag: '정밀 안전진단',
    images: diagnosisImages,
    placeholder: '[노후 건축물 스캔 사진]',
    interval: 4000,
    startDelay: 1300,
    title: '도면 미보유 노후 건축물 정밀 진단',
    desc: '도면이 소실되거나 현행화되지 않은 현장이라도 문제없습니다. 드론 자율비행(Photogrammetry)을 통해 실내 3D 디지털 트윈을 즉각 생성하고 숨은 결함을 분석합니다.',
    accent: 'yellow',
  },
  {
    key: 'b2c',
    tag: 'B2C 입주민',
    images: b2cImages,
    placeholder: '[모바일/태블릿 뷰어 사진]',
    interval: 3000,
    startDelay: 2600,
    title: '프리미엄 개별 세대 리포트',
    desc: '세대주가 직접 접속하여 도배, 마루, 마감재 등 실내 공간의 하자 상태를 3D 뷰어로 확인하고 보수 이력을 트래킹.',
    accent: 'green',
  },
]

const ACCENT_STYLES = {
  blue: { tagBg: 'bg-blue-600', tagText: 'text-white' },
  yellow: { tagBg: 'bg-yellow-400', tagText: 'text-slate-800' },
  green: { tagBg: 'bg-green-600', tagText: 'text-white' },
}

export default function CasesSection() {
  return (
    <section id="cases" className="min-h-[calc(100vh-5rem)] md:min-h-[calc(100vh-6rem)] flex flex-col scroll-mt-20 md:scroll-mt-24">
      {/* 다크 배너 */}
      {/* //* [Modified Code] 모바일 padding/타이포 단계화 */}
      <div className="bg-slate-900 text-white py-14 sm:py-20 md:py-24 lg:py-28 px-6 sm:px-8 text-center">
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 md:mb-5 break-keep">DRONE INSPECT 현장 스케치</h2>
        <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-400 break-keep">
          대단지 신축 아파트부터 개별 세대까지, 검증된 도입 사례를 확인하세요.
        </p>
      </div>

      {/* 레퍼런스 카드 — flex-1 + items-center 로 잔여 viewport 영역 위/아래 대칭 분배 */}
      <div className="flex-1 flex items-center py-12 md:py-14 lg:py-16">
        {/* //* [Modified Code] 태블릿(md~lg) 2열 시 마지막 카드는 2칸 차지 + 내부에서 데스크탑과 동일한 카드 폭으로 가운데 정렬 */}
        <div className="max-w-7xl w-full mx-auto px-6 md:px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-7 lg:gap-8">
        {CASE_CARDS.map((card, idx) => {
          const style = ACCENT_STYLES[card.accent]
          const isOrphanLastOnTablet = idx === CASE_CARDS.length - 1 && CASE_CARDS.length % 2 === 1
          return (
            <Reveal key={card.key} delay={idx * 120} className={isOrphanLastOnTablet ? 'md:col-span-2 lg:col-span-1 md:max-w-[calc(50%-0.875rem)] md:mx-auto lg:max-w-none' : ''}>
              <article className="group bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl hover:-translate-y-1 transition duration-300 h-full">
                <CaseSlideshow
                  images={card.images}
                  placeholder={card.placeholder}
                  interval={card.interval}
                  startDelay={card.startDelay}
                />
                <div className="p-6 md:p-7">
                  <span
                    className={`text-xs md:text-sm font-bold px-2 py-1 rounded mb-3 inline-block ${style.tagBg} ${style.tagText}`}
                  >
                    {card.tag}
                  </span>
                  <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-slate-800 mb-2 break-keep">{card.title}</h3>
                  <p className="text-gray-600 text-sm md:text-base leading-relaxed break-keep">{card.desc}</p>
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
