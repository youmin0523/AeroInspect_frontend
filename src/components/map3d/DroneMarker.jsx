/**
 * components/map3d/DroneMarker.jsx
 * 역할: 3D 미니맵 상 드론 실시간 위치 아이콘 + 비행 경로 폴리라인
 *       - droneStore.telemetry 의 x/y/z + yaw 구독
 *       - missionStatus === 'flying' 일 때 위치 히스토리를 축적 → Line 으로 경로 렌더
 *       - 드론 아이콘: cone + 4 프로펠러 + Billboard ID 라벨
 *       - 고도 라인: 드론 위치에서 바닥까지 점선
 *
 *   좌표 매핑: 텔레메트리(X/Y 평면 + Z 고도) → Three.js(X/Z 평면 + Y 위)
 */

import { useRef, useEffect } from 'react'
import { Billboard, Html, Line } from '@react-three/drei'
import useDroneStore from '../../store/droneStore.js'

// 경로 히스토리 최대 포인트 수 — 너무 많으면 성능 저하
const MAX_PATH_POINTS = 500
// 최소 이동 거리(씬 좌표) — 미세 진동 필터링
const MIN_MOVE_DIST = 0.05

export default function DroneMarker() {
  const telemetry = useDroneStore((s) => s.telemetry)
  const selectedDroneId = useDroneStore((s) => s.selectedDroneId)
  const missionStatus = useDroneStore((s) => s.missionStatus)

  // 텔레메트리 → Three 좌표 매핑
  const px = telemetry.x ?? 0
  const py = telemetry.z ?? 1.5 // 고도
  const pz = telemetry.y ?? 0
  const yawRad = ((telemetry.yaw ?? 0) * Math.PI) / 180

  const accent = missionStatus === 'flying' ? '#10b981' : '#64748b'

  // ── 비행 경로 히스토리 ──
  const pathRef = useRef([])
  const lastPosRef = useRef(null)

  // 미션 시작 시 경로 초기화
  useEffect(() => {
    if (missionStatus === 'flying') {
      pathRef.current = []
      lastPosRef.current = null
    }
  }, [missionStatus])

  // 비행 중 위치 축적
  if (missionStatus === 'flying') {
    const last = lastPosRef.current
    const moved = !last || Math.hypot(px - last[0], py - last[1], pz - last[2]) > MIN_MOVE_DIST
    if (moved) {
      pathRef.current.push([px, py, pz])
      if (pathRef.current.length > MAX_PATH_POINTS) {
        pathRef.current = pathRef.current.slice(-MAX_PATH_POINTS)
      }
      lastPosRef.current = [px, py, pz]
    }
  }

  const pathPoints = pathRef.current

  return (
    <>
      {/* 비행 경로 폴리라인 — 비행 중 + 종료 후에도 표시 */}
      {pathPoints.length >= 2 && (
        <Line
          points={pathPoints}
          color="#10b981"
          lineWidth={1.5}
          dashed
          dashScale={8}
          dashSize={0.3}
          dashOffset={0}
          transparent
          opacity={0.7}
        />
      )}

      {/* 바닥에 경로 그림자 (고도 제거한 2D 투영) */}
      {pathPoints.length >= 2 && (
        <Line
          points={pathPoints.map(([x, , z]) => [x, 0.05, z])}
          color="#10b981"
          lineWidth={1}
          transparent
          opacity={0.2}
        />
      )}

      {/* 드론 아이콘 */}
      <group position={[px, py, pz]} rotation={[0, yawRad, 0]}>
        {/* 본체 (cone) */}
        <mesh rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.18, 0.5, 12]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.4} />
        </mesh>

        {/* 4개 프로펠러 */}
        {[
          [ 0.35,  0.35],
          [ 0.35, -0.35],
          [-0.35,  0.35],
          [-0.35, -0.35],
        ].map(([dx, dz], i) => (
          <mesh key={i} position={[dx, 0.08, dz]}>
            <cylinderGeometry args={[0.15, 0.15, 0.02, 16]} />
            <meshStandardMaterial color="#1e293b" transparent opacity={0.7} />
          </mesh>
        ))}

        {/* 고도 라인 (드론 → 바닥) */}
        <mesh position={[0, -py / 2, 0]}>
          <cylinderGeometry args={[0.01, 0.01, Math.max(py, 0.01), 4]} />
          <meshBasicMaterial color={accent} transparent opacity={0.35} />
        </mesh>

        {/* ID 라벨 */}
        <Billboard position={[0, 0.6, 0]}>
          <Html center distanceFactor={10}>
            <div
              className="px-1.5 py-0.5 rounded bg-slate-900/80 border text-[9px] font-mono tracking-wider whitespace-nowrap"
              style={{ color: accent, borderColor: accent + '99' }}
            >
              {selectedDroneId.replace('drone-0', 'D')} · {(telemetry.z ?? 0).toFixed(1)}m
            </div>
          </Html>
        </Billboard>
      </group>
    </>
  )
}
