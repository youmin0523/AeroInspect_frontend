/**
 * api/reportApi.js
 * 역할: LLM 하자 점검 보고서 생성 API 래퍼
 *       - generateReportStream: 스트리밍 방식 (fetch + ReadableStream)
 *       - generateReportPreview: 비스트리밍 방식 (Axios)
 *
 * 스트리밍 방식:
 *   fetch API의 response.body.getReader()를 사용하여
 *   청크 단위로 텍스트를 수신 → onChunk 콜백으로 전달
 */

// 비스트리밍 호출은 공용 인증 클라이언트 사용 (Bearer + X-Organization-Id + baseURL).
import { apiClient } from './authApi'

const BASE = '/api/v1/report'

// fetch 기반 스트리밍용 — 운영 배포(다른 origin) 대비 절대 URL + 인증 헤더 수동 구성.
const API_ORIGIN = import.meta.env.VITE_API_BASE_URL || ''

function authHeaders() {
  const headers = { 'Content-Type': 'application/json' }
  const token = sessionStorage.getItem('access_token')
  if (token) headers.Authorization = `Bearer ${token}`
  const org = JSON.parse(sessionStorage.getItem('current_org') || 'null')
  if (org?.id) headers['X-Organization-Id'] = org.id
  return headers
}

/**
 * LLM 보고서 스트리밍 생성.
 * 청크를 받을 때마다 onChunk(text) 콜백 호출.
 * 완료 시 onDone() 콜백 호출.
 *
 * @param {Object} request - ReportRequest 스키마
 * @param {Function} onChunk - 청크 텍스트 수신 콜백
 * @param {Function} onDone - 완료 콜백
 * @param {Function} onError - 오류 콜백
 */
export async function generateReportStream(request, onChunk, onDone, onError) {
  try {
    const response = await fetch(`${API_ORIGIN}${BASE}/generate`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error(`보고서 생성 실패: ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      onChunk(chunk)
    }

    onDone?.()
  } catch (err) {
    onError?.(err)
  }
}

/**
 * LLM 보고서 비스트리밍 미리보기 (전체 내용 한 번에)
 * @param {Object} request - ReportRequest 스키마
 * @returns {Object} { content, metadata }
 */
export async function generateReportPreview(request) {
  const { data } = await apiClient.post(`${BASE}/preview`, request)
  return data
}

/**
 * 하자 배열에 대한 공종 자동 제안.
 *   현재(DB 미연결): category_code 휴리스틱(constants/trades.js) 로 즉시 반환.
 *   추후(백엔드 연결): `POST /api/v1/report/suggest-trades` 로 교체 — Claude 가 image + defect_type + area 를 종합 분석.
 *
 * @param {Array} defects - DefectLog 배열
 * @returns {Promise<Array<{ id, trade, confidence }>>}
 */
export async function suggestTrades(defects) {
  // 동적 import 로 순환 참조 방지 (trades.js 는 순수 상수라 OK)
  const { suggestTradeFromCode } = await import('../constants/trades.js')
  return defects.map((d) => ({
    id: d.id,
    trade: suggestTradeFromCode(d.category_code),
    confidence: 0.65, // 휴리스틱 기본값. Claude 전환 시 실제 신뢰도로 교체.
  }))
}
