/**
 * tailwind.config.js
 * 역할: Tailwind CSS 설정
 *       - content 경로 설정 (purge 대상)
 *       - AeroInspect 브랜드 컬러 확장
 *       - 심각도별 커스텀 컬러 (HIGH:red, MED:amber, LOW:gray)
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // DRONE INSPECT 브랜드 컬러 (기존 blue 계열은 보조용으로 유지)
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        },
        // 대시보드 주 강조색 = indigo 계열 (모던/프리미엄 톤)
        accent: {
          50:  '#eef2ff',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
        // 심각도별 컬러
        severity: {
          high: '#ef4444',     // red-500
          med:  '#f97316',     // orange-500
          low:  '#eab308',     // yellow-500
        },
        // 다크 대시보드 배경 — 중성 다크 그레이 (네이비 제거)
        dashboard: {
          bg:      '#121212',  // 중성 다크 그레이
          surface: '#1a1a1a',  // 카드/헤더 surface
          panel:   '#262626',  // 카드 내부 패널
          border:  '#333333',  // 중성 보더
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        // 한글·영문 일관성용 — 시간/숫자/라벨 등 폰트가 섞이는 위치에서 사용
        pretendard: ['Pretendard Variable', 'Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'Roboto', '"Helvetica Neue"', '"Apple SD Gothic Neo"', '"Noto Sans KR"', 'sans-serif'],
      },
      animation: {},
    },
  },
  plugins: [],
}
