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

  // 개발 프록시 타겟 — 기본 로컬 백엔드(8000). VITE_PROXY_TARGET 으로 GCP VM 등 원격 백엔드
  // (예: http://34.64.124.77:8000)를 가리키면 /api·/stream·/ws 가 그쪽으로 프록시되어
  // CORS·mixed-content 없이 원격 검출 백엔드를 로컬에서 그대로 쓸 수 있다.
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:8000'
  const wsProxyTarget = proxyTarget.replace(/^http/, 'ws')

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
      // REST API 프록시 (WS 업그레이드 포함 — /api/v1/ws 도 이 규칙으로 프록시)
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
        ws: true,
      },
      // WebSocket 프록시
      '/ws': {
        target: wsProxyTarget,
        ws: true,
        changeOrigin: true,
      },
      // 영상 스트림 프록시
      '/stream': {
        target: proxyTarget,
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
    // 단일 5MB 번들 → 벤더별 청크 분리. 브라우저 병렬 다운로드 + 배포 간 캐시 적중률 상승.
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom', 'zustand'],
          'vendor-three': ['three', '@react-three/fiber', '@react-three/drei'],
          'vendor-charts': ['recharts'],
          'vendor-pdf': ['@react-pdf/renderer'],
          'vendor-excel': ['exceljs'],
          'vendor-markdown': ['react-markdown'],
        },
      },
    },
  },
  })
})
