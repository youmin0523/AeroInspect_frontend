/**
 * components/map3d/BuildingScene.jsx
 * 역할: React Three Fiber 3D 캔버스 래퍼
 *       - OrbitControls로 마우스 드래그 회전/줌 지원
 *       - BuildingMesh: 건물 와이어프레임
 *       - DefectMarker: 탐지된 하자 위치 마커
 *       - lidar 좌표가 있는 하자만 마커로 표시
 */

import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Suspense } from 'react'
import * as THREE from 'three'
import BuildingMesh from './BuildingMesh.jsx'
import DefectMarker from './DefectMarker.jsx'
import DroneMarker from './DroneMarker.jsx'
import useDefectStore from '../../store/defectStore.js'
import useSessionStore from '../../store/sessionStore.js'

export default function BuildingScene() {
  const defects = useDefectStore((s) => s.defects)
  // //* [Modified Code] 세션 level + L2 이미지 URL + 벽체/윤곽 데이터 구독 — BuildingMesh 에 전달
  // //* [Modified Code 2026-05-13] 종횡비 보존을 위해 imageWidth/imageHeight/scalePxPerMeter 도 전달
  const level = useSessionStore((s) => s.level)
  const imageUrl = useSessionStore((s) => s.uploadedImageDataUrl)
  const wallsData = useSessionStore((s) => s.wallsData)
  const outline = useSessionStore((s) => s.outline)
  const imageWidth = useSessionStore((s) => s.imageWidth)
  const imageHeight = useSessionStore((s) => s.imageHeight)
  const scalePxPerMeter = useSessionStore((s) => s.scalePxPerMeter)
  const furnitureData = useSessionStore((s) => s.furnitureData)

  // LiDAR 좌표가 있는 하자만 마커 표시
  const mappedDefects = defects.filter(
    (d) => d.lidar_x != null && d.lidar_y != null && d.lidar_z != null
  )

  return (
    // //* [Modified Code] relative 부여 — 범례 absolute 기준 + 풀스크린 HUD 레이아웃에서 안전 배치
    <div className="relative w-full h-full overflow-hidden">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[8, 6, 8]} fov={50} />
        {/* //* [Modified Code v3] (2026-05-27) 모바일 터치 제스처 — 1손가락 회전 / 2손가락 핀치줌+팬 + damping */}
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          enableDamping
          dampingFactor={0.08}
          maxPolarAngle={Math.PI / 2}
          minDistance={2}
          maxDistance={30}
          touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
        />

        {/* 조명 */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 10, 5]} intensity={0.8} castShadow />

        <Suspense fallback={null}>
          {/* //* [Modified Code] 세션 level 기반 건물 구조 렌더 (L1/L2/L3 분기) */}
          <BuildingMesh
            level={level}
            imageUrl={imageUrl}
            wallsData={wallsData}
            outline={outline}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
            scalePxPerMeter={scalePxPerMeter}
            furnitureData={furnitureData}
          />

          {/* 하자 마커 */}
          {mappedDefects.map((defect) => (
            <DefectMarker key={defect.id} defect={defect} />
          ))}

          {/* //* [Modified Code] 드론 실시간 위치 마커 */}
          <DroneMarker />
        </Suspense>
      </Canvas>

      {/* //* [Modified Code v3] 범례 — bottom-center pill, 작은 HUD 장식 */}
      <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[9px] text-slate-400 px-2 py-1 rounded-full bg-slate-900/75 border border-slate-700/70 backdrop-blur-sm shadow-md">
        <LegendItem color="#ef4444" label="HIGH" />
        <span className="w-px h-2 bg-slate-700" />
        <LegendItem color="#f97316" label="MED" />
        <span className="w-px h-2 bg-slate-700" />
        <LegendItem color="#eab308" label="LOW" />
        <span className="w-px h-2 bg-slate-700" />
        <span className="font-mono text-slate-500 tabular-nums">{mappedDefects.length}</span>
      </div>
    </div>
  )
}

function LegendItem({ color, label }) {
  return (
    <div className="flex items-center gap-1">
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  )
}
