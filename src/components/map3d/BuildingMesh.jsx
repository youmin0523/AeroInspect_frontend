/**
 * components/map3d/BuildingMesh.jsx
 * 역할: 3D 건물 지오메트리 — Level 별 3가지 스타일 분기
 *       - L1 (CAD): wallsData 있으면 박스 메시 추출(DXF 결과), 없으면 하드코딩 4벽 폴백
 *       - L2 (평면도): 바닥 planeGeometry + 이미지 텍스처 + 추출된 벽 박스 압출
 *       - L3 (자율비행): 5000점 랜덤 point cloud — "SLAM 스캔" 느낌
 *       - 기본(세션 없이 진입 시): 폴백 와이어프레임 박스
 *
 *   //* [Modified Code 2026-05-13] 정확도 개선
 *     - 종횡비 보존: imageWidth/imageHeight (또는 outline bbox) 기반으로 sceneW/sceneD 동적 산출
 *       → 가로 1500×세로 1000 평면도가 5:4 로 강제되던 왜곡 제거
 *     - 실측 스케일: scalePxPerMeter 가 있으면 미터 단위 실제 치수로 환산 (FR-015 calibrate 결과 활용)
 *     - 치수 라벨: 실측/추정 출처를 함께 표기
 *     - L1 도 wallsData 받으면 동적 렌더 (DXF backend 처리 결과)
 */

