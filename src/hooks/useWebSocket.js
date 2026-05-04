/**
 * hooks/useWebSocket.js
 * 역할: WebSocket 연결 라이프사이클 관리 훅
 *       - 앱 마운트 시 자동 연결, 언마운트 시 자동 해제
 *       - 지수 백오프(1s → 30s 상한) 자동 재연결
 *       - 수신 메시지 type에 따라 Zustand store로 라우팅
 *       - 하트비트 pong 자동 응답
 *
 * 구독 채널:
 *   defects  → useDefectStore.addDefect()
 *   telemetry → useDroneStore.updateTelemetry()
 *   thermal  → useThermalDataStore (useThermalData.js)
 *   camera   → useDroneStore.syncCameraMode()
 */

import { useEffect, useRef, useCallback } from 'react'
import useDefectStore from '../store/defectStore.js'
import useDroneStore from '../store/droneStore.js'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/api/v1/ws'
const INITIAL_RETRY_DELAY = 300    // 0.3초
const MAX_RETRY_DELAY = 2000       // 2초

// 채널별 메시지 핸들러 (모듈 레벨 — 리렌더링과 무관)
const messageHandlers = {
  'defect.new': (data) => {
    useDefectStore.getState().addDefect(data)
  },
  'telemetry.update': (data) => {
    useDroneStore.getState().updateTelemetry(data)
  },
  'camera.mode_changed': (data) => {
    useDroneStore.getState().syncCameraMode(data.mode)
  },
  'connection.established': (data) => {
    console.log(`[WS] ${data.message}`)
  },
  'ping': null, // pong 응답은 아래 handleMessage에서 처리
}

export default function useWebSocket() {
  const wsRef = useRef(null)
  const retryDelayRef = useRef(INITIAL_RETRY_DELAY)
  const retryTimerRef = useRef(null)
  const mountedRef = useRef(true)

  const setStatus = useDroneStore((s) => s.setConnectionStatus)

  const connect = useCallback(() => {
    if (!mountedRef.current) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    setStatus('connecting')

    // defects 채널로 기본 구독 (메인 채널)
    const ws = new WebSocket(`${WS_URL}?channel=defects`)
    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) return
      console.log('[WS] 연결됨')
      setStatus('connected')
      retryDelayRef.current = INITIAL_RETRY_DELAY  // 재연결 딜레이 초기화
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        handleMessage(ws, message)
      } catch (e) {
        console.warn('[WS] 메시지 파싱 오류:', e)
      }
    }

    ws.onerror = (err) => {
      console.warn('[WS] 오류:', err)
      setStatus('error')
    }

    ws.onclose = () => {
      if (!mountedRef.current) return
      setStatus('disconnected')
      console.log(`[WS] 연결 종료. ${retryDelayRef.current / 1000}초 후 재연결...`)

      // 지수 백오프 재연결
      retryTimerRef.current = setTimeout(() => {
        retryDelayRef.current = Math.min(retryDelayRef.current * 2, MAX_RETRY_DELAY)
        connect()
      }, retryDelayRef.current)
    }
  }, [setStatus])

  useEffect(() => {
    mountedRef.current = true
    connect()

    return () => {
      mountedRef.current = false
      clearTimeout(retryTimerRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  return wsRef
}

/** 메시지 타입에 따라 적절한 핸들러로 라우팅 */
function handleMessage(ws, message) {
  const { type, data } = message

  // ping → pong 자동 응답
  if (type === 'ping') {
    ws.send(JSON.stringify({ type: 'pong' }))
    return
  }

  const handler = messageHandlers[type]
  if (handler && data) {
    handler(data)
  }
}
