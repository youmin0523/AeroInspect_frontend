/**
 * components/map3d/BuildingMesh.jsx
 * 역할: 3D 건물 지오메트리 — Level 별 3가지 스타일 분기
 *       - L1 (CAD): 얇은 박스 벽 4개 + 치수 라벨(Html) — "도면 유래" 정밀 느낌
 *       - L2 (평면도): 바닥 planeGeometry 에 업로드 이미지 텍스처 + 벽 extrude
 *       - L3 (자율비행): 5000점 랜덤 point cloud — "SLAM 스캔" 느낌
 *       - 기본(세션 없이 진입 시): 기존 와이어프레임 박스 (폴백)
 *
 *   //* [Modified Code] 원래는 단일 박스 메시였으나 세션 기반 워크플로우 도입으로 L1/L2/L3 3-분기
 */

import { useMemo } from 'react'
import { Html, useTexture } from '@react-three/drei'
import * as THREE from 'three'

const WIDTH = 10
const DEPTH = 8
const HEIGHT = 3

// 공통 바닥 + 그리드
function FloorAndGrid({ floorColor = '#1e293b' }) {
  return (
    <>
      <mesh position={[0, 0, 0]} receiveShadow>
        <boxGeometry args={[WIDTH, 0.1, DEPTH]} />
        <meshStandardMaterial color={floorColor} />
      </mesh>
      <gridHelper args={[Math.max(WIDTH, DEPTH) + 4, 20, '#1e3a8a', '#1e293b']} position={[0, 0.06, 0]} />
    </>
  )
}

// L1: CAD — 박스 벽 4개 + 치수 라벨
function LevelOneMesh() {
  const wallThickness = 0.15
  const wallMat = <meshStandardMaterial color="#475569" />
  return (
    <group>
      <FloorAndGrid />
      {/* 북/남 벽 */}
      <mesh position={[0, HEIGHT / 2, -DEPTH / 2]}>
        <boxGeometry args={[WIDTH, HEIGHT, wallThickness]} />
        {wallMat}
      </mesh>
      <mesh position={[0, HEIGHT / 2, DEPTH / 2]}>
        <boxGeometry args={[WIDTH, HEIGHT, wallThickness]} />
        {wallMat}
      </mesh>
      {/* 동/서 벽 */}
      <mesh position={[-WIDTH / 2, HEIGHT / 2, 0]}>
        <boxGeometry args={[wallThickness, HEIGHT, DEPTH]} />
        {wallMat}
      </mesh>
      <mesh position={[WIDTH / 2, HEIGHT / 2, 0]}>
        <boxGeometry args={[wallThickness, HEIGHT, DEPTH]} />
        {wallMat}
      </mesh>

      {/* 치수 라벨 — CAD 느낌 */}
      <Html position={[0, 0.05, DEPTH / 2 + 0.4]} center distanceFactor={10}>
        <span className="text-[10px] font-mono text-accent-300 bg-slate-900/70 px-1.5 py-0.5 rounded border border-accent-500/30 whitespace-nowrap">
          {WIDTH.toFixed(1)}m
        </span>
      </Html>
      <Html position={[WIDTH / 2 + 0.4, 0.05, 0]} center distanceFactor={10}>
        <span className="text-[10px] font-mono text-accent-300 bg-slate-900/70 px-1.5 py-0.5 rounded border border-accent-500/30 whitespace-nowrap">
          {DEPTH.toFixed(1)}m
        </span>
      </Html>
      <Html position={[-WIDTH / 2 - 0.4, HEIGHT / 2, 0]} center distanceFactor={10}>
        <span className="text-[10px] font-mono text-accent-300 bg-slate-900/70 px-1.5 py-0.5 rounded border border-accent-500/30 whitespace-nowrap">
          {HEIGHT.toFixed(1)}m
        </span>
      </Html>
    </group>
  )
}

// 건물 외곽 윤곽선 → 유리 경계 벽 (창호 갭을 반투명 유리로 채움)
function OutlineBoundary({ outline }) {
  const segments = useMemo(() => {
    if (!outline || outline.length < 3) return null
    return outline.map((pt, i) => {
      const next = outline[(i + 1) % outline.length]
      const x1 = (pt.x - 0.5) * WIDTH
      const z1 = (pt.y - 0.5) * DEPTH
      const x2 = (next.x - 0.5) * WIDTH
      const z2 = (next.y - 0.5) * DEPTH

      const midX = (x1 + x2) / 2
      const midZ = (z1 + z2) / 2
      const length = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2)
      const angle = Math.atan2(z2 - z1, x2 - x1)

      if (length < 0.05) return null

      return (
        <mesh
          key={`outline-${i}`}
          position={[midX, HEIGHT / 2, midZ]}
          rotation={[0, -angle, 0]}
        >
          <boxGeometry args={[length, HEIGHT, 0.04]} />
          <meshStandardMaterial
            color="#38bdf8"
            transparent
            opacity={0.18}
            side={THREE.DoubleSide}
          />
        </mesh>
      )
    })
  }, [outline])

  if (!segments) return null
  return <>{segments}</>
}

// 벽체 좌표 → 3D 박스 메시 생성 유틸
function WallMeshes({ wallsData }) {
  const meshes = useMemo(() => {
    if (!wallsData || wallsData.length === 0) return null
    return wallsData.map((wall, i) => {
      // 정규화 좌표(0-1) → 씬 좌표 (원점 중심)
      const x1 = (wall.x1 - 0.5) * WIDTH
      const z1 = (wall.y1 - 0.5) * DEPTH
      const x2 = (wall.x2 - 0.5) * WIDTH
      const z2 = (wall.y2 - 0.5) * DEPTH

      const midX = (x1 + x2) / 2
      const midZ = (z1 + z2) / 2
      const length = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2)
      const angle = Math.atan2(z2 - z1, x2 - x1)

      if (length < 0.05) return null

      return (
        <mesh
          key={i}
          position={[midX, HEIGHT / 2, midZ]}
          rotation={[0, -angle, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[length, HEIGHT, 0.12]} />
          <meshStandardMaterial color="#64748b" />
        </mesh>
      )
    })
  }, [wallsData])

  return <>{meshes}</>
}

