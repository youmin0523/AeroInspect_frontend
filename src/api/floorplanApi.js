/**
 * api/floorplanApi.js
 * 역할: 평면도/CAD → 3D 모델링 백엔드 API axios 래퍼
 *       - validate:       업로드 전 이미지 품질 사전 검증 (Stateless)
 *       - analyze:        평면도(JPG/PNG/WEBP) OpenCV 벽체 추출 (Stateless)
 *       - upload+process: CAD(DXF) / PDF / 이미지 → DB 저장 + 벽체 추출 (DB 필요)
 *       - uploadAndProcess: 두 단계를 하나로 묶고 onProgress(0-100) 통합 보고
 *
 *   진행률 모델:
 *     - axios onUploadProgress 는 0-100% 의 "전송" 단계만 보고 → 0-40% 로 매핑
 *     - 서버 처리(40-90%)는 폴링 대신 시간 기반 추정 (실제 처리 100ms~3s)
 *     - 응답 도착 시 100%
 *
 *   인증: axios interceptor (다른 API 와 동일) 가 토큰 자동 주입한다고 가정.
 */

import axios from 'axios'

const BASE = '/api/v1/floorplan'

// 클라이언트 사전 검증 — 백엔드 도달 전 거름망
export const FLOORPLAN_LIMITS = {
  IMAGE_MAX_BYTES: 25 * 1024 * 1024,  // 25MB
  IMAGE_MIN_BYTES: 50 * 1024,         // 50KB (백엔드 validate 와 동일)
  CAD_MAX_BYTES: 50 * 1024 * 1024,    // 50MB
  IMAGE_MIME: ['image/jpeg', 'image/png', 'image/webp'],
  CAD_EXT: ['.dwg', '.dxf', '.ifc'],
}

/**
 * 클라이언트 사전 검증 — 파일 크기/타입.
 * 백엔드 호출 전에 명백한 실패 케이스를 차단하여 트래픽·대기시간 절약.
 *
 * @param {File} file
 * @param {'image'|'cad'} kind
 * @returns {{ ok: boolean, error?: string }}
 */
export function preflightFloorplanFile(file, kind) {
  if (!file) return { ok: false, error: '파일이 선택되지 않았습니다.' }

  if (kind === 'image') {
    if (!FLOORPLAN_LIMITS.IMAGE_MIME.includes(file.type)) {
      return { ok: false, error: `지원하지 않는 이미지 형식입니다 (${file.type || '알 수 없음'}). JPG · PNG · WEBP 만 가능합니다.` }
    }
    if (file.size < FLOORPLAN_LIMITS.IMAGE_MIN_BYTES) {
      return { ok: false, error: `파일이 너무 작습니다 (${Math.round(file.size / 1024)}KB). 최소 50KB 이상이 필요합니다.` }
    }
    if (file.size > FLOORPLAN_LIMITS.IMAGE_MAX_BYTES) {
      return { ok: false, error: `파일이 너무 큽니다 (${Math.round(file.size / 1024 / 1024)}MB). 최대 25MB 까지 업로드 가능합니다.` }
    }
  } else if (kind === 'cad') {
    const name = (file.name || '').toLowerCase()
    const matched = FLOORPLAN_LIMITS.CAD_EXT.some((ext) => name.endsWith(ext))
    if (!matched) {
      return { ok: false, error: `지원하지 않는 CAD 형식입니다. DWG · DXF · IFC 만 가능합니다.` }
    }
    if (file.size > FLOORPLAN_LIMITS.CAD_MAX_BYTES) {
      return { ok: false, error: `파일이 너무 큽니다 (${Math.round(file.size / 1024 / 1024)}MB). 최대 50MB 까지 업로드 가능합니다.` }
    }
  }

  return { ok: true }
}

/**
 * 평면도 이미지 품질 사전 검증.
 * 해상도/선명도/대비/직선비율/직각수/기울기/벽체수 7개 항목 종합.
 *
 * @param {File} file
 * @returns {Promise<{ status: 'ok'|'warning'|'rejected', score: number, checks: object, warnings: string[], errors: string[] }>}
 */
