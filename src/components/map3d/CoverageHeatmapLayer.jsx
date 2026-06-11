/**
 * components/map3d/CoverageHeatmapLayer.jsx
 * 역할: 셀 단위 커버리지 히트맵 (captured=초록, 미수집=빨강)
 *       - missionStore.cellsByKey 의 모든 셀을 작은 박스로 렌더
 *       - 면(face) 별 시각 분리: floor 는 z 위에 평평한 패치, ceiling 도 동일,
 *         wall/window 는 정사각 패치를 vertical
 */
import React, { useMemo } from 'react'
import * as THREE from 'three'
import useMissionStore from '../../store/missionStore.js'

const SIZE_M = 0.18
const CAPTURED_COLOR = 0x33ee88
const UNCAPTURED_COLOR = 0xff5566

export default function CoverageHeatmapLayer() {
  const cells = useMissionStore((s) => s.cellsByKey)

  const list = useMemo(() => Object.values(cells), [cells])

  if (!list.length) return null
  return (
    <group>
      {list.map((c) => (
        <CellPatch key={`${c.roomIdx}-${c.cell.join('-')}`} cell={c} />
      ))}
    </group>
  )
}

function CellPatch({ cell }) {
  const color = cell.captured ? CAPTURED_COLOR : UNCAPTURED_COLOR
  // face 별 회전: floor/ceiling 은 수평, wall/window 는 수직 (yaw 없음 — 면 방향 표시는 단순화)
  const rotation = useMemo(() => {
    if (cell.faceKind === 'floor' || cell.faceKind === 'ceiling') {
      return [Math.PI / 2, 0, 0]
    }
    return [0, 0, 0]
  }, [cell.faceKind])

  return (
    <mesh position={cell.world} rotation={rotation}>
      <planeGeometry args={[SIZE_M, SIZE_M]} />
      <meshBasicMaterial color={color} transparent opacity={0.55} side={THREE.DoubleSide} />
    </mesh>
  )
}
