/**
 * components/map3d/DefectMarker.jsx
 * 역할: 3D 공간상 하자 위치 마커 (React Three Fiber)
 *       - lidar_x/y/z 좌표에 구체(Sphere) 메시 배치
 *       - 심각도별 색상: HIGH=빨강, MED=주황, LOW=노랑
 *       - 클릭 시 defectStore.selectDefect() 호출
 *       - 호버 시 scale 애니메이션 + 툴팁
 */

import { useState, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import useDefectStore from '../../store/defectStore.js'
import { getGradeStyle } from '../../utils/gradeStyle.js'

const SEVERITY_COLORS = {
  HIGH: '#ef4444',
  MED:  '#f97316',
  LOW:  '#eab308',
}

export default function DefectMarker({ defect }) {
  const [hovered, setHovered] = useState(false)
  const meshRef = useRef()
  const selectDefect = useDefectStore((s) => s.selectDefect)
  const selectedDefect = useDefectStore((s) => s.selectedDefect)
  const isSelected = selectedDefect?.id === defect.id

  // R-v1.1.17: grade(신뢰도 등급) 우선, 없으면 severity로 fallback
  // CONFIRMED 빨강 / REVIEW 노랑 / REFERENCE 회색
  const color = defect.grade
    ? getGradeStyle(defect.grade).markerColor
    : (SEVERITY_COLORS[defect.severity] || '#94a3b8')
  const x = defect.lidar_x ?? 0
  const y = defect.lidar_z ?? 1   // Z(고도)를 Three.js Y축으로 매핑
  const z = defect.lidar_y ?? 0

  // 선택된 마커 펄스 애니메이션
  useFrame(() => {
    if (meshRef.current && isSelected) {
      meshRef.current.scale.setScalar(
        1.2 + Math.sin(Date.now() * 0.005) * 0.15
      )
    } else if (meshRef.current) {
      const targetScale = hovered ? 1.3 : 1.0
      const current = meshRef.current.scale.x
      meshRef.current.scale.setScalar(current + (targetScale - current) * 0.15)
    }
  })

  return (
    <mesh
      ref={meshRef}
      position={[x, y, z]}
      onClick={(e) => { e.stopPropagation(); selectDefect(defect) }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <sphereGeometry args={[0.08, 16, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={isSelected ? 0.8 : hovered ? 0.4 : 0.2}
      />

      {/* 호버/선택 시 툴팁 */}
      {(hovered || isSelected) && (
        <Html distanceFactor={8} zIndexRange={[100, 0]}>
          <div className="bg-dashboard-surface border border-dashboard-border rounded p-2 text-xs text-white whitespace-nowrap shadow-lg">
            <div className="font-mono text-slate-400">{defect.category_code}</div>
            <div className="font-medium">{defect.defect_type}</div>
            <div className="text-slate-500 mt-0.5">
              신뢰도 {(defect.confidence * 100).toFixed(0)}%
            </div>
          </div>
        </Html>
      )}
    </mesh>
  )
}
