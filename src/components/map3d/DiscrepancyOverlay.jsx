/**
 * components/map3d/DiscrepancyOverlay.jsx
 * 역할: 도면(사전모델) ↔ SLAM 차이영역(discrepancies) 시각화
 *       - kind="added" : SLAM 에 새로 발견된 영역(빨강)
 *       - kind="missing": 도면에 있지만 실제 없는 영역(주황 점선 느낌 — 본 구현은 단색 반투명)
 *       - 각 폴리곤은 z=floor 평면에 깔린 평면 메시로 표시 + 정점에서 위쪽 라인 (실루엣)
 *       - missionStore.verification 에서 가져옴
 */
import React, { useMemo } from 'react'
import * as THREE from 'three'
import useMissionStore from '../../store/missionStore.js'

const COLOR_ADDED = 0xff3344    // 진한 빨강
const COLOR_MISSING = 0xff9933  // 주황
const HEIGHT_M = 2.0            // 위로 그리는 라인 높이

export default function DiscrepancyOverlay({ floorZ = 0.02 }) {
  const verification = useMissionStore((s) => s.verification)
  const polys = verification?.discrepancies || []
  if (!polys.length) return null
  return (
    <group>
      {polys.map((d, idx) => (
        <DiscrepancyShape
          key={idx}
          polygon={d.polygon}
          kind={d.kind}
          floorZ={floorZ}
        />
      ))}
    </group>
  )
}

function DiscrepancyShape({ polygon, kind, floorZ }) {
  const color = kind === 'missing' ? COLOR_MISSING : COLOR_ADDED

  const geometry = useMemo(() => {
    if (!polygon || polygon.length < 3) return null
    const shape = new THREE.Shape()
    shape.moveTo(polygon[0][0], polygon[0][1])
    for (let i = 1; i < polygon.length; i += 1) {
      shape.lineTo(polygon[i][0], polygon[i][1])
    }
    shape.closePath()
    return new THREE.ShapeGeometry(shape)
  }, [polygon])

  const linePositions = useMemo(() => {
    if (!polygon || polygon.length < 2) return null
    const arr = []
    for (const p of polygon) {
      arr.push(p[0], p[1], floorZ)
      arr.push(p[0], p[1], floorZ + HEIGHT_M)
    }
    return new Float32Array(arr)
  }, [polygon, floorZ])

  const lineGeo = useMemo(() => {
    if (!linePositions) return null
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
    return g
  }, [linePositions])

  if (!geometry) return null
  return (
    <group>
      <mesh
        geometry={geometry}
        position={[0, 0, floorZ]}
        rotation={[-Math.PI / 2, 0, 0]}   // XY 평면을 바닥에 깔기
      >
        <meshBasicMaterial color={color} transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>
      {lineGeo && (
        <lineSegments geometry={lineGeo}>
          <lineBasicMaterial color={color} transparent opacity={0.7} />
        </lineSegments>
      )}
    </group>
  )
}
