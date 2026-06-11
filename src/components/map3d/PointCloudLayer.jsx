/**
 * components/map3d/PointCloudLayer.jsx
 * 역할: SLAM 점군(colored point cloud) 실시간 시각화
 *       - missionStore.pointcloudFrames 의 모든 프레임 점군을 누적 표시
 *       - 각 점은 SLAM 이 부여한 RGB 컬러(업계 표준 colored point cloud)
 *       - 색상 정보가 없는 프레임은 폴백 회색
 *       - InstancedMesh 가 아닌 Points + BufferGeometry (대용량 효율)
 *
 * 메모리:
 *   - missionStore 가 max 30 프레임 유지 → 이 컴포넌트는 단순 합성 후 1 단일 BufferGeometry 로 렌더
 *   - 프레임 개수 변경 시 useMemo 재구성
 */
import React, { useMemo } from 'react'
import * as THREE from 'three'
import useMissionStore from '../../store/missionStore.js'

const FALLBACK_COLOR = [180, 180, 180]   // 회색

export default function PointCloudLayer({ pointSize = 0.03 }) {
  const frames = useMissionStore((s) => s.pointcloudFrames)

  const geometry = useMemo(() => {
    if (!frames.length) return null
    let totalPoints = 0
    for (const f of frames) totalPoints += (f.points?.length || 0) / 3
    if (totalPoints === 0) return null

    const positions = new Float32Array(totalPoints * 3)
    const colors = new Float32Array(totalPoints * 3)
    let pi = 0
    for (const f of frames) {
      const pts = f.points
      const cols = f.colors
      const n = (pts?.length || 0) / 3
      for (let i = 0; i < n; i += 1) {
        positions[pi * 3 + 0] = pts[i * 3 + 0]
        positions[pi * 3 + 1] = pts[i * 3 + 1]
        positions[pi * 3 + 2] = pts[i * 3 + 2]
        const r = cols && cols.length >= (i + 1) * 3 ? cols[i * 3 + 0] : FALLBACK_COLOR[0]
        const g = cols && cols.length >= (i + 1) * 3 ? cols[i * 3 + 1] : FALLBACK_COLOR[1]
        const b = cols && cols.length >= (i + 1) * 3 ? cols[i * 3 + 2] : FALLBACK_COLOR[2]
        colors[pi * 3 + 0] = r / 255
        colors[pi * 3 + 1] = g / 255
        colors[pi * 3 + 2] = b / 255
        pi += 1
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geo
  }, [frames])

  if (!geometry) return null

  return (
    <points geometry={geometry}>
      <pointsMaterial
        size={pointSize}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.95}
      />
    </points>
  )
}
