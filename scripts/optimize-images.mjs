/**
 * scripts/optimize-images.mjs
 * 역할: src/assets 의 과대 이미지를 표시 크기에 맞게 리사이즈 + 재압축(제자리 덮어쓰기).
 *       - 파일명/포맷 유지 → 코드의 import 경로 변경 불필요.
 *       - 최대 너비 1920px(그 이하는 리사이즈 안 함), PNG 최대 압축.
 *       - 결과가 더 작을 때만 덮어쓴다(이미 최적화된 파일 보호).
 *       - git 추적 파일이라 `git checkout -- src/assets` 로 언제든 복구 가능.
 * 실행: node scripts/optimize-images.mjs
 */

import { readdir, stat, readFile, writeFile } from 'node:fs/promises'
import { join, extname } from 'node:path'
import sharp from 'sharp'

const ROOT = 'src/assets'
const MAX_WIDTH = 1920
const MIN_BYTES = 200 * 1024 // 200KB 미만은 손대지 않음
const EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp'])

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(p)
    else yield p
  }
}

function reencode(img, ext) {
  if (ext === '.png') return img.png({ compressionLevel: 9, effort: 10 })
  if (ext === '.webp') return img.webp({ quality: 82 })
  return img.jpeg({ quality: 82, mozjpeg: true })
}

let totalBefore = 0
let totalAfter = 0
let changed = 0

for await (const file of walk(ROOT)) {
  const ext = extname(file).toLowerCase()
  if (!EXTS.has(ext)) continue
  const { size } = await stat(file)
  if (size < MIN_BYTES) continue
  totalBefore += size

  try {
    const input = await readFile(file)
    const img = sharp(input, { failOn: 'none' })
    const meta = await img.metadata()
    let pipe = img.rotate() // EXIF 방향 보정
    if (meta.width && meta.width > MAX_WIDTH) {
      pipe = pipe.resize({ width: MAX_WIDTH, withoutEnlargement: true })
    }
    const out = await reencode(pipe, ext).toBuffer()

    if (out.length < size) {
      await writeFile(file, out)
      totalAfter += out.length
      changed++
      const pct = Math.round((1 - out.length / size) * 100)
      console.log(`  ✓ ${file}  ${(size / 1048576).toFixed(1)}MB → ${(out.length / 1048576).toFixed(1)}MB  (-${pct}%)`)
    } else {
      totalAfter += size
    }
  } catch (e) {
    totalAfter += size
    console.warn(`  ! skip ${file}: ${e.message}`)
  }
}

console.log(
  `\n완료: ${changed}개 최적화 · ${(totalBefore / 1048576).toFixed(1)}MB → ${(totalAfter / 1048576).toFixed(1)}MB ` +
  `(-${Math.round((1 - totalAfter / totalBefore) * 100)}%)`
)
