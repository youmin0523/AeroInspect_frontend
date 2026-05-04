/**
 * vite.config.js
 * 역할: Vite 빌드 도구 설정
 *       - React 플러그인 등록
 *       - 개발 서버 포트(5173) 및 프록시 설정
 *       - /api 요청을 백엔드(8000)으로 프록시하여 CORS 우회
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
