/**
 * utils/imageDownsample.js
 * 역할: 클라이언트 측 이미지 다운샘플 — 4K → 1280 long-edge JPEG.
 *       - canvas drawImage로 리사이즈 (네이티브 GPU 가속)
 *       - JPEG 0.85 품질 — 검출용으로 충분, 사이즈 80~95% 절감
 *       - 업로드 시간 직접 단축 + Fly.io 1GB 머신 RAM 압박 완화
 *
 * 영상은 다운샘플 안 함 — ffmpeg.wasm은 ~30MB 다운로드 + 초기 로딩 무거워서
 * 단발 사용 ROI 낮음. 영상은 backend chunk 스트리밍 그대로.
 */

const MAX_LONG_EDGE = 1280
const JPEG_QUALITY = 0.85

/**
 * 이미지 파일을 canvas로 리사이즈해 새 File 반환.
 * 입력이 long-edge ≤ MAX_LONG_EDGE면 원본 그대로 반환 (불필요 변환 회피).
 * 영상은 그대로 통과.
 *
 * @param {File} file - 원본 파일
 * @returns {Promise<File>} 다운샘플된 (또는 원본) File
 */
export async function maybeDownsampleImage(file) {
  if (!file.type.startsWith('image/')) return file
  // SVG는 vector라 다운샘플 의미 없음 + canvas 처리 시 외부 리소스 보안 이슈.
  if (file.type === 'image/svg+xml') return file

  try {
    const bitmap = await createImageBitmap(file)
    const longEdge = Math.max(bitmap.width, bitmap.height)
    if (longEdge <= MAX_LONG_EDGE) {
      bitmap.close?.()
      return file  // 이미 충분히 작음
    }
    const scale = MAX_LONG_EDGE / longEdge
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()

    // canvas → Blob (JPEG)
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    )
    if (!blob) return file
    // 원본 파일명 유지하되 확장자 .jpg로 (브라우저 일부가 mime mismatch 거부)
    const baseName = file.name.replace(/\.[^.]+$/, '')
    return new File([blob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })
  } catch (e) {
    // createImageBitmap 실패(HEIC, 손상 파일 등) → 원본 그대로
    console.warn('[imageDownsample] 다운샘플 실패, 원본 유지:', e?.message || e)
    return file
  }
}

/**
 * 다중 파일 처리 — 이미지만 다운샘플, 영상은 그대로.
 */
export async function maybeDownsampleAll(files) {
  return Promise.all(Array.from(files).map(maybeDownsampleImage))
}