import { useMemo } from 'react'
import { Html, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import useDroneStore from '../../store/droneStore.js'

// ── 씬 단위 가이드라인 ──────────────────────────
// 1 씬 단위 ≈ 1 m. LONG_SIDE 는 calibrate 안 됐을 때 긴 변 기본 길이(추정 m)
const LONG_SIDE_FALLBACK = 12
const HEIGHT = 3              // 표준 천장 높이 (m)
const WALL_THICKNESS = 0.12   // 벽 두께 (m)
const OUTLINE_THICKNESS = 0.04
const MIN_SIDE_M = 4          // 너무 작은 평면도가 감지되면 가독성을 위해 최소 4m
const MAX_SIDE_M = 60         // 너무 큰 calibrate 오입력 방지

/**
 * 이미지 크기·calibration 으로부터 씬 가로/세로(m) 산출.
 * 정확도 우선순위:
 *   1) scalePxPerMeter + imageWidth/imageHeight → 실측 미터
 *   2) imageWidth/imageHeight → 종횡비 보존 + 긴 변 = LONG_SIDE_FALLBACK
 *   3) outline bbox → 종횡비 보존
 *   4) 폴백 → 12 × 9
 */
function deriveSceneSize({ imageWidth, imageHeight, scalePxPerMeter, outline }) {
  // 1) 실측 m 환산
  if (scalePxPerMeter && scalePxPerMeter > 0 && imageWidth && imageHeight) {
    const w = imageWidth / scalePxPerMeter
    const d = imageHeight / scalePxPerMeter
    const cw = THREE.MathUtils.clamp(w, MIN_SIDE_M, MAX_SIDE_M)
    const cd = THREE.MathUtils.clamp(d, MIN_SIDE_M, MAX_SIDE_M)
    return { sceneW: cw, sceneD: cd, source: 'calibrated', clamped: cw !== w || cd !== d }
  }

  // 2) 이미지 종횡비 보존
  if (imageWidth && imageHeight) {
    const aspect = imageWidth / imageHeight
    if (aspect >= 1) {
      return { sceneW: LONG_SIDE_FALLBACK, sceneD: LONG_SIDE_FALLBACK / aspect, source: 'aspect', clamped: false }
    }
    return { sceneW: LONG_SIDE_FALLBACK * aspect, sceneD: LONG_SIDE_FALLBACK, source: 'aspect', clamped: false }
  }

  // 3) outline bbox 로 비율 추정 (정규화 0-1 좌표 → 비율만 활용)
  if (outline && outline.length >= 3) {
    const xs = outline.map((p) => p.x)
    const ys = outline.map((p) => p.y)
    const w01 = Math.max(...xs) - Math.min(...xs)
    const h01 = Math.max(...ys) - Math.min(...ys)
    if (w01 > 0 && h01 > 0) {
      const aspect = w01 / h01
      if (aspect >= 1) {
        return { sceneW: LONG_SIDE_FALLBACK, sceneD: LONG_SIDE_FALLBACK / aspect, source: 'outline', clamped: false }
      }
      return { sceneW: LONG_SIDE_FALLBACK * aspect, sceneD: LONG_SIDE_FALLBACK, source: 'outline', clamped: false }
    }
  }

  // 4) 폴백
  return { sceneW: 12, sceneD: 9, source: 'fallback', clamped: false }
}

// 공통 바닥 + 그리드
function FloorAndGrid({ sceneW, sceneD, floorColor = '#1e293b' }) {
  return (
    <>
      <mesh position={[0, 0, 0]} receiveShadow>
        <boxGeometry args={[sceneW, 0.1, sceneD]} />
        <meshStandardMaterial color={floorColor} />
      </mesh>
      <gridHelper args={[Math.max(sceneW, sceneD) + 4, 20, '#1e3a8a', '#1e293b']} position={[0, 0.06, 0]} />
    </>
  )
}

// 치수 라벨 — 실제 sceneW/sceneD/HEIGHT 표시 + 출처 마커
function DimensionLabels({ sceneW, sceneD, source }) {
  const sourceTag =
    source === 'calibrated' ? '실측' :
    source === 'aspect' ? '추정' :
    source === 'outline' ? '추정' :
    '기본값'
  return (
    <>
      <Html position={[0, 0.05, sceneD / 2 + 0.4]} center distanceFactor={10}>
        <span className="text-[10px] font-mono text-accent-300 bg-slate-900/70 px-1.5 py-0.5 rounded border border-accent-500/30 whitespace-nowrap">
          {sceneW.toFixed(1)}m
        </span>
      </Html>
      <Html position={[sceneW / 2 + 0.4, 0.05, 0]} center distanceFactor={10}>
        <span className="text-[10px] font-mono text-accent-300 bg-slate-900/70 px-1.5 py-0.5 rounded border border-accent-500/30 whitespace-nowrap">
          {sceneD.toFixed(1)}m
        </span>
      </Html>
      <Html position={[-sceneW / 2 - 0.4, HEIGHT / 2, 0]} center distanceFactor={10}>
        <span className="text-[10px] font-mono text-accent-300 bg-slate-900/70 px-1.5 py-0.5 rounded border border-accent-500/30 whitespace-nowrap">
          {HEIGHT.toFixed(1)}m
        </span>
      </Html>
      <Html position={[0, HEIGHT + 0.4, 0]} center distanceFactor={10}>
        <span className="text-[9px] font-mono text-slate-400 bg-slate-900/60 px-1.5 py-0.5 rounded border border-slate-700/60 whitespace-nowrap">
          치수 출처 · {sourceTag}
        </span>
      </Html>
    </>
  )
}

// 건물 외곽 윤곽선 → 유리 경계 벽 (창호 갭을 반투명 유리로 채움)
function OutlineBoundary({ outline, sceneW, sceneD }) {
  const segments = useMemo(() => {
    if (!outline || outline.length < 3) return null
    return outline.map((pt, i) => {
      const next = outline[(i + 1) % outline.length]
      const x1 = (pt.x - 0.5) * sceneW
      const z1 = (pt.y - 0.5) * sceneD
      const x2 = (next.x - 0.5) * sceneW
      const z2 = (next.y - 0.5) * sceneD

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
          <boxGeometry args={[length, HEIGHT, OUTLINE_THICKNESS]} />
          <meshStandardMaterial
            color="#38bdf8"
            transparent
            opacity={0.18}
            side={THREE.DoubleSide}
          />
        </mesh>
      )
    })
  }, [outline, sceneW, sceneD])

  if (!segments) return null
  return <>{segments}</>
}

