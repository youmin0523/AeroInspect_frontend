/**
 * components/layout/DroneStatusCard.jsx
 * 역할: 드론 실시간 텔레메트리 카드 (레퍼런스 우하단 드론 카드 스타일)
 *       - //! [Original Code] 기존에는 Header 우측에 텔레메트리가 나열되어 있었음
 *       - //* [Modified Code] 별도 위치(Dashboard 내부 카드)로 이동해 시인성 ↑
 *       - 배터리/고도/속도/모드 + ACTIVE/IDLE 상태 뱃지
 *       - 미션 진행률 바(향후 mission store 연동 예정, 현재는 배터리 진행률로 대체)
 */

import useDroneStore from '../../store/droneStore.js'

export default function DroneStatusCard() {
  const telemetry = useDroneStore((s) => s.telemetry)
  const connectionStatus = useDroneStore((s) => s.connectionStatus)

  const isActive = connectionStatus === 'connected' && telemetry.armed
  const batteryLow = telemetry.battery < 20

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* Drone-01 (현재 연결된 드론) */}
      <div className={`rounded-xl border p-4 shadow-2xl backdrop-blur-md transition-colors ${
        isActive
          ? 'bg-dashboard-surface/90 border-accent-500/40 hover:border-accent-500/70'
          : 'bg-dashboard-surface/90 border-slate-700 hover:border-slate-500'
      }`}>
        <div className="flex justify-between items-center mb-3">
          <span className={`text-xs font-bold uppercase tracking-wider ${
            isActive ? 'text-accent-400' : 'text-slate-300'
          }`}>
            DRONE-01
          </span>
          <span className={isActive ? 'badge-active' : 'badge-idle'}>
            {isActive ? 'ACTIVE' : 'STANDBY'}
          </span>
        </div>

        {/* 텔레메트리 그리드 */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <TelemetryItem label="고도" value={`${telemetry.z.toFixed(1)}m`} />
          <TelemetryItem label="속도" value={`${telemetry.speed.toFixed(1)}m/s`} />
          <TelemetryItem label="모드" value={telemetry.mode} />
          <TelemetryItem
            label="배터리"
            value={`${telemetry.battery}%`}
            valueClass={batteryLow ? 'text-red-400' : 'text-accent-400'}
          />
        </div>

        {/* 배터리 진행률 바 (레퍼런스의 미션 진행률 자리 — TODO: mission store 연동) */}
        <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              batteryLow
                ? 'bg-red-500'
                : 'bg-accent-500'
            }`}
            style={{ width: `${telemetry.battery}%` }}
          />
        </div>
      </div>

      {/* Drone-02 (플레이스홀더 — 멀티 드론 확장용) */}
      <div className="rounded-xl border border-slate-700 p-4 shadow-lg bg-dashboard-surface/70 opacity-70">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            DRONE-02
          </span>
          <span className="badge-idle">IDLE</span>
        </div>
        <div className="text-xs text-slate-500 mb-2 font-mono">STANDBY MODE</div>
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div className="bg-slate-600 h-full w-0" />
        </div>
      </div>
    </div>
  )
}

function TelemetryItem({ label, value, valueClass = 'text-slate-200' }) {
  return (
    <div className="flex flex-col">
      <span className="text-slate-500 text-[10px] uppercase tracking-wider">{label}</span>
      <span className={`font-mono text-xs font-semibold ${valueClass}`}>{value}</span>
    </div>
  )
}
