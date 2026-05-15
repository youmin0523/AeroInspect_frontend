/**
 * hooks/useWebSocket.js
 * 역할: WebSocket 연결 라이프사이클 관리 훅
 *       - 앱 마운트 시 자동 연결, 언마운트 시 자동 해제
 *       - 지수 백오프(0.3s → 2s 상한) 자동 재연결
 *       - 단일 연결로 여러 채널을 동시에 구독 (?channels=a,b,c)
 *       - 로그인 상태면 본인 채널(notifications:{uid}/user:{uid}) 자동 추가 + ?token=jwt
 *       - 수신 메시지 type 에 따라 Zustand store 로 라우팅
 *       - 하트비트 pong 자동 응답
 *
 * 구독 채널:
 *   defects              → defect.new / defect.batch / lidar.points / mission.*
 *   telemetry            → telemetry.update / slam.created / slam.updated
 *   camera               → camera.mode_changed
 *   thermal              → thermal.frame / thermal.analysis
 *   notifications:{uid}  → notification.new (로그인 시)
 *   user:{uid}           → chat.new_message / chat.read (로그인 시)
 */

import { useEffect, useRef, useCallback } from 'react'
import useAuthStore from '../store/authStore.js'
import useDefectStore from '../store/defectStore.js'
import useDroneStore from '../store/droneStore.js'
import useSessionStore from '../store/sessionStore.js'
import useThermalStore from '../store/thermalStore.js'
import useTestDetectionsStore from '../store/testDetectionsStore.js'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/api/v1/ws'
const INITIAL_RETRY_DELAY = 300    // 0.3초
const MAX_RETRY_DELAY = 2000       // 2초

// 한 연결로 동시 구독할 공개 정적 채널 목록
const STATIC_CHANNELS = ['defects', 'telemetry', 'camera', 'thermal']

/** TEST MODE 게이트(미디어 준비 전 큐) 통과 후 defectStore 에 push */
function pushDefect(data) {
  const sess = useSessionStore.getState()
  const defectStore = useDefectStore.getState()
  // 영상 직접재생 모드의 detection(video_timestamp_sec 포함)은 timeline store 에도 적재 — DetectionOverlay 동기화용.
  if (typeof data?.video_timestamp_sec === 'number') {
    useTestDetectionsStore.getState().ingest(data)
  }
  if (sess.isTestMode && !defectStore.testMediaReady) {
    defectStore.queueTestDefect(data)
    return
  }
  defectStore.addDefect(data)
}

// 채널별 메시지 핸들러 (모듈 레벨 — 리렌더링과 무관)
const messageHandlers = {
  'defect.new': (data) => pushDefect(data),
  'defect.batch': (data) => {
    if (!Array.isArray(data?.items)) return
    for (const item of data.items) pushDefect(item)
  },
  'telemetry.update': (data) => {
    useDroneStore.getState().updateTelemetry(data)
  },
  'camera.mode_changed': (data) => {
    useDroneStore.getState().syncCameraMode(data.mode)
  },
  'thermal.frame': (data) => {
    useThermalStore.getState().pushReading(data)
  },
  'thermal.analysis': (data) => {
    useThermalStore.getState().pushReading(data)
  },
  // //* [Modified Code 2026-05-13] L3 자율비행 + LiDAR 스캔 이벤트
  'lidar.points': (data) => {
    if (Array.isArray(data?.points)) {
      useDroneStore.getState().appendLidarPoints(data.points)
    }
  },
  'mission.completed': (data) => {
    console.log(`[WS] 미션 완료: ${data?.points_total} 점, ${data?.duration_s}s`)
    useDroneStore.getState().finishLidarMission()
  },
  'mission.failed': (data) => {
    console.warn('[WS] 미션 실패:', data?.error)
    useDroneStore.getState().failLidarMission('failed')
  },
  'slam.created': (data) => {
    console.log('[WS] SLAM 맵 생성:', data?.map_id)
  },
  'slam.updated': (data) => {
    console.log('[WS] SLAM 맵 업데이트:', data?.map_id)
  },
  'connection.established': (data) => {
    const chs = Array.isArray(data?.channels) ? data.channels.join(', ') : data?.channel
    console.log(`[WS] 연결됨: ${chs ?? '(채널 미상)'}`)
    if (Array.isArray(data?.rejected) && data.rejected.length > 0) {
      console.warn(`[WS] 인증 거부된 채널: ${data.rejected.join(', ')}`)
    }
  },
  'ping': null, // pong 응답은 아래 handleMessage 에서 처리
}

export default function useWebSocket() {
  const wsRef = useRef(null)
  const retryDelayRef = useRef(INITIAL_RETRY_DELAY)
  const retryTimerRef = useRef(null)
  const mountedRef = useRef(true)

  // auth 상태가 바뀌면 자동 재연결되도록 deps 로 활용
  const token = useAuthStore((s) => s.token)
  const userId = useAuthStore((s) => s.user?.id)

  const setStatus = useDroneStore((s) => s.setConnectionStatus)

  const connect = useCallback(() => {
    if (!mountedRef.current) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    setStatus('connecting')

    // 정적 채널 + (로그인 시) 본인 채널 함께 구독
    const channels = [...STATIC_CHANNELS]
    if (userId && token) {
      channels.push(`notifications:${userId}`)
      channels.push(`user:${userId}`)
    }
    const params = new URLSearchParams({ channels: channels.join(',') })
    if (token) params.set('token', token)

    const ws = new WebSocket(`${WS_URL}?${params.toString()}`)
    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) return
      console.log(`[WS] 연결됨 — 채널: ${channels.join(',')}`)
      setStatus('connected')
      retryDelayRef.current = INITIAL_RETRY_DELAY
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

      retryTimerRef.current = setTimeout(() => {
        retryDelayRef.current = Math.min(retryDelayRef.current * 2, MAX_RETRY_DELAY)
        connect()
      }, retryDelayRef.current)
    }
  }, [setStatus, token, userId])

  useEffect(() => {
    mountedRef.current = true
    connect()

    return () => {
      mountedRef.current = false
      clearTimeout(retryTimerRef.current)
      // token/userId 가 바뀌어 connect 가 재생성되면 기존 소켓을 닫아야 새 채널로 다시 붙는다
      wsRef.current?.close()
      wsRef.current = null
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
  if (handler && data !== undefined) {
    handler(data)
  }
}
