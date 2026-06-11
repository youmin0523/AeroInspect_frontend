/**
 * scripts/convert-to-webp.mjs
 * 역할: glob 으로 로드되는 폴더(hero/cases/features)의 PNG/JPG 를 WebP 로 변환 후 원본 삭제.
 *       - 해당 폴더들은 import.meta.glob('...*.{png,jpg,jpeg,webp,...}') 로 로드되므로
 *         webp 파일을 자동으로 집어 코드 변경이 전혀 필요 없다.
 *       - 정적 import(로고/일부 CTA)가 가리키는 logo/·cta/ 는 건드리지 않는다.
 *       - 결과가 더 작을 때만 webp 로 교체(원본 png 삭제). 더 크면 png 유지.
 * 실행: node scripts/convert-to-webp.mjs
 */

import { readdir, stat, readFile, writeFile, unlink } from 'node:fs/promises'
import { join, extname } from 'node:path'
import sharp from 'sharp'

// glob 으로 로드되어 확장자 변경이 안전한 폴더만.
const TARGET_DIRS = ['src/assets/hero', 'src/assets/cases', 'src/assets/features']
const SRC_EXTS = new Set(['.png', '.jpg', '.jpeg'])

async function* walk(dir) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(p)
    else yield p
  }
}

let before = 0
let after = 0
let converted = 0

for (const root of TARGET_DIRS) {
  for await (const file of walk(root)) {
    const ext = extname(file).toLowerCase()
    if (!SRC_EXTS.has(ext)) continue
    const { size } = await stat(file)
    before += size
    try {
      const input = await readFile(file)
      const out = await sharp(input, { failOn: 'none' })
        .rotate()
        .webp({ quality: 82, effort: 5 })
        .toBuffer()
      if (out.length < size) {
        const webpPath = file.slice(0, -ext.length) + '.webp'
        await writeFile(webpPath, out)
        await unlink(file) // 원본 png/jpg 제거 (glob 이 webp 를 집음)
        after += out.length
        converted++
        const pct = Math.round((1 - out.length / size) * 100)
        console.log(`  ✓ ${file} → .webp  ${(size / 1048576).toFixed(2)}MB → ${(out.length / 1048576).toFixed(2)}MB  (-${pct}%)`)
      } else {
        after += size
      }
    } catch (e) {
      after += size
      console.warn(`  ! skip ${file}: ${e.message}`)
    }
  }
}

console.log(
  `\n완료: ${converted}개 webp 변환 · ${(before / 1048576).toFixed(1)}MB → ${(after / 1048576).toFixed(1)}MB ` +
  `(-${Math.round((1 - after / before) * 100)}%)`
)