// 벽체 좌표(0-1 정규화) → 3D 박스 메시 생성
function WallMeshes({ wallsData, sceneW, sceneD }) {
  const meshes = useMemo(() => {
    if (!wallsData || wallsData.length === 0) return null
    return wallsData.map((wall, i) => {
      const x1 = (wall.x1 - 0.5) * sceneW
      const z1 = (wall.y1 - 0.5) * sceneD
      const x2 = (wall.x2 - 0.5) * sceneW
      const z2 = (wall.y2 - 0.5) * sceneD

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
          <boxGeometry args={[length, HEIGHT, WALL_THICKNESS]} />
          <meshStandardMaterial color="#64748b" />
        </mesh>
      )
    })
  }, [wallsData, sceneW, sceneD])

  return <>{meshes}</>
}

// //* [Modified Code 2026-05-13] 가구/빌트인 메시 — 자율비행 충돌 회피용
// 라벨별 색상 + 추정 높이로 박스 렌더. 사용자가 3D 프리뷰에서 가구 위치를 즉시 인지.
const FURNITURE_COLORS = {
  rectangular: '#92836b', // 갈색 — 침대·소파·책상·식탁
  small: '#a8856a',       // 밝은 갈색 — 의자·세면대·변기
  unknown: '#7b6c5a',     // 어두운 갈색 — 분류 불가 (안전 마진)
}
const FURNITURE_HEIGHTS = {
  rectangular: 1.0,
  small: 0.85,
  unknown: 1.2,
}

