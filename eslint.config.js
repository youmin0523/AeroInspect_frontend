/**
 * eslint.config.js (ESLint v9 flat config)
 * 역할: src 의 JS/JSX 정적 검사. v9 부터 .eslintrc 대신 이 파일이 기본 설정.
 *       (이전: 설정 파일 부재로 `npm run lint` 가 아무 검사도 못 하고 통과 → 잠재버그 무방비)
 */

import js from '@eslint/js'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

export default [
  { ignores: ['dist/**', 'node_modules/**', 'public/**', '.vercel/**'] },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { react, 'react-hooks': reactHooks },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // JSX Transform(자동 런타임) 사용 — React import 강제/스코프 규칙 비활성.
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      'react/prop-types': 'off',
      // react-three-fiber 는 three.js 객체 prop(position/args/intensity 등)을 JSX 로 받는다 →
      // DOM 속성 기준 검사인 이 규칙은 r3f 에서 전부 오탐. 끈다.
      'react/no-unknown-property': 'off',
      // 한글 본문의 따옴표는 버그가 아님 — 노이즈 제거.
      'react/no-unescaped-entities': 'off',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      // 미사용 변수는 경고(대문자/언더스코어 시작은 의도된 placeholder 로 허용).
      'no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],
    },
  },
]
