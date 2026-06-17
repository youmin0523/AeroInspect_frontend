/**
 * utils/buildReportDefects.js
 * 역할: 하자 보고서에 담을 검출 목록을 구성하는 공통 헬퍼.
 *       - testDetectionsStore(업로드 영상/이미지 검출) + defectStore(누적 검출) 합침
 *       - id 중복 제거 (영상 트랙 id 재사용 → 같은 하자 1건)
 *       - 보고서 양식 필드(trade/location/action_note) 보강
 *
 * 왜 공통화: ReportReadyCTA / ReportPanel / DefectPanel 의 "보고서 작성" 진입점이 같은
 *   합치기·보강 로직을 각자 복붙하고 있었음 → 한 곳으로 모아 흐름 일관성 확보.
 */
import useDefectStore from '../store/defectStore.js'
import useTestDetectionsStore from '../store/testDetectionsStore.js'
import { suggestTradeFromCode, inferInitialLocation } from '../constants/trades.js'

export function buildReportDefects() {
  const test = useTestDetectionsStore.getState().detections || []
  const main = useDefectStore.getState().defects || []
  const seen = new Set()
  const out = []
  for (const d of [...test, ...main]) {
    if (d?.id && seen.has(d.id)) continue
    if (d?.id) seen.add(d.id)
    // 열화상 영상의 RGB 모델 검출(source_channel='thermal')은 가시광 하자(걸레받이 오염 등)
    // 오탐이므로 보고서 제외. 열화상 단열 findings 는 별도 Thermal 섹션(스크리닝 '확인'분)으로 적재.
    if (d?.source_channel === 'thermal') continue
    out.push({
      ...d,
      trade: d.trade ?? suggestTradeFromCode(d.category_code),
      location: d.location ?? d.location_label ?? inferInitialLocation(d.area),
      action_note: d.action_note ?? '',
    })
  }
  return out
}

export default buildReportDefects