export async function validateFloorplan(file) {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await axios.post(`${BASE}/validate`, formData)
  return data
}

/**
 * 평면도 이미지 → 벽체 좌표 추출 (Stateless, DB 미사용).
 * /employee/pre-work 의 L2 경로에서 사용.
 *
 * @param {File} file
 * @param {(percent: number) => void} [onProgress] 0-100, 업로드+추정 통합
 * @returns {Promise<{ walls: Array, outline: Array, image_width: number, image_height: number, wall_count: number }>}
 */
export async function analyzeFloorplan(file, onProgress) {
  const formData = new FormData()
  formData.append('file', file)

  let serverPhaseTimer = null
  const cleanup = () => {
    if (serverPhaseTimer) {
      clearInterval(serverPhaseTimer)
      serverPhaseTimer = null
    }
  }

  try {
    const { data } = await axios.post(`${BASE}/analyze`, formData, {
      onUploadProgress: (e) => {
        if (!onProgress || !e.total) return
        // 전송: 0-40% 구간으로 매핑
        const uploadPct = Math.round((e.loaded / e.total) * 40)
        onProgress(uploadPct)

        // 업로드 완료 시 서버 처리 단계 추정 시작 (40 → 90, 매 200ms 1.5%씩)
        if (e.loaded >= e.total && !serverPhaseTimer) {
          let p = 40
          serverPhaseTimer = setInterval(() => {
            p = Math.min(p + 1.5, 90)
            onProgress(Math.round(p))
            if (p >= 90) cleanup()
          }, 200)
        }
      },
    })
    cleanup()
    onProgress?.(100)
    return data
  } catch (err) {
    cleanup()
    throw err
  }
}

/**
 * CAD/PDF 파일 업로드 + 벽체 추출 (DB 저장).
 * /employee/pre-work 의 L1 경로에서 사용. DXF 의 LINE 엔티티를 정규화 좌표로 추출.
 *
 * @param {File} file
 * @param {(percent: number) => void} [onProgress] 0-100, 업로드+처리 통합
 * @returns {Promise<{ id, filename, status, wall_count, walls, outline }>}
 *   walls 는 정규화 0-1 좌표. outline 은 DXF 경로에서 빈 배열 반환될 수 있음.
 */
export async function uploadAndProcessCad(file, onProgress) {
  // 1단계: 파일 업로드 (0-30%)
  const uploadFd = new FormData()
  uploadFd.append('file', file)

  const uploadRes = await axios.post(`${BASE}/upload`, uploadFd, {
    onUploadProgress: (e) => {
      if (!onProgress || !e.total) return
      const pct = Math.round((e.loaded / e.total) * 30)
      onProgress(pct)
    },
  })

  const floorplanId = uploadRes.data?.id
  if (!floorplanId) {
    throw new Error('업로드 응답에 floorplan id 가 없습니다.')
  }

  onProgress?.(35)

  // 2단계: 처리 트리거 (35-90% 추정 진행)
  let processTimer = null
  const startEstimation = () => {
    let p = 35
    processTimer = setInterval(() => {
      p = Math.min(p + 2, 90)
      onProgress?.(Math.round(p))
      if (p >= 90 && processTimer) {
        clearInterval(processTimer)
        processTimer = null
      }
    }, 250)
  }
  startEstimation()

  try {
    const { data } = await axios.post(`${BASE}/${floorplanId}/process`)
    if (processTimer) {
      clearInterval(processTimer)
      processTimer = null
    }
    onProgress?.(100)
    // /process 는 outline 을 반환하지 않으므로(스키마 한계) 기본값 보장
    return {
      ...data,
      outline: data.outline ?? [],
    }
  } catch (err) {
    if (processTimer) {
      clearInterval(processTimer)
      processTimer = null
    }
    throw err
  }
}

/**
 * axios 에러를 사용자 표시용 메시지로 정규화.
 * FastAPI 의 HTTPException 응답({detail: string|object}) 을 우선 추출.
 *
 * @param {unknown} err
 * @returns {string}
 */
export function describeFloorplanError(err) {
  const detail = err?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg
  if (err?.message) return err.message
  return '알 수 없는 오류가 발생했습니다.'
}
