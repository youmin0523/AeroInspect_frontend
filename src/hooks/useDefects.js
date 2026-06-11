/**
 * hooks/useDefects.js
 * 역할: 하자 목록 초기 로드 및 WebSocket 실시간 구독 훅
 *       - 컴포넌트 마운트 시 REST API로 기존 하자 목록 가져오기
 *       - 이후 WebSocket을 통해 새 하자 실시간 수신 (useWebSocket에서 처리)
 *       - 필터 변경 시 서버에 필터링 요청 (선택적)
 */

import { useEffect } from 'react'
import useDefectStore from '../store/defectStore.js'
import useSessionStore from '../store/sessionStore.js'
import { fetchDefects } from '../api/defectsApi.js'
import { toast } from '../store/toastStore.js'

export default function useDefects() {
  const setDefects = useDefectStore((s) => s.setDefects)
  const setLoading = useDefectStore((s) => s.setLoading)
  const filters = useDefectStore((s) => s.filters)
  const isTestMode = useSessionStore((s) => s.isTestMode)

  useEffect(() => {
    // 테스트 모드: 과거 DB 하자를 불러오지 않는다 (START 전 빈 목록 유지).
    // 실시간 검출은 START 후 WebSocket "defect.new" 로만 채워진다.
    if (isTestMode) {
      setDefects([])
      setLoading(false)
      return
    }

    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const data = await fetchDefects({
          severity: filters.severity,
          area: filters.area,
          category_code: filters.categoryCode,
          limit: 100,
        })
        if (!cancelled) {
          setDefects(data.items || [])
        }
      } catch (err) {
        console.error('[useDefects] 로드 실패:', err)
        if (!cancelled) toast.error('하자 목록을 불러오지 못했습니다.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [isTestMode, filters.severity, filters.area, filters.categoryCode, setDefects, setLoading])
}
