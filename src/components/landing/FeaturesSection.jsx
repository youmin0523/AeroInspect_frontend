/**
 * FeaturesSection.jsx
 * 역할: 랜딩 페이지 "핵심 기술" 섹션
 *       - 3개 기술 축(복원 / AI 분석 / 공간 매핑)을 카드로 제시
 *       - 첫 번째 축(복원)은 3가지 하위 파이프라인(CAD / 2D / 자율비행)을 칩으로 노출
 */

import Reveal from '../common/Reveal.jsx'

// Vite glob: 각 카드의 이미지를 번들 URL 배열로 수집 (키 기준 정렬로 01-, 02- 순서 보장)
// NOTE: import.meta.glob의 두 번째 인자는 반드시 "객체 리터럴" 이어야 한다 (Vite 정적 분석 제약)
const toSortedUrls = (modules) =>
  Object.entries(modules)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, url]) => url)

const modelingImages = toSortedUrls(
  import.meta.glob('../../assets/features/modeling/*.{png,jpg,jpeg,webp}', {
    eager: true,
    import: 'default',
    query: '?url',
  })
)
const aiImages = toSortedUrls(
  import.meta.glob('../../assets/features/ai/*.{png,jpg,jpeg,webp}', {
    eager: true,
    import: 'default',
    query: '?url',
  })
)
const mappingImages = toSortedUrls(
  import.meta.glob('../../assets/features/mapping/*.{png,jpg,jpeg,webp}', {
    eager: true,
    import: 'default',
    query: '?url',
  })
)

// 카드 데이터: accent는 ACCENT_STYLES 키와 매칭. image가 있으면 코드 스트립 대신 이미지 표시.
const TECH_CARDS = [
  {
    key: 'modeling',
    tag: 'MODELING',
    code: '3D_RECONSTRUCTION_ENGINE',
    image: modelingImages[0],
    title: '하이브리드 3D 복원 기술',
    desc: 'CAD 도면, 2D 평면도, 드론 스캔 데이터를 융합하여 실제 건축물과 동일한 디지털 트윈을 생성합니다. 도면이 없는 건물도 자율비행으로 복원합니다.',
    chips: ['CAD 연동', '2D 역설계', '자율비행 스캔'],
    accent: 'slate',
  },
  {
    key: 'ai',
    tag: 'AI ANALYSIS',
    code: 'AI_DEFECT_DETECTION_v2.1',
    image: aiImages[0],
    title: '픽셀 단위 하자 식별 알고리즘',
    desc: '딥러닝 기반 비전 알고리즘이 외벽 균열, 누수, 박리 등 주요 하자를 자동 탐지합니다. 식별된 하자는 3D 좌표계에 즉시 동기화됩니다.',
    chips: null,
    accent: 'indigo',
  },
  {
    key: 'mapping',
    tag: 'DATA MAPPING',
    code: 'SPATIAL_COORDINATE_SYSTEM',
    image: mappingImages[0],
    title: 'X, Y, Z 정밀 공간 매핑',
    desc: '모든 하자는 3D 모델 상의 절대 좌표값을 가집니다. 보수 작업자가 하자 위치를 헤매지 않고 정확히 찾아갈 수 있는 가이드를 제공합니다.',
    chips: null,
    accent: 'orange',
  },
]

// Tailwind JIT 안전하게 full class name으로 매핑
const ACCENT_STYLES = {
  slate: { tagBg: 'bg-slate-800', chipBg: 'bg-slate-100', chipText: 'text-slate-700', dot: 'bg-cyan-400' },
  indigo: { tagBg: 'bg-indigo-600', chipBg: 'bg-indigo-50', chipText: 'text-indigo-700', dot: 'bg-indigo-400' },
  orange: { tagBg: 'bg-orange-600', chipBg: 'bg-orange-50', chipText: 'text-orange-700', dot: 'bg-orange-400' },
}

export default function FeaturesSection() {
  return (
    <section id="features" className="min-h-[calc(100vh-5rem)] md:min-h-[calc(100vh-6rem)] flex flex-col scroll-mt-20 md:scroll-mt-24">
      {/* 다크 배너 */}
      {/* //* [Modified Code] 모바일 padding/타이포 단계화 */}
      <div className="bg-slate-900 text-white py-14 sm:py-20 md:py-24 lg:py-28 px-6 sm:px-8 text-center">
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 md:mb-5 break-keep">DRONE INSPECT 핵심 기술 스택</h2>
        <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-400 break-keep">
          아키텍처 설계부터 AI 분석까지, 타협하지 않는 정밀함을 구현합니다.
        </p>
      </div>

      {/* 3개 기술 축 카드 — flex-1 + items-center 로 잔여 viewport 영역 위/아래 대칭 분배 */}
      <div className="flex-1 flex items-center py-12 md:py-14 lg:py-16">
        {/* //* [Modified Code] 태블릿(md~lg) 2열 시 마지막 카드는 2칸 차지 + 내부에서 데스크탑과 동일한 카드 폭으로 가운데 정렬 */}
        <div className="max-w-7xl w-full mx-auto px-6 md:px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-7 lg:gap-8">
        {TECH_CARDS.map((card, idx) => {
          const style = ACCENT_STYLES[card.accent]
          const isOrphanLastOnTablet = idx === TECH_CARDS.length - 1 && TECH_CARDS.length % 2 === 1
          return (
            <Reveal key={card.key} delay={idx * 120} className={isOrphanLastOnTablet ? 'md:col-span-2 lg:col-span-1 md:max-w-[calc(50%-0.875rem)] md:mx-auto lg:max-w-none' : ''}>
            <article
              className="group bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl hover:-translate-y-1 transition duration-300 h-full"
            >
              {/* 상단 비주얼: 이미지가 있으면 이미지 + 코드 라벨 오버레이, 없으면 코드 스트립 */}
              <div className="relative h-36 sm:h-40 md:h-44 lg:h-44 bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition overflow-hidden">
                {card.image ? (
                  <>
                    <img
                      src={card.image}
                      alt={card.title}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      loading="lazy"
                    />
                    {/* 라이브 시스템 뱃지: 우측 하단, accent 컬러 점 + 모노 라벨 (pulse) */}
                    <span className="absolute bottom-2 right-2 z-10 flex items-center gap-1.5 text-white/70 font-mono text-[10px] tracking-wider px-1.5 py-0.5 rounded bg-slate-900/30 backdrop-blur-sm">
                      <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${style.dot}`}>
                        <span className={`absolute inset-0 rounded-full ${style.dot} opacity-75 animate-ping`} />
                      </span>
                      {card.code}
                    </span>
                  </>
                ) : (
                  <span className="flex items-center gap-1.5 text-slate-500 font-mono text-xs">
                    <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                    {card.code}
                  </span>
                )}
              </div>

              <div className="p-6 md:p-7">
                <span
                  className={`text-xs md:text-sm font-bold text-white px-2 py-1 rounded mb-3 inline-block ${style.tagBg}`}
                >
                  {card.tag}
                </span>
                <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-slate-800 mb-2 break-keep">{card.title}</h3>
                <p className="text-gray-600 text-sm md:text-base leading-relaxed break-keep">{card.desc}</p>

                {/* 복원 카드에만 노출되는 하위 파이프라인 칩 */}
                {card.chips && (
                  <ul className="mt-3 flex flex-wrap gap-2" aria-label="하위 모델링 파이프라인">
                    {card.chips.map((chip) => (
                      <li
                        key={chip}
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${style.chipBg} ${style.chipText}`}
                      >
                        {chip}
                      </li>
                    ))}
                  </ul>
                )}
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
