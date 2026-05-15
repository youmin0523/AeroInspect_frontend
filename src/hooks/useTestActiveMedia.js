/**
 * hooks/useTestActiveMedia.js
 * 역할: backend /api/v1/stream/test/active 폴링 — 현재 재생 대상이 영상인지 이미지인지 메타 제공.
 *       - 영상 (kind='video') 이면 filename/fps/duration/frame_w/frame_h 로 <video> 분기에 사용
 *       - 이미지 (kind='image') 이면 기존 MJPEG 경로
 *       - active.filename 변경 시 testDetectionsStore 도 clear 동기화
 *
 * 폴링 주기: 2s. WS push 가 있으면 더 빠른 갱신 가능하지만 메타 변경은 빈번하지 않음.
 */

import { useEffect, useState } from 'react'
import useSessionStore from '../store/sessionStore.js'
import useTestDetectionsStore from '../store/testDetectionsStore.js'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''
const ACTIVE_URL = `${API_BASE}/api/v1/stream/test/active`
const POLL_MS = 2000

const EMPTY = { kind: 'image', filename: null }

export default function useTestActiveMedia() {
  const isTestMode = useSessionStore((s) => s.isTestMode)
  const testPlayState = useSessionStore((s) => s.testPlayState)
  const setActiveFilename = useTestDetectionsStore((s) => s.setActiveFilename)
  const [active, setActive] = useState(EMPTY)

  useEffect(() => {
    if (!isTestMode) {
      setActive(EMPTY)
      setActiveFilename(null)
      return
    }
    let mounted = true
    const tick = async () => {
      try {
        const res = await fetch(ACTIVE_URL, { credentials: 'omit' })
        if (!res.ok) return
        const data = await res.json()
        if (!mounted) return
        setActive(data || EMPTY)
        setActiveFilename(data?.filename || null)
      } catch {
        // 네트워크/콜드스타트는 조용히 — 다음 tick에서 재시도
      }
    }
    tick()
    const id = setInterval(tick, POLL_MS)
    return () => {
      mounted = false
      clearInterval(id)
    }
  }, [isTestMode, testPlayState, setActiveFilename])

  return active
}