function FurnitureMeshes({ furnitureData, sceneW, sceneD }) {
  const meshes = useMemo(() => {
    if (!furnitureData || furnitureData.length === 0) return null
    return furnitureData.map((f, i) => {
      const cx = (f.cx - 0.5) * sceneW
      const cz = (f.cy - 0.5) * sceneD
      const fw = Math.max((f.w ?? 0) * sceneW, 0.05)
      const fd = Math.max((f.h ?? 0) * sceneD, 0.05)
      const label = f.label || 'rectangular'
      const fh = Math.min(FURNITURE_HEIGHTS[label] ?? 1.0, HEIGHT - 0.1)
      const color = FURNITURE_COLORS[label] ?? FURNITURE_COLORS.rectangular
      // OpenCV minAreaRect angle (deg) → Three Y축 회전 (radian)
      const angleRad = -((f.angle ?? 0) * Math.PI) / 180

      return (
        <mesh
          key={`furniture-${i}`}
          position={[cx, fh / 2, cz]}
          rotation={[0, angleRad, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[fw, fh, fd]} />
          <meshStandardMaterial color={color} roughness={0.85} />
        </mesh>
      )
    })
  }, [furnitureData, sceneW, sceneD])
  if (!meshes) return null
  return <>{meshes}</>
}

// 하드코딩 4벽 — wallsData 가 없을 때 폴백 (L1/L2 공통)
function FourWallsFallback({ sceneW, sceneD, color = '#475569' }) {
  return (
    <group>
      <mesh position={[0, HEIGHT / 2, -sceneD / 2]}>
        <boxGeometry args={[sceneW, HEIGHT, WALL_THICKNESS]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, HEIGHT / 2, sceneD / 2]}>
        <boxGeometry args={[sceneW, HEIGHT, WALL_THICKNESS]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[-sceneW / 2, HEIGHT / 2, 0]}>
        <boxGeometry args={[WALL_THICKNESS, HEIGHT, sceneD]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[sceneW / 2, HEIGHT / 2, 0]}>
        <boxGeometry args={[WALL_THICKNESS, HEIGHT, sceneD]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  )
}

// L1: CAD — wallsData(DXF LINE 추출) 가 있으면 동적, 없으면 하드코딩 4벽 + 치수 + 가구
function LevelOneMesh({ wallsData, outline, imageWidth, imageHeight, scalePxPerMeter, furnitureData }) {
  const { sceneW, sceneD, source } = useMemo(
    () => deriveSceneSize({ imageWidth, imageHeight, scalePxPerMeter, outline }),
    [imageWidth, imageHeight, scalePxPerMeter, outline]
  )
  const hasWalls = wallsData && wallsData.length > 0

  return (
    <group>
      <FloorAndGrid sceneW={sceneW} sceneD={sceneD} />
      <OutlineBoundary outline={outline} sceneW={sceneW} sceneD={sceneD} />
      {hasWalls
        ? <WallMeshes wallsData={wallsData} sceneW={sceneW} sceneD={sceneD} />
        : <FourWallsFallback sceneW={sceneW} sceneD={sceneD} />}
      <FurnitureMeshes furnitureData={furnitureData} sceneW={sceneW} sceneD={sceneD} />
      <DimensionLabels sceneW={sceneW} sceneD={sceneD} source={source} />
    </group>
  )
}

// L2 (이미지 있음): useTexture 는 조건부 호출 불가라 별도 컴포넌트로 분리
function LevelTwoMeshTextured({ imageUrl, wallsData, outline, imageWidth, imageHeight, scalePxPerMeter, furnitureData }) {
  const texture = useTexture(imageUrl)
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping

  const { sceneW, sceneD, source } = useMemo(
    () => deriveSceneSize({ imageWidth, imageHeight, scalePxPerMeter, outline }),
    [imageWidth, imageHeight, scalePxPerMeter, outline]
  )
  const hasWalls = wallsData && wallsData.length > 0

  return (
    <group>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[sceneW, sceneD]} />
        <meshBasicMaterial map={texture} />
      </mesh>
      <gridHelper args={[Math.max(sceneW, sceneD) + 4, 20, '#1e3a8a', '#1e293b']} position={[0, 0.02, 0]} />

      <OutlineBoundary outline={outline} sceneW={sceneW} sceneD={sceneD} />

      {hasWalls ? (
        <WallMeshes wallsData={wallsData} sceneW={sceneW} sceneD={sceneD} />
      ) : (
        <mesh position={[0, HEIGHT / 2, 0]}>
          <boxGeometry args={[sceneW, HEIGHT, sceneD]} />
          <meshStandardMaterial color="#0ea5e9" wireframe transparent opacity={0.35} />
        </mesh>
      )}

      <FurnitureMeshes furnitureData={furnitureData} sceneW={sceneW} sceneD={sceneD} />
      <DimensionLabels sceneW={sceneW} sceneD={sceneD} source={source} />
    </group>
  )
}

// L2 (이미지 없음 / 재업로드 필요)
function LevelTwoMeshFallback({ wallsData, outline, imageWidth, imageHeight, scalePxPerMeter, furnitureData }) {
  const { sceneW, sceneD, source } = useMemo(
    () => deriveSceneSize({ imageWidth, imageHeight, scalePxPerMeter, outline }),
    [imageWidth, imageHeight, scalePxPerMeter, outline]
  )
  const hasWalls = wallsData && wallsData.length > 0

  return (
    <group>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[sceneW, sceneD]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      <gridHelper args={[Math.max(sceneW, sceneD) + 4, 20, '#1e3a8a', '#1e293b']} position={[0, 0.02, 0]} />

      <OutlineBoundary outline={outline} sceneW={sceneW} sceneD={sceneD} />

      {hasWalls ? (
        <WallMeshes wallsData={wallsData} sceneW={sceneW} sceneD={sceneD} />
      ) : (
        <mesh position={[0, HEIGHT / 2, 0]}>
          <boxGeometry args={[sceneW, HEIGHT, sceneD]} />
          <meshStandardMaterial color="#0ea5e9" wireframe transparent opacity={0.35} />
        </mesh>
      )}

      <FurnitureMeshes furnitureData={furnitureData} sceneW={sceneW} sceneD={sceneD} />
      <DimensionLabels sceneW={sceneW} sceneD={sceneD} source={source} />
    </group>
  )
}

