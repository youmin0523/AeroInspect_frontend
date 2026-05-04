/**
 * store/droneStore.js
 * 역할: 드론 텔레메트리 및 연결 상태 전역 관리 (Zustand)
 *       - telemetry: 드론 위치·자세·배터리 실시간 데이터
 *       - connectionStatus: WebSocket 연결 상태
 *       - cameraMode: 현재 활성 카메라 모드 (rgb/thermal/blend)
 *       - selectedDroneId: 관제 중인 드론(화면/카메라 소스 결정)
 *       - setSelectedDrone: 드론 선택 시 cameraMode 자동 매핑
 *         (drone-01 → rgb, drone-02 → thermal)
 */

import { create } from 'zustand'

// //* [Modified Code] 드론별 고정 카메라 매핑 — 풀스크린 HUD 레이아웃 도입 라운드에서 추가.
// DB 미연결 단계에서 "드론 선택 = 카메라 모드" 규칙을 UI에 내재화하기 위한 장치.
// 추후 드론별 카메라 구성이 가변이 되면 drones 배열에 cameraMode 필드로 이관.
export const DRONE_CAMERA_MAP = {
  'drone-01': 'rgb',
  'drone-02': 'thermal',
}

const useDroneStore = create((set, get) => ({
  // ── 연결 상태 ────────────────────────────
  connectionStatus: 'disconnected', // 'connecting' | 'connected' | 'disconnected' | 'error'

  // ── 드론 텔레메트리 ──────────────────────
  telemetry: {
    x: 0,           // 월드 좌표 X (m)
    y: 0,           // 월드 좌표 Y (m)
    z: 0,           // 고도 (m)
    roll: 0,        // 롤 각도 (deg)
    pitch: 0,       // 피치 각도 (deg)
    yaw: 0,         // 요 각도 (deg)
    battery: 100,   // 배터리 잔량 (%)
    speed: 0,       // 속도 (m/s)
    distance: null, // LiDAR 거리 (m)
    armed: false,   // 모터 암드 여부
    mode: 'MANUAL', // 비행 모드
  },

  // ── 카메라 모드 ──────────────────────────
  // 'rgb': RGB 카메라 단독
  // 'thermal': 열화상 카메라 단독
  // 'blend': RGB + 열화상 합성
  cameraMode: 'rgb',

  // ── 선택된 드론 ──────────────────────────
  // 풀스크린 HUD에서 "현재 관제 중"인 드론 ID. 카메라 모드와 1:1 연동.
  selectedDroneId: 'drone-01',

  // ── 미션 상태 ──────────────────────────
  // 풀 워크플로우(세션 → 모델링 → 대시보드 → 비행) 중 "비행 단계" 상태.
  // 'idle': 아직 START 안 함 / 'flying': 비행 중 / 'ended': 종료 후 리포트 대기
  missionStatus: 'idle',
  missionStartedAt: null,
  missionEndedAt: null,

  // ── Actions ─────────────────────────────

  /** WebSocket 연결 상태 업데이트 */
  setConnectionStatus: (status) => set({ connectionStatus: status }),

  /** 드론 텔레메트리 업데이트 (WS "telemetry.update" 이벤트) */
  updateTelemetry: (data) =>
    set((state) => ({
      telemetry: { ...state.telemetry, ...data },
    })),

  /**
   * 카메라 모드 전환.
   * CameraToggle.jsx에서 호출 → POST /api/v1/stream/mode API도 함께 호출.
   */
  setCameraMode: (mode) => {
    if (!['rgb', 'thermal', 'blend'].includes(mode)) return
    set({ cameraMode: mode })
  },

  /** WS "camera.mode_changed" 이벤트 수신 시 동기화 */
  syncCameraMode: (mode) => set({ cameraMode: mode }),

  /**
   * 선택 드론 전환 + 카메라 모드 자동 매핑.
   * DronesPanel 에서 호출. DRONE_CAMERA_MAP 기반으로 cameraMode 도 함께 set.
   */
  setSelectedDrone: (id) => {
    if (!DRONE_CAMERA_MAP[id]) return
    if (get().selectedDroneId === id) return
    set({
      selectedDroneId: id,
      cameraMode: DRONE_CAMERA_MAP[id],
    })
  },

  /** 비행 시작 — MissionControl(START) 에서 호출 */
  startMission: () => {
    if (get().missionStatus === 'flying') return
    set({ missionStatus: 'flying', missionStartedAt: Date.now(), missionEndedAt: null })
  },

  /** 비행 종료 — MissionControl(END) 에서 호출 → 리포트 오버레이 트리거 */
  endMission: () => {
    if (get().missionStatus !== 'flying') return
    set({ missionStatus: 'ended', missionEndedAt: Date.now() })
  },

  /** 전체 초기화 */
  reset: () =>
    set({
      connectionStatus: 'disconnected',
      telemetry: {
        x: 0, y: 0, z: 0,
        roll: 0, pitch: 0, yaw: 0,
        battery: 100, speed: 0,
        distance: null, armed: false, mode: 'MANUAL',
      },
      cameraMode: 'rgb',
      selectedDroneId: 'drone-01',
      missionStatus: 'idle',
      missionStartedAt: null,
      missionEndedAt: null,
    }),
}))

export default useDroneStore
