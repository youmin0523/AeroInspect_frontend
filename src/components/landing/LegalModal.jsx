/**
 * LegalModal.jsx
 * 역할: 푸터의 법적 정보 링크(서비스 이용약관 / 개인정보처리방침 / 이메일 무단수집 거부) 클릭 시 노출되는 모달
 *       - type prop 으로 컨텐츠 분기
 *       - ESC + 백드롭 클릭 + X 버튼 모두 닫기
 *       - body 스크롤 잠금
 *       - ContactModal 패턴 차용:
 *         · 외곽 div 는 flex centering 만 담당
 *         · 백드롭은 별도 absolute layer (z-index 분리)
 *         · 모달 본체는 overflow-hidden flex-col 로 헤더/스크롤본문/푸터 분할
 *         · 본문만 flex-1 overflow-y-auto → 헤더·푸터는 자연 stick (sticky 클래스 불필요)
 *       - React Portal 로 document.body 직접 렌더 → DOM 계층/stacking context 분리
 */

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { BETA_NOTICE_ENABLED, LEGAL_CONTENTS } from '../../data/legalContents.js'

export default function LegalModal({ type, onClose }) {
  const scrollRef = useRef(null)

  // ESC 닫기 + body 스크롤 잠금
  useEffect(() => {
    if (!type) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // 모달 열릴 때마다 본문 스크롤 위치 초기화
    if (scrollRef.current) scrollRef.current.scrollTop = 0
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [type, onClose])

  if (!type) return null
  const content = LEGAL_CONTENTS[type]
  if (!content) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
      // isolation: isolate 로 자체 stacking context 강제 형성 → 어떤 ancestor 영향도 차단
      // inline style 로 background-color 보장(Tailwind JIT/캐시 의존 제거)
      style={{ isolation: 'isolate', backgroundColor: 'rgb(0, 0, 0)' }}
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8"
      onClick={onClose}
    >
      {/* 백드롭 — 별도 absolute layer (이중 안전망). inline style 로도 검정 강제 */}
      <div
        style={{ backgroundColor: 'rgb(0, 0, 0)' }}
        className="absolute inset-0 bg-black"
        aria-hidden="true"
      />

      {/*
        모달 본체 — relative 로 백드롭 위에 배치.
        overflow-hidden 으로 헤더·푸터·라운드 모서리 깔끔. flex-col 로 자식 3분할.
        onClick stopPropagation 으로 본체 클릭 시 닫히지 않도록(외곽 div onClick 차단).
      */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl max-h-[92vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* 헤더: 제목 + 시행일 + 닫기 — 자연 높이, 항상 모달 상단 고정(flex-col 첫 자식) */}
        <div className="bg-white border-b border-gray-200 px-6 md:px-8 py-4 flex items-start justify-between gap-4 shrink-0">
          <div>
            <h2 id="legal-modal-title" className="text-xl md:text-2xl font-bold text-slate-800">
              {content.title}
            </h2>
            <p className="text-xs text-gray-500 mt-1">시행일: {content.effectiveDate}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="모달 닫기"
            className="flex items-center justify-center w-9 h-9 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <i className="ri-close-line text-2xl" />
          </button>
        </div>

        {/* 베타 임시본 경고 배너 — 법무 검토 미완료 항목(terms / privacy) 에만 노출. 자연 높이, 헤더 바로 아래. */}
        {BETA_NOTICE_ENABLED && content.isBeta && (
          <div role="alert" className="bg-red-50 border-b border-red-200 px-6 md:px-8 py-4 shrink-0">
            <div className="flex gap-3">
              <i className="ri-alert-line text-red-600 text-xl shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-sm text-red-800 leading-relaxed">
                <strong className="block font-bold mb-1">⚠️ 베타 테스트용 임시본 안내</strong>
                <span className="text-red-700">
                  본 {content.title}은 베타 서비스 운영을 위한 임시본이며, 정식 서비스 개시 전 법무 검토를 거쳐 정식 약관으로 교체될 예정입니다. 정식본 게시 시 이용자에게 별도 통지하고 재동의를 받습니다.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 본문 — flex-1 로 잔여 영역 흡수 + overflow-y-auto 로 자체 스크롤. 헤더/푸터는 자연 고정. */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto bg-white px-6 md:px-8 py-6 space-y-6 text-sm md:text-base text-gray-700 leading-relaxed"
        >
          {content.sections.map((section) => (
            <section key={section.heading}>
              <h3 className="font-semibold text-slate-800 mb-2 text-base md:text-lg">
                {section.heading}
              </h3>
              <p className="whitespace-pre-line break-keep">{section.body}</p>
            </section>
          ))}
        </div>

        {/* 푸터: 확인 버튼 — 자연 높이, 항상 모달 하단 고정(flex-col 마지막 자식) */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 md:px-8 py-4 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-md font-semibold text-sm transition focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            확인
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
