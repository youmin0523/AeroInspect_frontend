/**
 * components/video/CameraToggle.jsx
 * 역할: 카메라 모드 전환 버튼 그룹
 *       - RGB / 열화상 / 블렌드 3개 버튼
 *       - 클릭 시: droneStore.setCameraMode() + POST /api/v1/stream/mode 호출
 *       - WS "camera.mode_changed" 이벤트로 다중 클라이언트 동기화
 */

import axios from 'axios'
import useDroneStore from '../../store/droneStore.js'

const MODES = [
  { value: 'rgb',     label: 'RGB',   icon: '📷' },
  { value: 'thermal', label: '열화상', icon: '🌡️' },
  { value: 'blend',   label: '블렌드', icon: '🔀' },
]

export default function CameraToggle() {
  const cameraMode = useDroneStore((s) => s.cameraMode)
  const setCameraMode = useDroneStore((s) => s.setCameraMode)

  const handleModeChange = async (mode) => {
    if (mode === cameraMode) return

    // 낙관적 업데이트: UI 즉시 반영
    setCameraMode(mode)

    // 백엔드에 모드 전환 요청 (WS 브로드캐스트 트리거)
    try {
      await axios.post('/api/v1/stream/mode', { mode })
    } catch (err) {
      console.warn('[CameraToggle] 모드 전환 실패:', err)
    }
  }

  return (
    <div className="flex items-center gap-1 bg-dashboard-bg rounded-lg p-1">
      {MODES.map((m) => (
        <button
          key={m.value}
          onClick={() => handleModeChange(m.value)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all ${
            cameraMode === m.value
              ? 'bg-brand-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-dashboard-border'
          }`}
        >
          <span>{m.icon}</span>
          <span>{m.label}</span>
        </button>
      ))}
    </div>
  )
}