// L3: 자율비행 — 실제 LiDAR 포인트 (백엔드 자율비행 시뮬레이터 또는 ROS2 노드) 우선,
// 없으면 5000점 랜덤 폴백. droneStore.lidarPoints (백엔드/Gazebo→WS 누적) + meta 사용.
//
//   //* [Modified Code 2026-05-13] 랜덤 폴백 → 실제 LiDAR raycast 데이터로 교체.
//   드론은 boustrophedon 격자 비행하며 360° 빔 스캔 → 점진 누적 → 실시간 시각화.

// Three Y/Z 축 매핑: 백엔드 LiDAR 점은 (x_world_m, y_world_m, z_height_m). 평면 좌표(x,y)
// 가 Three.js 의 (x,z), 고도 z 가 Three.js 의 y 에 해당.
function _remapLidarPoints(srcXYZ) {
  // srcXYZ: Float32Array (x y z x y z ...)
  const out = new Float32Array(srcXYZ.length)
  for (let i = 0; i < srcXYZ.length; i += 3) {
    out[i]     = srcXYZ[i]      // x
    out[i + 1] = srcXYZ[i + 2]  // y_three ← z_world (고도)
    out[i + 2] = srcXYZ[i + 1]  // z_three ← y_world
  }
  return out
}

function _colorsForHeight(positions, ceilingY) {
  const colors = new Float32Array(positions.length)
  for (let i = 0; i < positions.length; i += 3) {
    const t = THREE.MathUtils.clamp(positions[i + 1] / Math.max(ceilingY, 0.01), 0, 1)
    colors[i]     = 0.1 + 0.0 * t
    colors[i + 1] = 0.7 + 0.3 * t
    colors[i + 2] = 0.9 - 0.5 * t
  }
  return colors
}

