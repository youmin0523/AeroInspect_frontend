/**
 * store/missionStore.js
 * 역할: 자율비행(Indoor Autonomous Inspection v1.1) 미션 전역 상태
 *       - FSM 단계 / 사전모델 정합 결과 / 미션 경로 / 셀별 captured / 점군 / 면적·커버리지
 *       - 백엔드 WebSocket 브로드캐스트(mission.phase, coverage.summary, mission.path,
 *         coverage.cell, pointcloud.delta, mission.verification_*)를 직접 흡수하는
 *         단일 진입점.
 *       - persist 안 함 — 미션은 라이브 데이터, 새로고침 시 백엔드 GET /mission/{id}/state
 *         + /coverage/mission/{id}/grid 로 재구성.
 */
import { create } from 'zustand'

const initialVerification = null   // {verdict, iou, alignment, discrepancies[], detail}
const initialAreaSummary = null    // {rooms[], grand_area, grand_coverage, supplied_*}

const useMissionStore = create((set, get) => ({
  // ── FSM 상태 ───────────────────────────────
  missionId: null,
  phase: 'idle',
  currentRoomIdx: null,
  failureReason: null,
  fcAttached: false,

  // ── VERIFICATION ───────────────────────────
  verification: initialVerification,
  verificationAlert: null,   // {iou, discrepancies} — divergent 시 사용자 확인

  // ── 미션 계획 / 셀 ─────────────────────────
  /**
   * rooms: { [roomIdx]: { spacingM, cellCount, waypoints: [
   *    { x, y, z, yaw, purpose, in_disc, faceKind, faceIdx, camPitchRad }
   * ] } }
   */
  rooms: {},
  /**
   * cellsByKey: { "<roomIdx>:<cx>:<cy>:<cz>": {
   *    roomIdx, cell:[x,y,z], world:[wx,wy,wz], faceKind, faceIdx, captured: bool
   * }}
   */
  cellsByKey: {},

  // ── 점군 ─────────────────────────────────
  /**
   * pointcloudFrames: 최근 N개 프레임만 (메모리 보호). 각 frame:
   *   { frameIdx, points: Float32Array(N*3), colors: Uint8Array(N*3), pose:[x,y,z] }
   */
  pointcloudFrames: [],
  pointcloudMaxFrames: 30,

  // ── 면적 / 커버리지 ─────────────────────
  areaSummary: initialAreaSummary,

  // ── 액션: REST 응답 흡수 ─────────────────
  applyState(stateResp) {
    if (!stateResp) return
    set({
      missionId: stateResp.mission_id ?? null,
      phase: stateResp.phase ?? 'idle',
      currentRoomIdx: stateResp.current_room_idx ?? null,
      failureReason: stateResp.failure_reason ?? null,
      fcAttached: !!stateResp.fc_attached,
      verification: stateResp.verification ?? get().verification,
    })
  },

  applyCoverageGrid(payload) {
    // GET /coverage/mission/{id}/grid 응답
    if (!payload?.cells) return
    const map = {}
    for (const c of payload.cells) {
      const key = `${c.room_idx}:${c.cell[0]}:${c.cell[1]}:${c.cell[2]}`
      map[key] = {
        roomIdx: c.room_idx,
        cell: c.cell,
        world: c.world,
        faceKind: c.face_kind,
        faceIdx: c.face_idx,
        captured: !!c.captured,
        capturedAt: c.captured_at,
      }
    }
    set({ cellsByKey: map })
  },

  applyAreaSummary(summary) {
    if (!summary) return
    set({ areaSummary: summary })
  },

  // ── 액션: WS 메시지 흡수 ─────────────────
  ingestMissionPhase(data) {
    if (!data) return
    set({
      phase: data.next ?? get().phase,
      missionId: data.mission_id ?? get().missionId,
      currentRoomIdx: data.current_room_idx ?? get().currentRoomIdx,
    })
  },

  ingestVerificationResult(data) {
    set({ verification: data })
  },

  ingestVerificationAlert(data) {
    set({ verificationAlert: data })
  },

  ingestPath(data) {
    if (!Array.isArray(data?.rooms)) return
    const rooms = {}
    for (const r of data.rooms) {
      rooms[r.room_idx] = {
        spacingM: r.spacing_m,
        cellCount: r.cell_count,
        waypoints: (r.waypoints || []).map((w) => ({
          x: w.x, y: w.y, z: w.z,
          yaw: w.yaw, purpose: w.purpose,
          inDiscrepancy: !!w.in_disc,
          faceKind: w.face_kind || 'wall',
          faceIdx: w.face_idx ?? 0,
          camPitchRad: w.cam_pitch_rad ?? 0,
          // cellIdx 보존 — MissionPathLayer 가 cellsByKey 매칭에 사용
          cellIdx: Array.isArray(w.cell_idx) ? w.cell_idx : null,
        })),
      }
    }
    set({ rooms })
  },

  ingestCellCaptured(data) {
    if (!data?.cell) return
    const key = `${data.room_idx}:${data.cell[0]}:${data.cell[1]}:${data.cell[2]}`
    const cellsByKey = { ...get().cellsByKey }
    cellsByKey[key] = {
      ...(cellsByKey[key] || {}),
      roomIdx: data.room_idx,
      cell: data.cell,
      world: data.world,
      faceKind: data.face_kind,
      faceIdx: data.face_idx,
      captured: true,
      capturedAt: new Date().toISOString(),
    }
    set({ cellsByKey })
  },

  ingestPointcloudDelta(data) {
    if (!data?.points) return
    const points = new Float32Array(data.points.flat())
    const colors = data.colors?.length
      ? new Uint8Array(data.colors.flat())
      : new Uint8Array(0)
    const frame = {
      frameIdx: data.frame_idx ?? 0,
      points, colors,
      pose: data.pose ?? null,
    }
    const frames = [...get().pointcloudFrames, frame]
    while (frames.length > get().pointcloudMaxFrames) frames.shift()
    set({ pointcloudFrames: frames })
  },

  ingestAreaSummary(summary) {
    if (!summary) return
    set({ areaSummary: summary })
  },

  // ── 리셋 ──────────────────────────────────
  resetMission() {
    set({
      missionId: null, phase: 'idle', currentRoomIdx: null,
      failureReason: null, verification: null, verificationAlert: null,
      rooms: {}, cellsByKey: {}, pointcloudFrames: [], areaSummary: null,
    })
  },
}))

export default useMissionStore
