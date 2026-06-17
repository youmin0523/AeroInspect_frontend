/**
 * utils/buildThermalFindings.js
 * 역할: 보고서의 별도 'Thermal(단열) 섹션'에 담을 열화상 단열 findings 를 구성.
 *       - thermalScreeningStore 의 스크리닝 항목 중 점검자가 '확인(confirmed)' 한 것만.
 *       - 본 검출(RGB) 과 분리 — 열화상은 의사색 스크리닝이라 RGB 보고서에 섞지 않는다.
 *
 * 왜 confirmed 만: 스크리닝은 휴리스틱(미확정)이라 전부 넣으면 노이즈. 점검자가 검수 모달에서
 *   '확인' 한 의심부만 보고서에 등재한다(사용자 결정).
 */
import useThermalScreeningStore from '../store/thermalScreeningStore.js'

// kind → 보고서 표기명
export const THERMAL_KIND_LABEL = {
  spot: '점형 (열교·결로 의심)',
  patch: '면형 (저온역)',
}

export function buildThermalFindings() {
  const { items, reviews } = useThermalScreeningStore.getState()
  const out = []
  for (const it of items) {
    const r = reviews?.[it.id]
    if (r?.review_status !== 'confirmed') continue
    out.push({
      id: it.id,
      kind: it.kind,                       // 'spot' | 'patch'
      kind_label: THERMAL_KIND_LABEL[it.kind] ?? '단열 의심',
      severity: it.severity ?? 'MED',      // HIGH/MED/LOW
      score: typeof it.score === 'number' ? it.score : null,
      video_timestamp_sec: it.video_timestamp_sec ?? null,
      bbox: it.bbox ?? null,
      note: r.review_note ?? '',
    })
  }
  out.sort((a, b) => (a.video_timestamp_sec ?? 0) - (b.video_timestamp_sec ?? 0))
  return out
}

export default buildThermalFindings
