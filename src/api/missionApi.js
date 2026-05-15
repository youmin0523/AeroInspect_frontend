/**
 * api/missionApi.js
 * 역할: L3 자율비행 + LiDAR 스캔 미션 제어 axios 래퍼
 *       - startAutonomousScan: 미션 시작 → mission_id 반환
 *       - getMissionStatus:    폴링 폴백 (주된 진행은 WS)
 *       - cancelMission:       사용자 취소
 *       - listMissions:        디버깅용 활성 미션 목록
 *
 *   미션 진행은 WebSocket 'defects' 채널로 발행되는 다음 이벤트로 추적:
 *     - 'telemetry.update'   → droneStore.updateTelemetry
 *     - 'lidar.points'       → droneStore.appendLidarPoints
 *     - 'mission.completed'  → droneStore.endMission + LiDAR 누적 마무리
 *     - 'mission.failed'     → 에러 표시
 */

import axios from 'axios'

const BASE = '/api/v1/missions'

/**
 * @param {{
 *   floorplanId?: string,
 *   walls?: Array<{x1,y1,x2,y2}>,
 *   outline?: Array<{x,y}>,
 *   furniture?: Array<{cx,cy,w,h,angle,label}>,  // 충돌 회피 — 드론이 가구 우회 + LiDAR raycast 대상
 *   imageWidth?: number,
 *   imageHeight?: number,
 *   scalePxPerMeter?: number,
 *   worldW?: number,
 *   worldD?: number,
 *   altitude?: number,
 *   speed?: number,
 *   altitudeLayers?: number[],     // 다층 sweep e.g. [0.4, 1.5, 2.5] = 걸레받이/일반/천장
 *   laneSpacing?: number,          // 격자 라인 간격(m) — 기본 0.5
 *   ceilingHeight?: number,        // 천장 높이(m) — 기본 2.7
 * }} opts
 * @returns {Promise<{ mission_id: string, walls_count: number, furniture_count: number, world_w: number, world_d: number, size_source: string, estimated_duration_s: number }>}
 */
export async function startAutonomousScan(opts = {}) {
  const payload = {
    floorplan_id: opts.floorplanId,
    walls: opts.walls,
    outline: opts.outline ?? [],
    furniture: opts.furniture ?? [],
    image_width: opts.imageWidth,
    image_height: opts.imageHeight,
    scale_px_per_meter: opts.scalePxPerMeter,
    world_w: opts.worldW,
    world_d: opts.worldD,
    altitude: opts.altitude ?? 1.5,
    speed: opts.speed ?? 0.8,
    altitude_layers: opts.altitudeLayers,
    lane_spacing: opts.laneSpacing ?? 0.5,
    ceiling_height: opts.ceilingHeight ?? 2.7,
  }
  const { data } = await axios.post(`${BASE}/autonomous-scan/start`, payload)
  return data
}

export async function getMissionStatus(missionId) {
  const { data } = await axios.get(`${BASE}/${missionId}`)
  return data
}

export async function cancelMission(missionId) {
  const { data } = await axios.post(`${BASE}/${missionId}/cancel`)
  return data
}

export async function listMissions() {
  const { data } = await axios.get(BASE)
  return data
}