function LevelThreeMesh() {
  const lidarPoints = useDroneStore((s) => s.lidarPoints)
  const lidarPointCount = useDroneStore((s) => s.lidarPointCount)
  const lidarMeta = useDroneStore((s) => s.lidarMissionMeta)
  const lidarStatus = useDroneStore((s) => s.lidarMissionStatus)

  const sceneW = lidarMeta?.worldW ?? LONG_SIDE_FALLBACK
  const sceneD = lidarMeta?.worldD ?? LONG_SIDE_FALLBACK * 0.75

  const useReal = lidarPoints && lidarPointCount > 0

  // 실제 LiDAR 점 변환 (좌표축 매핑) + 색상 — 점 누적될 때마다 새 배열로
  // lidarPointCount 는 body 에서 직접 참조하지 않지만, 점이 in-place 로 누적될 때
  // 재계산을 트리거하는 의도적 cache-bust 의존성 → 제거 금지(제거 시 누적 렌더 정지).
  const realData = useMemo(() => {
    if (!useReal) return null
    const positions = _remapLidarPoints(lidarPoints)
    const colors = _colorsForHeight(positions, HEIGHT)
    return { positions, colors }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useReal, lidarPoints, lidarPointCount])

  // 폴백: 5000점 랜덤 (실제 미션 미시작 / 시뮬 안 했을 때)
  const fallbackData = useMemo(() => {
    if (useReal) return null
    const count = 5000
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const face = Math.floor(Math.random() * 5)
      let x, y, z
      const jitter = () => (Math.random() - 0.5) * 0.08
      if (face === 0) {
        x = (Math.random() - 0.5) * sceneW
        y = jitter()
        z = (Math.random() - 0.5) * sceneD
      } else if (face === 1) {
        x = (Math.random() - 0.5) * sceneW
        y = HEIGHT + jitter()
        z = (Math.random() - 0.5) * sceneD
      } else if (face === 2) {
        x = -sceneW / 2 + jitter()
        y = Math.random() * HEIGHT
        z = (Math.random() - 0.5) * sceneD
      } else if (face === 3) {
        x = sceneW / 2 + jitter()
        y = Math.random() * HEIGHT
        z = (Math.random() - 0.5) * sceneD
      } else {
        x = (Math.random() - 0.5) * sceneW
        y = Math.random() * HEIGHT
        z = (Math.random() > 0.5 ? -sceneD / 2 : sceneD / 2) + jitter()
      }
      pos[i * 3] = x
      pos[i * 3 + 1] = y
      pos[i * 3 + 2] = z
    }
    return { positions: pos, colors: _colorsForHeight(pos, HEIGHT) }
  }, [useReal, sceneW, sceneD])

  const data = realData ?? fallbackData

  const sourceLabel = useReal
    ? (lidarStatus === 'completed' ? '실측 (스캔 완료)' : '실측 (스캔 중)')
    : '미시작 (시뮬레이션 폴백)'

  return (
    <group>
      <FloorAndGrid sceneW={sceneW} sceneD={sceneD} floorColor="#0f172a" />
      <points>
        {/* key 를 포인트 수에 묶어, LiDAR 점이 스트리밍 누적될 때 geometry 를 remount →
            새 버퍼가 GPU 로 업로드된다. (동일 <bufferGeometry> 재사용 시 attribute 가
            stale 로 남아 스캔이 멈춘 것처럼 보이던 문제 해결) */}
        <bufferGeometry key={data.positions.length}>
          <bufferAttribute
            attach="attributes-position"
            count={data.positions.length / 3}
            array={data.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={data.colors.length / 3}
            array={data.colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial size={0.05} vertexColors sizeAttenuation transparent opacity={0.9} />
      </points>

      {/* L3 데이터 출처 라벨 */}
      <Html position={[0, HEIGHT + 0.4, 0]} center distanceFactor={10}>
        <span className="text-[9px] font-mono text-slate-400 bg-slate-900/60 px-1.5 py-0.5 rounded border border-slate-700/60 whitespace-nowrap">
          LiDAR · {sourceLabel}
          {useReal ? ` · ${lidarPointCount}점` : ''}
        </span>
      </Html>
    </group>
  )
}

// 폴백 — 세션 없이 진입한 경우
function DefaultMesh() {
  const sceneW = 12
  const sceneD = 9
  return (
    <group>
      <FloorAndGrid sceneW={sceneW} sceneD={sceneD} />
      <mesh position={[0, HEIGHT / 2, 0]}>
        <boxGeometry args={[sceneW, HEIGHT, sceneD]} />
        <meshStandardMaterial color="#334155" wireframe transparent opacity={0.3} />
      </mesh>
    </group>
  )
}

export default function BuildingMesh({
  level,
  imageUrl,
  wallsData,
  outline,
  imageWidth,
  imageHeight,
  scalePxPerMeter,
  furnitureData,
}) {
  if (level === 1) return (
    <LevelOneMesh
      wallsData={wallsData}
      outline={outline}
      imageWidth={imageWidth}
      imageHeight={imageHeight}
      scalePxPerMeter={scalePxPerMeter}
      furnitureData={furnitureData}
    />
  )
  if (level === 2) return imageUrl
    ? <LevelTwoMeshTextured
        imageUrl={imageUrl}
        wallsData={wallsData}
        outline={outline}
        imageWidth={imageWidth}
        imageHeight={imageHeight}
        scalePxPerMeter={scalePxPerMeter}
        furnitureData={furnitureData}
      />
    : <LevelTwoMeshFallback
        wallsData={wallsData}
        outline={outline}
        imageWidth={imageWidth}
        imageHeight={imageHeight}
        scalePxPerMeter={scalePxPerMeter}
        furnitureData={furnitureData}
      />
  if (level === 3) return <LevelThreeMesh />
  return <DefaultMesh />
}

export { HEIGHT, deriveSceneSize }
