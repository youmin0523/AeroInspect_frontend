/**
 * components/map3d/MissionPathLayer.jsx
 * 역할: 자율비행 그리드 경로 시각화 (룸별 보스트로페돈 + 4면 분류 색상)
 *       - 면(face) 종류별 컬러: wall=시안, ceiling=노랑, floor=초록, window=마젠타
 *       - 차이영역(in_disc) 은 빨강 강조 + 약간 굵게
 *       - 다음 WP(현재 currentRoomIdx 의 첫 미수집 WP)는 펄스 효과 (간단한 highlight)
 */
import React, { useMemo } from 'react'
import * as THREE from 'three'
import useMissionStore from '../../store/missionStore.js'

const FACE_COLORS = {
  wall: 0x33ccff,
  ceiling: 0xffcc33,
  floor: 0x33ff88,
  window: 0xff66ff,
}
const DISC_COLOR = 0xff3344

export default function MissionPathLayer() {
  const rooms = useMissionStore((s) => s.rooms)
  const cellsByKey = useMissionStore((s) => s.cellsByKey)

  const segments = useMemo(() => {
    const lines = []
    for (const [roomIdxStr, room] of Object.entries(rooms)) {
      const wps = room.waypoints || []
      for (let i = 0; i < wps.length - 1; i += 1) {
        const a = wps[i], b = wps[i + 1]
        const color = a.inDiscrepancy ? DISC_COLOR : FACE_COLORS[a.faceKind] || 0xcccccc
        lines.push({ a, b, color })
      }
    }
    return lines
  }, [rooms])

  const dotsGeometry = useMemo(() => {
    const positions = []
    const colors = []
    for (const [roomIdxStr, room] of Object.entries(rooms)) {
      const roomIdx = Number(roomIdxStr)
      for (const wp of room.waypoints || []) {
        const ci = wp.cellIdx
        const key = ci ? `${roomIdx}:${ci[0]}:${ci[1]}:${ci[2]}` : null
        const captured = key ? cellsByKey[key]?.captured : false
        positions.push(wp.x, wp.y, wp.z)
        const baseColor = wp.inDiscrepancy
          ? new THREE.Color(DISC_COLOR)
          : new THREE.Color(FACE_COLORS[wp.faceKind] || 0xcccccc)
        // captured 셀은 더 어둡게(이미 끝난 것 표시)
        if (captured) baseColor.multiplyScalar(0.4)
        colors.push(baseColor.r, baseColor.g, baseColor.b)
      }
    }
    if (!positions.length) return null
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3))
    return geo
  }, [rooms, cellsByKey])

  return (
    <group>
      {/* 라인 세그먼트 */}
      {segments.map((s, idx) => (
        <Line key={idx} a={s.a} b={s.b} color={s.color} />
      ))}
      {/* WP 도트 (captured 와 미수집 색상 다름) */}
      {dotsGeometry && (
        <points geometry={dotsGeometry}>
          <pointsMaterial size={0.06} sizeAttenuation vertexColors />
        </points>
      )}
    </group>
  )
}

function Line({ a, b, color }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array([a.x, a.y, a.z, b.x, b.y, b.z])
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return g
  }, [a, b])
  return (
    <line geometry={geo}>
      <lineBasicMaterial color={color} linewidth={1} transparent opacity={0.8} />
    </line>
  )
}
