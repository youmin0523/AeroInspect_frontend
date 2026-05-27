/**
 * vite.config.js
 * 역할: Vite 빌드 도구 설정
 *       - React 플러그인 등록
 *       - 개발 서버 포트(5173) 및 프록시 설정
 *       - /api 요청을 백엔드(8000)으로 프록시하여 CORS 우회
 */

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Sentry Vite plugin 은 SENTRY_AUTH_TOKEN 이 있을 때만 빌드 결과 sourcemap 을 업로드.
// 토큰 없으면 plugin 자체를 끼우지 않음 → 일반 개발/CI 환경에서 부담 0.
export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const sentryAuthToken = env.SENTRY_AUTH_TOKEN || env.VITE_SENTRY_AUTH_TOKEN
  const sentryOrg = env.SENTRY_ORG || env.VITE_SENTRY_ORG
  const sentryProject = env.SENTRY_PROJECT || env.VITE_SENTRY_PROJECT

  const plugins = [react()]
  if (sentryAuthToken && sentryOrg && sentryProject) {
    // 동적 import — devDependency 미설치 환경(예: 사용자가 아직 npm install 안 했을 때) 보호
    try {
      const { sentryVitePlugin } = await import('@sentry/vite-plugin')
      plugins.push(
        sentryVitePlugin({
          authToken: sentryAuthToken,
          org: sentryOrg,
          project: sentryProject,
          // release 미지정 시 git SHA / package.json version 자동 탐지
          release: { name: env.SENTRY_RELEASE || undefined },
          sourcemaps: {
            assets: './dist/**',
          },
          telemetry: false,
        })
      )
    } catch (e) {
      console.warn('[vite] @sentry/vite-plugin not installed — skipping sourcemap upload')
    }
  }

  return ({
  plugins,
  server: {
    port: 5173,
    proxy: {
      // REST API 프록시
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // WebSocket 프록시
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
        changeOrigin: true,
      },
      // 영상 스트림 프록시
      '/stream': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // 국세청 사업자 상태조회 API (odcloud.kr) CORS 우회용 프록시
      '/odcloud': {
        target: 'https://api.odcloud.kr',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/odcloud/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  })
})