// L2 (이미지 있음): useTexture 는 조건부 호출 불가라 별도 컴포넌트로 분리
function LevelTwoMeshTextured({ imageUrl, wallsData, outline }) {
  const texture = useTexture(imageUrl)
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping

  const hasWalls = wallsData && wallsData.length > 0

  return (
    <group>
      {/* 바닥: 원본 이미지 텍스처 */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[WIDTH, DEPTH]} />
        <meshBasicMaterial map={texture} />
      </mesh>
      <gridHelper args={[Math.max(WIDTH, DEPTH) + 4, 20, '#1e3a8a', '#1e293b']} position={[0, 0.02, 0]} />

      {/* 외곽 윤곽선 — 유리 경계 (창호 위치 포함) */}
      <OutlineBoundary outline={outline} />

      {/* 내벽 + 외벽 실체 */}
      {hasWalls ? (
        <WallMeshes wallsData={wallsData} />
      ) : (
        <mesh position={[0, HEIGHT / 2, 0]}>
          <boxGeometry args={[WIDTH, HEIGHT, DEPTH]} />
          <meshStandardMaterial color="#0ea5e9" wireframe transparent opacity={0.35} />
        </mesh>
      )}
    </group>
  )
}

// L2 (이미지 없음 / 재업로드 필요)
function LevelTwoMeshFallback({ wallsData, outline }) {
  const hasWalls = wallsData && wallsData.length > 0

  return (
    <group>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[WIDTH, DEPTH]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      <gridHelper args={[Math.max(WIDTH, DEPTH) + 4, 20, '#1e3a8a', '#1e293b']} position={[0, 0.02, 0]} />

      <OutlineBoundary outline={outline} />

      {hasWalls ? (
        <WallMeshes wallsData={wallsData} />
      ) : (
        <mesh position={[0, HEIGHT / 2, 0]}>
          <boxGeometry args={[WIDTH, HEIGHT, DEPTH]} />
          <meshStandardMaterial color="#0ea5e9" wireframe transparent opacity={0.35} />
        </mesh>
      )}
    </group>
  )
}

// L3: 자율비행 — point cloud 5000점
function LevelThreeMesh() {
  const { positions, colors } = useMemo(() => {
    const count = 5000
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      // 건물 외곽에 분포 (천장 포함)
      const face = Math.floor(Math.random() * 5) // 5: 바닥/천장/4벽
      let x, y, z
      const jitter = () => (Math.random() - 0.5) * 0.08
      if (face === 0) {
        // 바닥
        x = (Math.random() - 0.5) * WIDTH
        y = jitter()
        z = (Math.random() - 0.5) * DEPTH
      } else if (face === 1) {
        // 천장
        x = (Math.random() - 0.5) * WIDTH
        y = HEIGHT + jitter()
        z = (Math.random() - 0.5) * DEPTH
      } else if (face === 2) {
        x = -WIDTH / 2 + jitter()
        y = Math.random() * HEIGHT
        z = (Math.random() - 0.5) * DEPTH
      } else if (face === 3) {
        x = WIDTH / 2 + jitter()
        y = Math.random() * HEIGHT
        z = (Math.random() - 0.5) * DEPTH
      } else {
        x = (Math.random() - 0.5) * WIDTH
        y = Math.random() * HEIGHT
        z = (Math.random() > 0.5 ? -DEPTH / 2 : DEPTH / 2) + jitter()
      }
      pos[i * 3] = x
      pos[i * 3 + 1] = y
      pos[i * 3 + 2] = z
      // 높이에 따른 그라데이션 (floor: cyan → ceiling: accent green)
      const t = y / HEIGHT
      col[i * 3] = 0.1 + 0.0 * t
      col[i * 3 + 1] = 0.7 + 0.3 * t
      col[i * 3 + 2] = 0.9 - 0.5 * t
    }
    return { positions: pos, colors: col }
  }, [])

  return (
    <group>
      <FloorAndGrid floorColor="#0f172a" />
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={positions.length / 3}
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={colors.length / 3}
            array={colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial size={0.05} vertexColors sizeAttenuation transparent opacity={0.9} />
      </points>
    </group>
  )
}

// 폴백 — 세션 없이 진입한 경우 (ProtectedSessionLayout 덕분에 정상 플로우에서는 도달하지 않음)
function DefaultMesh() {
  return (
    <group>
      <FloorAndGrid />
      <mesh position={[0, HEIGHT / 2, 0]}>
        <boxGeometry args={[WIDTH, HEIGHT, DEPTH]} />
        <meshStandardMaterial color="#334155" wireframe transparent opacity={0.3} />
      </mesh>
    </group>
  )
}

export default function BuildingMesh({ level, imageUrl, wallsData, outline }) {
  if (level === 1) return <LevelOneMesh />
  if (level === 2) return imageUrl
    ? <LevelTwoMeshTextured imageUrl={imageUrl} wallsData={wallsData} outline={outline} />
    : <LevelTwoMeshFallback wallsData={wallsData} outline={outline} />
  if (level === 3) return <LevelThreeMesh />
  return <DefaultMesh />
}

// BuildingScene / 마커 컴포넌트가 참조할 수 있도록 치수 상수 export
export { WIDTH, DEPTH, HEIGHT }
