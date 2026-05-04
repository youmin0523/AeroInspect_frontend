/**
 * DualCTASection.jsx
 * 역할: B2B(건설사·점검 업체) / B2C(세대주) 두 타겟의 가치 제안을 좌우 분할로 제시
 *       - 모바일: 세로 스택
 *       - 태블릿 이상: 가로 2분할
 */

import b2bBg from '../../assets/cta/b2b/b2b_03.png'
import b2cBg from '../../assets/cta/b2c/b2c_04.png'

// 각 패널의 콘텐츠 데이터
const B2B_ITEMS = [
  '단지 전체의 하자 이력 데이터베이스화',
  '소규모 업체도 가능한 대단지 통합 관리',
  '권한별 멀티 테넌시(Multi-tenancy) 지원',
]

const B2C_ITEMS = [
  '별도 설치 없는 웹 기반 3D 인터랙티브 뷰어',
  '우리 집 외벽의 상태를 직관적으로 확인',
  '정확한 공간 좌표(X,Y) 기반의 보수 처리 트래킹',
]

// 체크리스트 렌더링용 공통 컴포넌트
function CheckList({ items, textClass }) {
  return (
    <ul className={`space-y-4 ${textClass}`}>
      {items.map((text) => (
        <li key={text} className="flex items-center">
          <span aria-hidden="true" className="mr-2">
            ✓
          </span>
          {text}
        </li>
      ))}
    </ul>
  )
}

export default function DualCTASection() {
  return (
    <section className="flex flex-col md:flex-row min-h-[50vh]">
      {/* B2B: 다크 테마 */}
      <div className="relative flex-1 bg-slate-800 text-white p-10 md:p-16 flex flex-col justify-center overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center scale-110 blur-[1.5px] opacity-40"
          style={{ backgroundImage: `url(${b2bBg})` }}
        />
        <div aria-hidden="true" className="absolute inset-0 bg-slate-900/60" />
        <div className="relative max-w-md mx-auto md:ml-auto md:mr-10">
          <span className="inline-block px-3 py-1 bg-slate-700 text-sm font-semibold rounded-full mb-4">
            For B2B
          </span>
          <h2 className="text-2xl md:text-3xl font-bold mb-6">
            건설사 및 점검 업체를 위한
            <br />
            통합 관제 대시보드
          </h2>
          <CheckList items={B2B_ITEMS} textClass="text-gray-300" />
        </div>
      </div>

      {/* B2C: 옐로 배경 */}
      <div className="relative flex-1 bg-yellow-50 text-slate-800 p-10 md:p-16 flex flex-col justify-center overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center scale-110 blur-[1.5px] opacity-30 -scale-x-110"
          style={{ backgroundImage: `url(${b2cBg})` }}
        />
        <div aria-hidden="true" className="absolute inset-0 bg-yellow-50/70" />
        <div className="relative max-w-md mx-auto md:mr-auto md:ml-10">
          <span className="inline-block px-3 py-1 bg-yellow-200 text-yellow-800 text-sm font-semibold rounded-full mb-4">
            For B2C
          </span>
          <h2 className="text-2xl md:text-3xl font-bold mb-6">
            일반 세대주를 위한
            <br />
            투명한 3D 데이터 뷰어
          </h2>
          <CheckList items={B2C_ITEMS} textClass="text-gray-700" />
        </div>
      </div>
    </section>
  )
}
