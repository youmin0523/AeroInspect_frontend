/**
 * utils/uploadWithProgress.js
 * 역할: XHR 기반 multipart 업로드 + progress callback.
 *       fetch API는 upload progress를 표준으로 노출 안 함 (ReadableStream 우회 가능하지만 호환성 X).
 *       XMLHttpRequest는 .upload.onprogress 이벤트로 정확한 진행률 + 속도 측정 가능.
 *
 * 사용:
 *   const result = await uploadWithProgress(url, formData, (p) => {
 *     console.log(p.loaded, p.total, p.percent, p.speedKbps, p.etaSeconds)
 *   })
 */

/**
 * @param {string} url
 * @param {FormData} formData
 * @param {(p: {loaded:number,total:number,percent:number,speedKbps:number,etaSeconds:number}) => void} onProgress
 * @returns {Promise<{status:number, body:any}>}
 */
export function uploadWithProgress(url, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const startedAt = performance.now()
    let lastTick = startedAt
    let lastLoaded = 0

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return
      const now = performance.now()
      const dt = (now - lastTick) / 1000  // sec
      const dLoaded = e.loaded - lastLoaded
      // 순간 속도 (smoothing 없음 — 마지막 tick 간격 기준).
      const speedKbps = dt > 0 ? (dLoaded / 1024) / dt : 0
      // ETA — 평균 속도 기준이 더 안정적.
      const totalDt = (now - startedAt) / 1000
      const avgSpeed = totalDt > 0 ? e.loaded / totalDt : 0
      const remaining = e.total - e.loaded
      const etaSeconds = avgSpeed > 0 ? remaining / avgSpeed : 0
      lastTick = now
      lastLoaded = e.loaded
      try {
        onProgress?.({
          loaded: e.loaded,
          total: e.total,
          percent: Math.round((e.loaded / e.total) * 100),
          speedKbps: Math.round(speedKbps),
          etaSeconds: Math.round(etaSeconds),
        })
      } catch { /* 콜백 실패 무시 */ }
    }

    xhr.onload = () => {
      let body = xhr.responseText
      try { body = JSON.parse(xhr.responseText) } catch { /* plain text */ }
      resolve({ status: xhr.status, body })
    }
    xhr.onerror = () => reject(new Error('Network error'))
    xhr.onabort = () => reject(new Error('Upload aborted'))

    xhr.open('POST', url)
    xhr.send(formData)
  })
}
