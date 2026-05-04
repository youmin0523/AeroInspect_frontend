/**
 * pages/SampleReport.jsx
 * 역할: 랜딩 페이지 "3D 리포트 샘플 보기" 데모 페이지
 *       - 25평 아파트 내부 3D 모델링 (거실/주방/침실/화장실/현관)
 *       - 드론이 문을 통해 실내를 순회하며 하자를 발견하는 시뮬레이션
 *       - 하자 발견 시 3D 마커 생성 + 우측 패널에 순차 추가
 */

import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Html, Line } from '@react-three/drei'
import { Suspense } from 'react'
import * as THREE from 'three'
import {
  ArrowLeft, AlertTriangle, CheckCircle2, Building2,
  Calendar, User, MapPin, Layers3, ChevronDown, ChevronUp,
  Download, FileText, Eye, RotateCcw, Radar, Play, Pause, Square,
} from 'lucide-react'
import { DEFECT_CATEGORIES_LIST } from '../constants/defectCategories'

// ══════════════════════════════════════════════════════════
// 아파트 치수 — 25평(84m²)
// ══════════════════════════════════════════════════════════
const APT_W = 11, APT_D = 7.5, APT_H = 2.7
const WALL_T = 0.12, IWALL_T = 0.08

// ══════════════════════════════════════════════════════════
// 벽체 — [x1, z1, x2, z2, thickness, type]
// 문 개구: 침실2(-3.8~-3.0) 화장실(-0.5~0.3) 침실1(2.3~3.1) 현관(-1.0~0.5)
// ══════════════════════════════════════════════════════════
const WALLS = [
  // 외벽 — 북
  [-5.5,-3.75,-3.0,-3.75,WALL_T,'outer'], [-1.5,-3.75,-0.5,-3.75,WALL_T,'outer'],
  [1.0,-3.75,2.5,-3.75,WALL_T,'outer'], [4.5,-3.75,5.5,-3.75,WALL_T,'outer'],
  // 외벽 — 남
  [-5.5,3.75,-1.0,3.75,WALL_T,'outer'], [0.5,3.75,5.5,3.75,WALL_T,'outer'],
  // 외벽 — 서
  [-5.5,-3.75,-5.5,-0.5,WALL_T,'outer'], [-5.5,1.0,-5.5,3.75,WALL_T,'outer'],
  // 외벽 — 동
  [5.5,-3.75,5.5,-1.5,WALL_T,'outer'], [5.5,-0.2,5.5,1.5,WALL_T,'outer'], [5.5,2.8,5.5,3.75,WALL_T,'outer'],
  // 내벽 — 복도 수평 (z=-0.75)
  [-5.5,-0.75,-3.8,-0.75,IWALL_T,'inner'], [-3.0,-0.75,-0.5,-0.75,IWALL_T,'inner'],
  [0.3,-0.75,1.5,-0.75,IWALL_T,'inner'], [1.5,-0.75,2.3,-0.75,IWALL_T,'inner'],
  [3.1,-0.75,5.5,-0.75,IWALL_T,'inner'],
  // 내벽 — 세로
  [-1.5,-3.75,-1.5,-0.75,IWALL_T,'inner'], [1.5,-3.75,1.5,-0.75,IWALL_T,'inner'],
  // 주방 파티션
  [0.5,1.0,0.5,3.0,IWALL_T,'inner'],
]

const WINDOWS = [
  { cx:-2.25, cy:1.5, cz:-3.75, w:1.4, h:1.2, rotY:0 },
  { cx:3.5,   cy:1.5, cz:-3.75, w:1.8, h:1.2, rotY:0 },
  { cx:-5.5,  cy:1.4, cz:0.25,  w:1.4, h:1.5, rotY:Math.PI/2 },
  { cx:5.5,   cy:1.4, cz:-0.85, w:1.2, h:1.4, rotY:Math.PI/2 },
  { cx:5.5,   cy:1.4, cz:2.15,  w:1.0, h:1.2, rotY:Math.PI/2 },
]

const FLOOR_ZONES = [
  { cx:-3.5, cz:-2.25, w:4, d:3, color:'#5c5040', label:'침실 2' },
  { cx:0,    cz:-2.25, w:3, d:3, color:'#4a5560', label:'화장실' },
  { cx:3.5,  cz:-2.25, w:4, d:3, color:'#5c5040', label:'침실 1' },
  { cx:-2.5, cz:1.5,   w:6, d:4.5, color:'#584e3e', label:'거실' },
  { cx:2.5,  cz:2.0,   w:4, d:3.5, color:'#4a4540', label:'주방' },
  { cx:-0.25,cz:3.2,   w:1.5, d:1, color:'#484050', label:'현관' },
]

// ══════════════════════════════════════════════════════════
// 하자 무작위 생성 — 20종 카테고리에서 매 시뮬레이션마다 다른 결과
// ══════════════════════════════════════════════════════════
const AREA_TRADE = { A: '구조', B: '방수', C: '마감', D: '바닥', E: '창호' }

/** 방별 스캔 영역 — 하자가 생성될 수 있는 구역 (드론 비행 경로 내부) */
const DEFECT_SPAWN_ZONES = [
  { label: '거실',   xMin: -4.8, xMax: -0.2, zMin: 0.2, zMax: 2.8, weight: 3 },
  { label: '주방',   xMin: 1.0,  xMax: 3.8,  zMin: 1.2, zMax: 2.8, weight: 2 },
  { label: '침실 2', xMin: -4.8, xMax: -2.0, zMin: -3.0, zMax: -1.2, weight: 2 },
  { label: '화장실', xMin: -1.0, xMax: 1.0,  zMin: -3.0, zMax: -1.2, weight: 2 },
  { label: '침실 1', xMin: 2.0,  xMax: 4.8,  zMin: -3.0, zMax: -1.2, weight: 2 },
  { label: '발코니', xMin: 4.6,  xMax: 5.2,  zMin: -0.8, zMax: 1.8, weight: 1 },
]

/** 카테고리별 현실적 설명 풀 */
const DESC_POOL = {
  'A-01': ['벽면 수직도 편차 검출. 마감재 시공 전 보정 필요', '천장면 수평도 불량. 레벨 재측정 권고'],
  'A-02': ['구조체 관통 균열. 폭 0.3mm 이상, 안전성 점검 필요', '콘크리트 구조 균열. 철근 부식 위험'],
  'A-03': ['마감 표면 미세 균열. 폭 0.1mm, 미관 보수 권고', '도막 미세 균열. 하부 구조체 이상 없음'],
  'A-04': ['문틀 직각도 편차 3mm 초과. 개폐 점검 필요', '창호 틀 수직도 불량. 기밀성 저하 우려'],
  'B-01': ['창호 프레임 열교 현상. 결로 방지 대책 필요', '창틀 단열 불량, 표면 온도 편차 5°C 이상'],
  'B-02': ['벽체 단열재 탈락 구간. 열화상 고온 영역 확인', '단열 공백 발생. 에너지 손실 및 결로 위험'],
  'B-03': ['코킹 누락 구간 발견. 외기 침투 가능성', '실링재 균열·탈락. 방수·기밀 성능 저하'],
  'B-04': ['방수층 들뜸 의심. 누수 흔적 동반', '천장부 누수 변색 발견. 상층 배관 점검 필요'],
  'B-05': ['창호 틈새 기밀 불량. 열화상 기류 검출', '창짝 밀착 불량. 풍지판 교체 검토'],
  'C-01': ['도배 이음매 들뜸 발생. 접착 불량 구간', '벽지 이음부 벌어짐. 재시공 필요'],
  'C-02': ['도배지 기포 발생. 하부 습기 유입 가능성', '벽지 들뜸 및 기포. 접착면 건조 불량'],
  'C-03': ['도색 얼룩 및 색상 불균일 구간 발견', '붓자국·롤러 자국 잔존. 미관 보수 권고'],
  'C-04': ['벽면 찍힘 발견. 시공 중 충격 흔적', '천장 스크래치 검출. 마감재 보수 필요'],
  'C-05': ['걸레받이 파손 구간 발견. 교체 필요', '걸레받이 이음부 틈 및 오염 발생'],
  'D-01': ['바닥 난방 온도 편차 8°C 이상. 배관 불량 의심', '난방 미작동 구간 검출. 배관 점검 필요'],
  'D-02': ['바닥재 들뜸 감지. 하부 모르타르 분리 의심', '마루 공명 구간 발견. 접착 불량'],
  'D-03': ['바닥 표면 오염 및 스크래치 발견', '마루 긁힘 발견. 시공 중 보호 부족'],
  'D-04': ['타일 줄눈 불균일. 폭 편차 2mm 이상', '줄눈 갈라짐 발견. 재시공 권고'],
  'E-01': ['유리면 스크래치 검출. 교체 검토 필요', '유리 파손 위험 미세 균열 발견'],
  'E-02': ['창틀 도장 박리 및 색상 변질', '문틀 도색 불량. 미관 재도장 필요'],
}

const WALL_POS = ['서측 벽', '동측 벽', '북측 벽', '남측 벽', '좌측 벽면', '우측 벽면']
const FLOOR_POS = ['바닥 중앙부', '바닥 모서리', '바닥 좌측', '바닥 우측']
const CEIL_POS = ['천장 중앙부', '천장 모서리', '천장 배관부']
const H_LABEL = ['하부', '중간부', '상부']

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const rand = (lo, hi) => lo + Math.random() * (hi - lo)

function generateRandomDefects() {
  const count = 6 + Math.floor(Math.random() * 9) // 6 ~ 14건
  const defects = []
  const used = []

  let attempts = 0
  while (defects.length < count && attempts < count * 4) {
    attempts++

    const cat = pick(DEFECT_CATEGORIES_LIST)

    // 가중치 기반 방 선택
    const totalW = DEFECT_SPAWN_ZONES.reduce((s, r) => s + r.weight, 0)
    let w = Math.random() * totalW
    let room = DEFECT_SPAWN_ZONES[0]
    for (const r of DEFECT_SPAWN_ZONES) { w -= r.weight; if (w <= 0) { room = r; break } }

    let x, z, y  // x→lidar_x, z→lidar_y(Three.js Z), y→lidar_z(높이=Three.js Y)

    if (cat.area === 'D') {
      // 바닥 하자 — 바닥면
      x = rand(room.xMin, room.xMax)
      z = rand(room.zMin, room.zMax)
      y = rand(0.03, 0.15)
    } else if (Math.random() < 0.12) {
      // 12% 확률 천장 하자
      x = rand(room.xMin, room.xMax)
      z = rand(room.zMin, room.zMax)
      y = rand(2.3, 2.55)
    } else {
      // 벽면 하자 — 방 가장자리에 배치
      const side = Math.floor(Math.random() * 4)
      const margin = rand(0.1, 0.25)
      if (side === 0) {
        x = room.xMin + margin; z = rand(room.zMin, room.zMax)
      } else if (side === 1) {
        x = room.xMax - margin; z = rand(room.zMin, room.zMax)
      } else if (side === 2) {
        x = rand(room.xMin, room.xMax); z = room.zMin + margin
      } else {
        x = rand(room.xMin, room.xMax); z = room.zMax - margin
      }
      y = rand(0.3, 2.3)
    }

    // 기존 하자와 최소 0.8m 이격
    if (used.some(p => (p[0]-x)**2 + (p[1]-y)**2 + (p[2]-z)**2 < 0.64)) continue
    used.push([x, y, z])

    // 위치 텍스트
    let locSuffix
    if (cat.area === 'D') locSuffix = pick(FLOOR_POS)
    else if (y > 2.2) locSuffix = pick(CEIL_POS)
    else locSuffix = `${pick(WALL_POS)} ${H_LABEL[y < 1.0 ? 0 : y < 1.8 ? 1 : 2]}`

    const descs = DESC_POOL[cat.code] || [`${cat.name} 검출. 보수 점검 필요`]

    // 유형별 현실적 면적
    let area
    if (['A-01', 'D-01'].includes(cat.code)) area = +rand(1.0, 3.5).toFixed(2)
    else if (['A-02', 'B-02', 'B-04'].includes(cat.code)) area = +rand(0.2, 1.2).toFixed(2)
    else area = +rand(0.05, 0.8).toFixed(2)

    defects.push({
      id: defects.length + 1,
      category_code: cat.code,
      defect_type: cat.name,
      severity: cat.severity,
      confidence: +rand(0.65, 0.96).toFixed(2),
      lidar_x: +x.toFixed(2),
      lidar_y: +z.toFixed(2),
      lidar_z: +y.toFixed(2),
      area,
      trade: AREA_TRADE[cat.area] || '기타',
      location: `${room.label} ${locSuffix}`,
      description: pick(descs),
    })
  }

  return defects
}

const SEVERITY_COLORS = { HIGH:'#ef4444', MED:'#f97316', LOW:'#eab308' }
const SEVERITY_LABELS = { HIGH:'심각', MED:'보통', LOW:'경미' }

// ══════════════════════════════════════════════════════════
// 드론 경로 — 문을 통과하는 실내 순회
// ══════════════════════════════════════════════════════════
// ═══ 격자형 3D 스캔 + 가구 회피 ═══
// obstacles: [{x1,x2,z1,z2,top}] — 가구 영역 + 높이
// 가구 위치에서는 가구 위(top+0.3m)부터 스캔, 빈 곳은 바닥(0.4m)부터
function genScan(xMin, xMax, zMin, zMax, xN, zN, obs=[]) {
  const pts = []
  const dx = xN > 1 ? (xMax - xMin) / (xN - 1) : 0
  const dz = zN > 1 ? (zMax - zMin) / (zN - 1) : 0
  const TOP = 2.4

  function lo(x, z) {
    let h = 0.4
    for (const o of obs) {
      if (x >= o.x1 && x <= o.x2 && z >= o.z1 && z <= o.z2)
        h = Math.max(h, o.top + 0.3)
    }
    return Math.min(h, TOP - 0.2)
  }

  // Pass 1: z열마다 x방향
  for (let zi = 0; zi < zN; zi++) {
    const z = +(zMin + dz * zi).toFixed(2)
    for (let xi = 0; xi < xN; xi++) {
      const xIdx = zi % 2 === 0 ? xi : xN - 1 - xi
      const x = +(xMin + dx * xIdx).toFixed(2)
      const L = lo(x, z)
      if (xi % 2 === 0) pts.push([x,L,z],[x,TOP,z])
      else pts.push([x,TOP,z],[x,L,z])
    }
  }

  // Pass 2: x열마다 z방향 (밀도 절반)
  const cx = Math.max(2, Math.ceil(xN / 2))
  const cdx = cx > 1 ? (xMax - xMin) / (cx - 1) : 0
  for (let xi = 0; xi < cx; xi++) {
    const x = +(xMin + cdx * xi).toFixed(2)
    for (let zi = 0; zi < zN; zi++) {
      const zIdx = xi % 2 === 0 ? zi : zN - 1 - zi
      const z = +(zMin + dz * zIdx).toFixed(2)
      const L = lo(x, z)
      if (zi % 2 === 0) pts.push([x,L,z],[x,TOP,z])
      else pts.push([x,TOP,z],[x,L,z])
    }
  }

  return pts
}

// ═══ 방별 가구 장애물 (바운딩 박스) ═══
const OBS_LIVING = [
  { x1:-4.1, x2:-2.9, z1:-0.7, z2:-0.4, top:1.15 },  // TV거치대+스크린
  { x1:-4.4, x2:-2.6, z1:2.3,  z2:3.7,  top:0.55 },  // 소파
  { x1:-3.9, x2:-3.1, z1:1.5,  z2:1.9,  top:0.25 },  // 커피테이블
]
const OBS_KITCHEN = [
  { x1:1.0,  x2:4.0,  z1:3.0,  z2:3.65, top:0.85 },  // 카운터
  { x1:3.85, x2:4.55, z1:2.85, z2:3.55, top:1.7 },   // 냉장고
  { x1:1.75, x2:3.85, z1:1.5,  z2:2.1,  top:0.4 },   // 식탁
]
const OBS_BED1 = [
  { x1:3.4,  x2:5.2,  z1:-3.7, z2:-1.6, top:0.55 },  // 침대
  { x1:4.0,  x2:5.0,  z1:-1.4, z2:-0.8, top:2.0 },   // 옷장
  { x1:2.8,  x2:3.3,  z1:-3.2, z2:-2.8, top:0.53 },  // 협탁
]
const OBS_BED2 = [
  { x1:-4.6, x2:-3.4, z1:-3.7, z2:-1.8, top:0.5 },   // 침대
  { x1:-5.3, x2:-4.3, z1:-1.4, z2:-0.8, top:2.0 },   // 옷장
  { x1:-3.0, x2:-2.0, z1:-3.4, z2:-2.4, top:0.7 },   // 책상+의자
]
const OBS_BATH = [
  { x1:-0.35, x2:0.35, z1:-3.6, z2:-2.2, top:0.55 },  // 욕조
  { x1:-1.1,  x2:-0.5, z1:-1.2, z2:-0.8, top:0.9 },   // 세면대
  { x1:0.8,   x2:1.4,  z1:-2.2, z2:-1.8, top:0.48 },  // 변기
]

// ═══ 경로 (문 통과 + 가구 회피) ═══
const SCAN_WAYPOINTS = [
  [-0.25,1.5,5.0], [-0.25,1.5,3.5], [-0.25,1.5,2.5],

  // 거실
  [-5.0,1.5,0.0],
  ...genScan(-5.0, 0.0, 0.0, 3.0, 6, 5, OBS_LIVING),

  // 거실→주방
  [-2.5,1.5,0.5], [0.8,1.5,0.5],
  ...genScan(0.8, 4.0, 1.0, 3.0, 4, 4, OBS_KITCHEN),

  // 주방→침실2
  [2.5,1.5,0.5], [0.0,1.5,0.5],
  [-1.5,1.5,-0.3], [-3.4,1.5,-0.3], [-3.4,1.5,-1.0],
  ...genScan(-5.0, -1.8, -3.2, -1.0, 4, 4, OBS_BED2),

  // 침실2→화장실
  [-3.4,1.5,-1.0], [-3.4,1.5,-0.3],
  [-0.1,1.5,-0.3], [-0.1,1.5,-1.0],
  ...genScan(-1.2, 1.2, -3.2, -1.0, 3, 4, OBS_BATH),

  // 화장실→침실1
  [-0.1,1.5,-1.0], [-0.1,1.5,-0.3],
  [2.7,1.5,-0.3], [2.7,1.5,-1.0],
  ...genScan(1.8, 5.0, -3.2, -1.0, 4, 4, OBS_BED1),

  // ── 침실1→복도→발코니 ──
  [2.7,1.5,-1.0], [2.7,1.5,-0.3], [4.5,1.5,-0.5],
  // ── 발코니 스캔 (동벽 수직) ──
  [5.0,0.4,-1.0],[5.0,2.4,-1.0], [5.0,2.4,-0.25],[5.0,0.4,-0.25],
  [5.0,0.4,0.5],[5.0,2.4,0.5], [5.0,2.4,1.25],[5.0,0.4,1.25],
  [5.0,0.4,2.0],[5.0,2.4,2.0],

  // ── 복귀 (partition gap 경유) ──
  [4.5,1.5,-0.3], [0.0,1.5,-0.3], [0.0,1.5,0.5],
  [-0.25,1.5,2.5], [-0.25,1.5,3.5], [-0.25,1.5,5.0],
]

// 보간
const DRONE_PATH = (() => {
  const pts = []
  for (let i = 0; i < SCAN_WAYPOINTS.length - 1; i++) {
    const a = SCAN_WAYPOINTS[i], b = SCAN_WAYPOINTS[i + 1]
    const dist = Math.sqrt((b[0]-a[0])**2 + (b[1]-a[1])**2 + (b[2]-a[2])**2)
    const steps = Math.max(3, Math.ceil(dist * 2.5))
    for (let s = 0; s < steps; s++) {
      const t = s / steps
      pts.push([a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t])
    }
  }
  pts.push(SCAN_WAYPOINTS[SCAN_WAYPOINTS.length - 1])
  return pts
})()

// 드론 위치 → 현재 룸
const ROOM_BOUNDS = [
  { name:'거실',   xMin:-5.5, xMax:0.5,  zMin:-0.75, zMax:3.75 },
  { name:'주방',   xMin:0.5,  xMax:5.5,  zMin:0.5,   zMax:3.75 },
  { name:'침실 2', xMin:-5.5, xMax:-1.5, zMin:-3.75, zMax:-0.75 },
  { name:'화장실', xMin:-1.5, xMax:1.5,  zMin:-3.75, zMax:-0.75 },
  { name:'침실 1', xMin:1.5,  xMax:5.5,  zMin:-3.75, zMax:-0.75 },
]
function getRoomName(x, z) {
  for (const r of ROOM_BOUNDS) {
    if (x >= r.xMin && x <= r.xMax && z >= r.zMin && z <= r.zMax) return r.name
  }
  return z > 3.0 ? '현관' : '복도'
}

// ══════════════════════════════════════════════════════════
// 3D — 건물 구조
// ══════════════════════════════════════════════════════════

function WallSegment({ x1,z1,x2,z2,thickness,type }) {
  const mx=(x1+x2)/2, mz=(z1+z2)/2
  const len=Math.sqrt((x2-x1)**2+(z2-z1)**2)
  const ang=Math.atan2(z2-z1,x2-x1)
  if(len<0.05) return null
  return (
    <mesh position={[mx,APT_H/2,mz]} rotation={[0,-ang,0]}>
      <boxGeometry args={[len,APT_H,thickness]} />
      <meshStandardMaterial color={type==='outer'?'#9ca8b8':'#b0bac8'} roughness={0.75} />
    </mesh>
  )
}

function WindowFrame({ cx,cy,cz,w,h,rotY }) {
  return (
    <group position={[cx,cy,cz]} rotation={[0,rotY,0]}>
      <mesh><planeGeometry args={[w,h]} /><meshStandardMaterial color="#90d5ff" transparent opacity={0.25} side={THREE.DoubleSide} /></mesh>
      {[[0,h/2,w,0.04],[0,-h/2,w,0.04],[-w/2,0,0.04,h],[w/2,0,0.04,h],[0,0,0.04,h]].map(([x,y,fw,fh],i)=>(
        <mesh key={i} position={[x,y,0.01]}><planeGeometry args={[fw,fh]} /><meshStandardMaterial color="#94a3b8" side={THREE.DoubleSide} /></mesh>
      ))}
    </group>
  )
}

function FloorZone({ cx,cz,w,d,color,label }) {
  return (
    <group>
      <mesh position={[cx,0.01,cz]} rotation={[-Math.PI/2,0,0]}>
        <planeGeometry args={[w,d]} /><meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      {label && (
        <Html position={[cx,0.05,cz]} center distanceFactor={20}>
          <span className="text-[10px] font-bold text-slate-300/60 whitespace-nowrap pointer-events-none select-none tracking-[0.2em]">{label}</span>
        </Html>
      )}
    </group>
  )
}

function Ceiling() {
  return (
    <mesh position={[0,APT_H,0]} rotation={[-Math.PI/2,0,0]}>
      <planeGeometry args={[APT_W,APT_D]} />
      <meshStandardMaterial color="#8090a0" transparent opacity={0.08} side={THREE.DoubleSide} />
    </mesh>
  )
}

// ══════════════════════════════════════════════════════════
// 3D — 가구 (복합 메시로 현실적 형태)
// ══════════════════════════════════════════════════════════

/** L자형 소파 */
function Sofa({ position, rotation=[0,0,0] }) {
  return (
    <group position={position} rotation={rotation}>
      {/* 프레임 */}
      <mesh position={[0,0.12,0]}><boxGeometry args={[1.8,0.08,0.8]} /><meshStandardMaterial color="#7a6a55" roughness={0.9} /></mesh>
      {/* 좌석 쿠션 */}
      <mesh position={[0,0.2,0.02]}><boxGeometry args={[1.7,0.08,0.7]} /><meshStandardMaterial color="#7a7590" roughness={0.85} /></mesh>
      {/* 등받이 */}
      <mesh position={[0,0.4,-0.33]}><boxGeometry args={[1.8,0.36,0.14]} /><meshStandardMaterial color="#7a7590" roughness={0.85} /></mesh>
      {/* L자 연장 — 좌석 */}
      <mesh position={[-0.77,0.12,0.55]}><boxGeometry args={[0.26,0.08,0.75]} /><meshStandardMaterial color="#7a6a55" roughness={0.9} /></mesh>
      <mesh position={[-0.77,0.2,0.57]}><boxGeometry args={[0.22,0.08,0.65]} /><meshStandardMaterial color="#7a7590" roughness={0.85} /></mesh>
      {/* L자 등받이 */}
      <mesh position={[-0.83,0.4,0.55]}><boxGeometry args={[0.14,0.36,0.75]} /><meshStandardMaterial color="#7a7590" roughness={0.85} /></mesh>
      {/* 우측 팔걸이 */}
      <mesh position={[0.84,0.28,0]}><boxGeometry args={[0.12,0.14,0.8]} /><meshStandardMaterial color="#3a3530" /></mesh>
      {/* 다리 4개 */}
      {[[-0.8,-0.35],[0.8,-0.35],[0.8,0.35],[-0.8,0.85]].map(([lx,lz],i)=>(
        <mesh key={i} position={[lx,0.03,lz]}><cylinderGeometry args={[0.015,0.015,0.06,6]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
      ))}
    </group>
  )
}

/** 커피 테이블 — 상판 + 다리 */
function CoffeeTable({ position, rotation=[0,0,0] }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0,0.22,0]}><boxGeometry args={[0.8,0.03,0.45]} /><meshStandardMaterial color="#5a4a35" roughness={0.6} /></mesh>
      {[[-0.35,-0.18],[0.35,-0.18],[0.35,0.18],[-0.35,0.18]].map(([lx,lz],i)=>(
        <mesh key={i} position={[lx,0.1,lz]}><cylinderGeometry args={[0.012,0.012,0.2,6]} /><meshStandardMaterial color="#2a2218" /></mesh>
      ))}
    </group>
  )
}

/** TV 유닛 — 거치대 + 스크린 */
function TVUnit({ position, rotation=[0,0,0] }) {
  return (
    <group position={position} rotation={rotation}>
      {/* TV 스탠드 */}
      <mesh position={[0,0.22,0]}><boxGeometry args={[1.2,0.44,0.3]} /><meshStandardMaterial color="#2a2a2a" roughness={0.7} /></mesh>
      {/* TV 스크린 */}
      <mesh position={[0,0.82,0.1]}><boxGeometry args={[1.1,0.65,0.03]} /><meshStandardMaterial color="#0a0a0a" roughness={0.3} metalness={0.4} /></mesh>
      {/* 스크린 화면 (약간 발광) */}
      <mesh position={[0,0.82,0.12]}><planeGeometry args={[1.0,0.58]} /><meshStandardMaterial color="#1a1a3a" emissive="#1a1a3a" emissiveIntensity={0.3} /></mesh>
      {/* 스탠드 지지대 */}
      <mesh position={[0,0.47,0.05]}><boxGeometry args={[0.06,0.06,0.04]} /><meshStandardMaterial color="#333333" /></mesh>
    </group>
  )
}

/** 더블 침대 — 프레임 + 매트리스 + 헤드보드 + 베개 + 이불 */
function DoubleBed({ position, rotation=[0,0,0] }) {
  return (
    <group position={position} rotation={rotation}>
      {/* 프레임 */}
      <mesh position={[0,0.08,0]}><boxGeometry args={[1.8,0.16,2.1]} /><meshStandardMaterial color="#9a7a45" roughness={0.8} /></mesh>
      {/* 매트리스 */}
      <mesh position={[0,0.24,0]}><boxGeometry args={[1.6,0.16,2.0]} /><meshStandardMaterial color="#f0ebe0" roughness={0.9} /></mesh>
      {/* 헤드보드 */}
      <mesh position={[0,0.55,-0.98]}><boxGeometry args={[1.8,0.8,0.06]} /><meshStandardMaterial color="#8a6535" roughness={0.7} /></mesh>
      {/* 베개 2개 */}
      {[-0.35,0.35].map((px,i)=>(
        <mesh key={i} position={[px,0.36,-0.65]}><boxGeometry args={[0.5,0.08,0.3]} /><meshStandardMaterial color="#f5f0e8" roughness={0.95} /></mesh>
      ))}
      {/* 이불 */}
      <mesh position={[0,0.36,0.15]}><boxGeometry args={[1.5,0.06,1.3]} /><meshStandardMaterial color="#6a7a8a" roughness={0.9} /></mesh>
    </group>
  )
}

/** 싱글 침대 */
function SingleBed({ position, rotation=[0,0,0] }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0,0.08,0]}><boxGeometry args={[1.2,0.16,1.9]} /><meshStandardMaterial color="#9a7a45" roughness={0.8} /></mesh>
      <mesh position={[0,0.22,0]}><boxGeometry args={[1.0,0.14,1.8]} /><meshStandardMaterial color="#f0ebe0" roughness={0.9} /></mesh>
      <mesh position={[0,0.5,-0.88]}><boxGeometry args={[1.2,0.7,0.06]} /><meshStandardMaterial color="#8a6535" roughness={0.7} /></mesh>
      <mesh position={[0,0.32,-0.6]}><boxGeometry args={[0.45,0.07,0.25]} /><meshStandardMaterial color="#f5f0e8" /></mesh>
      <mesh position={[0,0.32,0.1]}><boxGeometry args={[0.9,0.05,1.1]} /><meshStandardMaterial color="#5a6a7a" roughness={0.9} /></mesh>
    </group>
  )
}

/** 옷장 — 본체 + 손잡이 */
function Wardrobe({ position, rotation=[0,0,0] }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0,1.0,0]}><boxGeometry args={[1.0,2.0,0.55]} /><meshStandardMaterial color="#8a7050" roughness={0.8} /></mesh>
      {/* 도어 라인 */}
      <mesh position={[0,1.0,0.28]}><boxGeometry args={[0.01,1.8,0.01]} /><meshStandardMaterial color="#2a1a0a" /></mesh>
      {/* 손잡이 */}
      {[-0.08,0.08].map((hx,i)=>(
        <mesh key={i} position={[hx,1.0,0.29]}><cylinderGeometry args={[0.01,0.01,0.12,6]} rotation={[Math.PI/2,0,0]} /><meshStandardMaterial color="#aaa" metalness={0.8} /></mesh>
      ))}
    </group>
  )
}

/** 주방 — 남벽 카운터 + 상부장 + 냉장고 */
function KitchenUnit() {
  return (
    <group>
      {/* 하부 카운터 (남벽 z=3.75 따라) */}
      <mesh position={[2.5,0.4,3.35]}><boxGeometry args={[3.0,0.8,0.55]} /><meshStandardMaterial color="#606060" roughness={0.6} /></mesh>
      {/* 카운터 상판 */}
      <mesh position={[2.5,0.82,3.35]}><boxGeometry args={[3.1,0.03,0.6]} /><meshStandardMaterial color="#888" roughness={0.3} metalness={0.2} /></mesh>
      {/* 싱크대 */}
      <mesh position={[2.0,0.84,3.3]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[0.18,16]} /><meshStandardMaterial color="#555" roughness={0.4} /></mesh>
      {/* 가스레인지 */}
      {[[-0.15,0],[0.15,0]].map(([ox,oz],i)=>(
        <mesh key={i} position={[3.2+ox,0.84,3.3+oz]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[0.06,0.09,16]} /><meshStandardMaterial color="#333" /></mesh>
      ))}
      {/* 상부장 */}
      <mesh position={[2.5,2.15,3.55]}><boxGeometry args={[3.0,0.55,0.32]} /><meshStandardMaterial color="#505050" roughness={0.7} /></mesh>
      {/* 냉장고 (카운터 동쪽 끝, 주방 바닥 영역 내) */}
      <mesh position={[4.2,0.85,3.2]}><boxGeometry args={[0.7,1.7,0.65]} /><meshStandardMaterial color="#d0d0d0" roughness={0.4} metalness={0.3} /></mesh>
      <mesh position={[3.85,0.85,3.2]}><boxGeometry args={[0.02,0.4,0.03]} /><meshStandardMaterial color="#aaa" metalness={0.6} /></mesh>
      <mesh position={[3.85,1.4,3.2]}><boxGeometry args={[0.02,0.25,0.03]} /><meshStandardMaterial color="#aaa" metalness={0.6} /></mesh>
    </group>
  )
}

/** 다이닝 테이블 + 의자 2개 */
function DiningSet({ position, rotation=[0,0,0] }) {
  return (
    <group position={position} rotation={rotation}>
      {/* 테이블 상판 */}
      <mesh position={[0,0.37,0]}><boxGeometry args={[0.9,0.03,0.6]} /><meshStandardMaterial color="#6a5535" roughness={0.6} /></mesh>
      {/* 다리 */}
      {[[-0.38,-0.25],[0.38,-0.25],[0.38,0.25],[-0.38,0.25]].map(([lx,lz],i)=>(
        <mesh key={i} position={[lx,0.18,lz]}><cylinderGeometry args={[0.015,0.02,0.36,6]} /><meshStandardMaterial color="#4a3520" /></mesh>
      ))}
      {/* 의자 2개 */}
      {[-0.25,0.25].map((cz,i)=>(
        <group key={i} position={[i===0?-0.7:0.7,0,cz]}>
          <mesh position={[0,0.22,0]}><boxGeometry args={[0.35,0.03,0.35]} /><meshStandardMaterial color="#5a4a35" /></mesh>
          <mesh position={[i===0?0.15:-0.15,0.4,0]}><boxGeometry args={[0.03,0.35,0.35]} /><meshStandardMaterial color="#5a4a35" /></mesh>
          {[[-0.14,-0.14],[0.14,-0.14],[0.14,0.14],[-0.14,0.14]].map(([lx,lz],j)=>(
            <mesh key={j} position={[lx,0.1,lz]}><cylinderGeometry args={[0.01,0.01,0.2,4]} /><meshStandardMaterial color="#3a2a18" /></mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

/** 욕조 — 외부 + 내부 공간 */
function Bathtub({ position, rotation=[0,0,0] }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0,0.25,0]}><boxGeometry args={[0.7,0.5,1.3]} /><meshStandardMaterial color="#e8e8e8" roughness={0.4} /></mesh>
      <mesh position={[0,0.32,0]}><boxGeometry args={[0.55,0.4,1.15]} /><meshStandardMaterial color="#d0dde8" roughness={0.3} /></mesh>
      {/* 수도꼭지 */}
      <mesh position={[0,0.55,-0.55]}><cylinderGeometry args={[0.02,0.02,0.1,8]} /><meshStandardMaterial color="#aaa" metalness={0.8} /></mesh>
      <mesh position={[0,0.58,-0.55]} rotation={[0,0,Math.PI/4]}><cylinderGeometry args={[0.015,0.015,0.08,8]} rotation={[Math.PI/2,0,0]} /><meshStandardMaterial color="#aaa" metalness={0.8} /></mesh>
    </group>
  )
}

/** 변기 */
function ToiletBowl({ position, rotation=[0,0,0] }) {
  return (
    <group position={position} rotation={rotation}>
      {/* 볼 */}
      <mesh position={[0,0.18,0.05]}><cylinderGeometry args={[0.17,0.15,0.36,12]} /><meshStandardMaterial color="#f0f0f0" roughness={0.3} /></mesh>
      {/* 시트 */}
      <mesh position={[0,0.37,0.05]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[0.08,0.16,16]} /><meshStandardMaterial color="#e5e5e5" side={THREE.DoubleSide} /></mesh>
      {/* 탱크 */}
      <mesh position={[0,0.3,-0.18]}><boxGeometry args={[0.3,0.4,0.12]} /><meshStandardMaterial color="#f0f0f0" roughness={0.3} /></mesh>
      {/* 레버 */}
      <mesh position={[0.12,0.48,-0.15]}><boxGeometry args={[0.06,0.02,0.02]} /><meshStandardMaterial color="#ccc" metalness={0.6} /></mesh>
    </group>
  )
}

/** 세면대 + 거울 */
function WashBasin({ position, rotation=[0,0,0] }) {
  return (
    <group position={position} rotation={rotation}>
      {/* 세면대 본체 */}
      <mesh position={[0,0.4,0]}><boxGeometry args={[0.5,0.08,0.4]} /><meshStandardMaterial color="#e8e8e8" roughness={0.3} /></mesh>
      {/* 세면대 볼 */}
      <mesh position={[0,0.42,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[0.12,16]} /><meshStandardMaterial color="#c0d0e0" roughness={0.2} /></mesh>
      {/* 하부 수납 */}
      <mesh position={[0,0.2,0]}><boxGeometry args={[0.48,0.35,0.38]} /><meshStandardMaterial color="#555" roughness={0.7} /></mesh>
      {/* 거울 */}
      <mesh position={[0,0.9,0.19]}><boxGeometry args={[0.45,0.6,0.02]} /><meshStandardMaterial color="#aaddee" roughness={0.1} metalness={0.6} /></mesh>
      {/* 수도꼭지 */}
      <mesh position={[0,0.48,-0.1]}><cylinderGeometry args={[0.012,0.012,0.08,6]} /><meshStandardMaterial color="#bbb" metalness={0.8} /></mesh>
    </group>
  )
}

/** 책상 + 의자 */
function DeskWithChair({ position, rotation=[0,0,0] }) {
  return (
    <group position={position} rotation={rotation}>
      {/* 상판 */}
      <mesh position={[0,0.38,0]}><boxGeometry args={[0.9,0.03,0.5]} /><meshStandardMaterial color="#5a4a38" roughness={0.6} /></mesh>
      {/* 다리 */}
      {[[-0.4,-0.22],[0.4,-0.22],[0.4,0.22],[-0.4,0.22]].map(([lx,lz],i)=>(
        <mesh key={i} position={[lx,0.19,lz]}><boxGeometry args={[0.03,0.38,0.03]} /><meshStandardMaterial color="#3a2a18" /></mesh>
      ))}
      {/* 서랍 */}
      <mesh position={[0.2,0.28,0]}><boxGeometry args={[0.35,0.12,0.42]} /><meshStandardMaterial color="#4a3a28" /></mesh>
      <mesh position={[0.2,0.28,-0.22]}><boxGeometry args={[0.08,0.02,0.01]} /><meshStandardMaterial color="#aaa" metalness={0.6} /></mesh>
      {/* 의자 */}
      <mesh position={[0,0.22,0.5]}><boxGeometry args={[0.38,0.03,0.38]} /><meshStandardMaterial color="#4a4a55" /></mesh>
      <mesh position={[0,0.42,0.68]}><boxGeometry args={[0.38,0.35,0.03]} /><meshStandardMaterial color="#4a4a55" /></mesh>
      {[[-0.15,0.32],[0.15,0.32],[0.15,0.68],[-0.15,0.68]].map(([lx,lz],i)=>(
        <mesh key={i} position={[lx,0.1,lz]}><cylinderGeometry args={[0.012,0.012,0.2,6]} /><meshStandardMaterial color="#222" /></mesh>
      ))}
    </group>
  )
}

/** 신발장 */
function ShoeRack({ position, rotation=[0,0,0] }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0,1.0,0]}><boxGeometry args={[1.2,2.0,0.35]} /><meshStandardMaterial color="#4a4035" roughness={0.8} /></mesh>
      {/* 도어 라인 */}
      <mesh position={[0,1.0,-0.18]}><boxGeometry args={[0.01,1.8,0.01]} /><meshStandardMaterial color="#2a2015" /></mesh>
      {/* 손잡이 */}
      {[-0.06,0.06].map((hx,i)=>(
        <mesh key={i} position={[hx,1.0,-0.19]}><boxGeometry args={[0.02,0.1,0.02]} /><meshStandardMaterial color="#aaa" metalness={0.7} /></mesh>
      ))}
      {/* 하단 열린 선반 (신발 보이는) */}
      <mesh position={[0,0.04,-0.02]}><boxGeometry args={[1.1,0.08,0.3]} /><meshStandardMaterial color="#3a3025" /></mesh>
    </group>
  )
}

/** 협탁 */
function NightStand({ position, rotation=[0,0,0] }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0,0.25,0]}><boxGeometry args={[0.45,0.5,0.4]} /><meshStandardMaterial color="#4a3a30" roughness={0.7} /></mesh>
      <mesh position={[0,0.51,0]}><boxGeometry args={[0.46,0.02,0.41]} /><meshStandardMaterial color="#3a2a20" /></mesh>
      {/* 서랍 손잡이 */}
      <mesh position={[0,0.3,-0.21]}><boxGeometry args={[0.1,0.02,0.01]} /><meshStandardMaterial color="#aaa" metalness={0.6} /></mesh>
    </group>
  )
}

/**
 * 전체 가구 배치 — 바운딩 박스 정밀 계산 기반
 *
 * 가구별 실측 (기본 orientation, position 기준 offset):
 *   Sofa:       x±0.90, z -0.40~+0.93  (rot PI → z -0.93~+0.40)
 *   TVUnit:     x±0.60, z -0.15~+0.12
 *   CoffeeTable:x±0.40, z±0.23
 *   DoubleBed:  x±0.90, z -1.01~+1.05
 *   SingleBed:  x±0.60, z -0.91~+0.95
 *   Wardrobe:   x±0.50, z±0.28  (door +z, rot PI/2→ x±0.28 z±0.50)
 *   NightStand: x±0.23, z±0.20
 *   ToiletBowl: x±0.17, z -0.24~+0.22
 *   Bathtub:    x±0.35, z±0.65
 *   WashBasin:  x±0.25, z±0.20  (mirror +z)
 *   DeskChair:  x±0.45, z -0.25~+0.70
 *   ShoeRack:   x±0.60, z±0.18
 *   DiningSet:  x±1.05(의자포함), z±0.30
 *
 * 벽 내면 (벽 center ± half thickness):
 *   외벽 inner face: ±(wall_center ∓ 0.06)
 *   내벽 inner face: ±(wall_center ∓ 0.04)
 */
function ApartmentFurniture() {
  // 회전 최소화 원칙: 기본방향(back=-z, front=+z)이 벽에 맞으면 rotation 없음
  return (
    <group>
      {/* ── 거실 ── TV(screen→+z), 소파(rot PI→front -z=TV방향) */}
      <TVUnit position={[-3.5, 0, -0.55]} />
      <Sofa position={[-3.5, 0, 3.27]} rotation={[0, Math.PI, 0]} />
      <CoffeeTable position={[-3.5, 0, 1.7]} />

      {/* ── 주방 ── */}
      <KitchenUnit />
      <DiningSet position={[2.8, 0, 1.8]} />

      {/* ── 침실1 ── 침대: head(-z)→북벽, 옷장: 복도벽에 rot PI(door→-z=방안) */}
      <DoubleBed position={[4.3, 0, -2.66]} />
      <NightStand position={[3.0, 0, -3.0]} />
      <Wardrobe position={[4.5, 0, -1.1]} rotation={[0, Math.PI, 0]} />

      {/* ── 침실2 ── 옷장: 복도벽 서쪽 코너, rot PI */}
      <SingleBed position={[-4.0, 0, -2.76]} />
      <DeskWithChair position={[-2.5, 0, -3.1]} />
      <Wardrobe position={[-4.8, 0, -1.1]} rotation={[0, Math.PI, 0]} />

      {/* ── 화장실 ── 세면대: 문 옆 남벽에 밀착(mirror→+z=벽), 변기: 동쪽 no rot */}
      <WashBasin position={[-0.8, 0, -1.0]} />
      <ToiletBowl position={[1.1, 0, -2.0]} rotation={[0, -Math.PI/2, 0]} />
      <Bathtub position={[0.0, 0, -2.9]} />

      {/* ── 현관 ── 신발장 rot PI/2→남북 파티션 */}
      <ShoeRack position={[-1.1, 0, 3.1]} rotation={[0, -Math.PI/2, 0]} />
    </group>
  )
}

// ══════════════════════════════════════════════════════════
// 3D — SLAM 포인트 클라우드
// ══════════════════════════════════════════════════════════

function ApartmentPointCloud() {
  const { positions, colors } = useMemo(() => {
    const count = 18000
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    const hW = APT_W / 2, hD = APT_D / 2

    for (let i = 0; i < count; i++) {
      const r = Math.random()
      let x, y, z
      const j = () => (Math.random() - 0.5) * 0.04

      if (r < 0.18) { x=(Math.random()-0.5)*APT_W; y=j()*0.3; z=(Math.random()-0.5)*APT_D }
      else if (r < 0.28) { x=(Math.random()-0.5)*APT_W; y=APT_H+j()*0.3; z=(Math.random()-0.5)*APT_D }
      else if (r < 0.58) {
        const w = Math.floor(Math.random() * 4)
        if(w===0){x=(Math.random()-0.5)*APT_W;y=Math.random()*APT_H;z=-hD+j()}
        else if(w===1){x=(Math.random()-0.5)*APT_W;y=Math.random()*APT_H;z=hD+j()}
        else if(w===2){x=-hW+j();y=Math.random()*APT_H;z=(Math.random()-0.5)*APT_D}
        else{x=hW+j();y=Math.random()*APT_H;z=(Math.random()-0.5)*APT_D}
      } else if (r < 0.78) {
        const iw = Math.floor(Math.random() * 3)
        if(iw===0){x=(Math.random()-0.5)*APT_W;y=Math.random()*APT_H;z=-0.75+j()}
        else if(iw===1){x=-1.5+j();y=Math.random()*APT_H;z=-hD+Math.random()*3}
        else{x=1.5+j();y=Math.random()*APT_H;z=-hD+Math.random()*3}
      } else {
        // 가구 근처 랜덤
        const spots = [[-4.3,0.3,1.0],[-1.5,0.5,-0.1],[3.5,0.3,-2.6],[-3.5,0.3,-2.3],[-0.2,0.3,-3.0],[1.0,0.5,3.2]]
        const sp = spots[Math.floor(Math.random()*spots.length)]
        x=sp[0]+(Math.random()-0.5)*1.5; y=sp[1]+Math.random()*0.5; z=sp[2]+(Math.random()-0.5)*1.5
      }
      pos[i*3]=x; pos[i*3+1]=y; pos[i*3+2]=z
      const t = Math.max(0,Math.min(1,y/APT_H))
      col[i*3]=0.3+0.2*(1-t); col[i*3+1]=0.7+0.25*t; col[i*3+2]=0.65+0.3*t
    }
    return { positions: pos, colors: col }
  }, [])

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length/3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={colors.length/3} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.03} vertexColors sizeAttenuation transparent opacity={0.75} />
    </points>
  )
}

// ══════════════════════════════════════════════════════════
// 3D — 시뮬레이션 (드론 + 하자 발견)
// ══════════════════════════════════════════════════════════

/** 드론 비행 + 경로 트레일 */
function DroneSimulation({ isActive, isPaused, progressRef, discoveredIdsRef, defects, onDiscover, onComplete, droneXRef, droneZRef }) {
  const droneRef = useRef()
  const [trailPoints, setTrailPoints] = useState([])
  const trailAccum = useRef([])
  const lastSync = useRef(0)
  const completedRef = useRef(false)

  // 리셋
  useEffect(() => {
    if (isActive) {
      progressRef.current = 0
      trailAccum.current = []
      setTrailPoints([])
      completedRef.current = false
    }
  }, [isActive, progressRef])

  useFrame((_, delta) => {
    if (!isActive || !droneRef.current || completedRef.current) return
    if (isPaused) return  // 일시정지: 드론 위치 유지, 진행 멈춤

    progressRef.current = Math.min(1, progressRef.current + delta * 0.012)
    const p = progressRef.current

    // 경로 위치 보간
    const totalIdx = p * (DRONE_PATH.length - 1)
    const idx = Math.floor(totalIdx)
    const next = Math.min(idx + 1, DRONE_PATH.length - 1)
    const t = totalIdx - idx
    const [ax, ay, az] = DRONE_PATH[idx]
    const [bx, by, bz] = DRONE_PATH[next]
    const x = ax + (bx - ax) * t
    const y = ay + (by - ay) * t
    const z = az + (bz - az) * t

    droneRef.current.position.set(x, y, z)
    if (droneXRef) droneXRef.current = x
    if (droneZRef) droneZRef.current = z

    // 진행 방향
    const dx = bx - ax, dz = bz - az
    if (Math.abs(dx) + Math.abs(dz) > 0.01) {
      droneRef.current.rotation.y = -Math.atan2(dz, dx) + Math.PI / 2
    }

    // 트레일 축적
    trailAccum.current.push([x, y, z])
    const now = Date.now()
    if (now - lastSync.current > 120) {
      setTrailPoints([...trailAccum.current])
      lastSync.current = now
    }

    // 근접 기반 하자 발견 — 드론이 0.7m 이내 접근 시 탐지
    const DR = 0.7
    defects.forEach(defect => {
      if (discoveredIdsRef.current.has(defect.id)) return
      const ddx = x - defect.lidar_x
      const ddy = y - defect.lidar_z   // lidar_z → Three.js Y
      const ddz = z - defect.lidar_y   // lidar_y → Three.js Z
      if (ddx*ddx + ddy*ddy + ddz*ddz < DR*DR) onDiscover(defect)
    })

    // 완료
    if (p >= 1.0 && !completedRef.current) {
      completedRef.current = true
      setTrailPoints([...trailAccum.current])
      onComplete()
    }
  })

  return (
    <>
      {/* 비행 트레일 */}
      {trailPoints.length >= 2 && (
        <>
          <Line points={trailPoints} color="#ff9020" lineWidth={2} transparent opacity={0.55} />
          <Line points={trailPoints.map(([px,,pz]) => [px,0.03,pz])} color="#ff9020" lineWidth={0.8} transparent opacity={0.15} />
        </>
      )}
      {/* 쿼드콥터 드론 (1.5배 스케일, 시안 강조) */}
      <group ref={droneRef} scale={1.5}>
        {/* 중앙 바디 */}
        <mesh>
          <boxGeometry args={[0.2,0.05,0.2]} />
          <meshStandardMaterial color="#e0e0e0" roughness={0.4} />
        </mesh>
        <mesh position={[0,0.035,0]}>
          <boxGeometry args={[0.12,0.02,0.12]} />
          <meshStandardMaterial color="#f0f0f0" />
        </mesh>
        {/* 상단 LED 바 */}
        <mesh position={[0,0.05,0]}>
          <boxGeometry args={[0.08,0.008,0.04]} />
          <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={1.5} />
        </mesh>

        {/* 4암 + 모터 + 프로펠러 + 가드 + LED */}
        {[
          { dx:1, dz:1, front:true },
          { dx:-1,dz:1, front:true },
          { dx:-1,dz:-1,front:false },
          { dx:1, dz:-1,front:false },
        ].map(({ dx, dz, front }, i) => {
          const L = 0.26
          const tx = dx * L * 0.707, tz = dz * L * 0.707
          const ang = Math.atan2(tz, tx)
          return (
            <group key={i}>
              {/* 암 */}
              <mesh position={[tx/2,0,tz/2]} rotation={[0,-ang,0]}>
                <boxGeometry args={[L,0.018,0.025]} />
                <meshStandardMaterial color="#ccc" />
              </mesh>
              {/* 모터 */}
              <mesh position={[tx,0.022,tz]}>
                <cylinderGeometry args={[0.025,0.025,0.028,8]} />
                <meshStandardMaterial color="#888" />
              </mesh>
              {/* 프로펠러 (블러 디스크) */}
              <mesh position={[tx,0.042,tz]}>
                <cylinderGeometry args={[0.09,0.09,0.005,20]} />
                <meshStandardMaterial color={front ? '#00e5ff' : '#90a0b0'} transparent opacity={0.3} />
              </mesh>
              {/* 프로펠러 가드 */}
              <mesh position={[tx,0.035,tz]} rotation={[Math.PI/2,0,0]}>
                <torusGeometry args={[0.095,0.005,6,20]} />
                <meshStandardMaterial color="#aaa" />
              </mesh>
              {/* LED */}
              <mesh position={[tx,-0.018,tz]}>
                <sphereGeometry args={[0.01,8,8]} />
                <meshStandardMaterial color={front ? '#00e5ff' : '#ff4444'} emissive={front ? '#00e5ff' : '#ff4444'} emissiveIntensity={2.0} />
              </mesh>
            </group>
          )
        })}

        {/* 카메라 짐벌 */}
        <group position={[0,-0.04,0.03]}>
          <mesh><boxGeometry args={[0.035,0.025,0.035]} /><meshStandardMaterial color="#555" /></mesh>
          <mesh position={[0,-0.012,0.015]}>
            <sphereGeometry args={[0.014,10,10]} />
            <meshStandardMaterial color="#222" roughness={0.1} metalness={0.8} />
          </mesh>
        </group>

        {/* 랜딩 스키드 */}
        {[-0.11,0.11].map((xo,i)=>(
          <group key={`sk${i}`}>
            <mesh position={[xo,-0.05,-0.08]}><cylinderGeometry args={[0.004,0.004,0.055,4]} /><meshStandardMaterial color="#999" /></mesh>
            <mesh position={[xo,-0.05,0.08]}><cylinderGeometry args={[0.004,0.004,0.055,4]} /><meshStandardMaterial color="#999" /></mesh>
            <mesh position={[xo,-0.078,0]}><boxGeometry args={[0.006,0.006,0.2]} /><meshStandardMaterial color="#999" /></mesh>
          </group>
        ))}

        {/* LiDAR 빔 (밝은 시안) */}
        <mesh position={[0,-0.45,0]}>
          <coneGeometry args={[0.18,0.9,4]} />
          <meshBasicMaterial color="#00e5ff" transparent opacity={0.04} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </>
  )
}

/** 하자 마커 — 발견 시 팝인 + 펄스 애니메이션 */
function DiscoveredMarker({ defect, discoveredAt, isSelected, onSelect }) {
  const [hovered, setHovered] = useState(false)
  const meshRef = useRef()
  const pulseRef = useRef()
  const color = SEVERITY_COLORS[defect.severity]
  const x = defect.lidar_x, y = defect.lidar_z, z = defect.lidar_y

  useFrame(() => {
    if (!meshRef.current) return
    const age = (Date.now() - discoveredAt) / 1000
    const pop = Math.min(1, age / 0.35)
    let s = pop
    if (isSelected) s = pop * (1.3 + Math.sin(Date.now() * 0.005) * 0.15)
    else if (hovered) s = pop * 1.35
    meshRef.current.scale.setScalar(s)

    if (pulseRef.current) {
      if (age < 2.5) {
        pulseRef.current.visible = true
        pulseRef.current.scale.setScalar(1 + age * 2.5)
        pulseRef.current.material.opacity = Math.max(0, 0.6 - age * 0.24)
      } else {
        pulseRef.current.visible = false
      }
    }
  })

  return (
    <group position={[x, y, z]}>
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onSelect(defect) }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isSelected ? 1.0 : hovered ? 0.5 : 0.25} />
      </mesh>
      {/* 발견 펄스 */}
      <mesh ref={pulseRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.15, 0.22, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      {/* 바닥까지 수직선 */}
      {y > 0.1 && (
        <mesh position={[0, -y / 2, 0]}>
          <cylinderGeometry args={[0.004, 0.004, y, 4]} />
          <meshBasicMaterial color={color} transparent opacity={0.15} />
        </mesh>
      )}
      {/* 툴팁 */}
      {(hovered || isSelected) && (
        <Html distanceFactor={8} zIndexRange={[100, 0]}>
          <div className="bg-slate-900/95 border border-slate-600 rounded-lg p-2.5 text-xs text-white whitespace-nowrap shadow-xl backdrop-blur-sm min-w-[160px]">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-slate-400 text-[10px]">{defect.category_code}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: color + '30', color }}>{SEVERITY_LABELS[defect.severity]}</span>
            </div>
            <div className="font-semibold mt-1">{defect.defect_type}</div>
            <div className="text-slate-400 mt-1">{defect.location}</div>
            <div className="text-slate-500 mt-0.5">면적 {defect.area}m² · 신뢰도 {(defect.confidence * 100).toFixed(0)}%</div>
          </div>
        </Html>
      )}
    </group>
  )
}

// ══════════════════════════════════════════════════════════
// 3D — 전체 씬
// ══════════════════════════════════════════════════════════

function Scene3D({ scanPhase, progressRef, discoveredIdsRef, discoveredList, selectedDefect, defects, onDiscover, onComplete, onSelectDefect, droneXRef, droneZRef }) {
  const isActive = scanPhase === 'scanning' || scanPhase === 'paused'
  const isPaused = scanPhase === 'paused'

  return (
    <Canvas gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.8 }}>
      <color attach="background" args={['#141824']} />
      <PerspectiveCamera makeDefault position={[14, 10, 14]} fov={45} />
      <OrbitControls enablePan enableZoom enableRotate target={[0, 1.2, 0]} maxPolarAngle={Math.PI * 0.48} minDistance={4} maxDistance={30} autoRotate={scanPhase === 'waiting'} autoRotateSpeed={0.3} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[8, 12, 6]} intensity={1.0} />
      <directionalLight position={[-5, 10, -4]} intensity={0.5} />
      <pointLight position={[-2.5, 2.2, 1.5]} intensity={0.5} color="#fde68a" distance={10} />
      <pointLight position={[3.5, 2.2, -2.5]} intensity={0.3} color="#e0e7ff" distance={8} />
      <pointLight position={[0, 2.5, -2.0]} intensity={0.3} color="#ffffff" distance={8} />
      <fog attach="fog" args={['#141824', 30, 50]} />

      <Suspense fallback={null}>
        <gridHelper args={[20, 40, '#3355aa', '#1a2540']} position={[0, -0.01, 0]} />
        {FLOOR_ZONES.map((zone, i) => <FloorZone key={i} {...zone} />)}
        <Ceiling />
        {WALLS.map((w, i) => <WallSegment key={i} x1={w[0]} z1={w[1]} x2={w[2]} z2={w[3]} thickness={w[4]} type={w[5]} />)}
        {WINDOWS.map((win, i) => <WindowFrame key={i} {...win} />)}
        <ApartmentFurniture />
        <ApartmentPointCloud />

        {/* 발견된 하자 마커 */}
        {discoveredList.map((d) => (
          <DiscoveredMarker key={d.id} defect={d} discoveredAt={d.discoveredAt} isSelected={selectedDefect?.id === d.id} onSelect={onSelectDefect} />
        ))}

        {/* 드론 시뮬레이션 */}
        <DroneSimulation isActive={isActive} isPaused={isPaused} progressRef={progressRef} discoveredIdsRef={discoveredIdsRef} defects={defects} onDiscover={onDiscover} onComplete={onComplete} droneXRef={droneXRef} droneZRef={droneZRef} />
      </Suspense>
    </Canvas>
  )
}

// ══════════════════════════════════════════════════════════
// UI 컴포넌트
// ══════════════════════════════════════════════════════════

function StatCard({ icon: Icon, label, value, sub, color = 'text-white' }) {
  return (
    <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
      <div className="flex items-center gap-2 text-slate-400 text-xs mb-1"><Icon size={13} /><span>{label}</span></div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  )
}

function SeverityBadge({ severity }) {
  const cm = { HIGH:'bg-red-500/20 text-red-400 border-red-500/30', MED:'bg-orange-500/20 text-orange-400 border-orange-500/30', LOW:'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' }
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${cm[severity]}`}>{SEVERITY_LABELS[severity]}</span>
}

function DefectListItem({ defect, isSelected, isNew, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(defect)}
      className={`w-full text-left p-3 rounded-lg border transition-all ${
        isNew ? 'animate-pulse ring-1 ring-emerald-500/40' : ''
      } ${isSelected ? 'bg-slate-700/60 border-indigo-500/50 ring-1 ring-indigo-500/30' : 'bg-slate-800/40 border-slate-700/30 hover:bg-slate-700/40'}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-[11px] text-slate-400">{defect.category_code}</span>
        <SeverityBadge severity={defect.severity} />
      </div>
      <div className="text-sm font-medium text-white">{defect.defect_type}</div>
      <div className="text-xs text-slate-400 mt-1">{defect.location}</div>
      {isSelected && (
        <div className="mt-2 pt-2 border-t border-slate-700/50 space-y-1">
          <div className="text-xs text-slate-300">{defect.description}</div>
          <div className="flex gap-3 text-[10px] text-slate-500 mt-1">
            <span>면적: {defect.area}m²</span>
            <span>신뢰도: {(defect.confidence * 100).toFixed(0)}%</span>
            <span>공종: {defect.trade}</span>
          </div>
        </div>
      )}
    </button>
  )
}

function LegendDot({ color, label }) {
  return <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} /><span>{label}</span></div>
}

// ══════════════════════════════════════════════════════════
// 메인 페이지
// ══════════════════════════════════════════════════════════

export default function SampleReport() {
  const navigate = useNavigate()
  const [selectedDefect, setSelectedDefect] = useState(null)
  const [panelOpen, setPanelOpen] = useState(true)

  // 무작위 하자 데이터 (매 시뮬레이션마다 새로 생성)
  const [sampleDefects, setSampleDefects] = useState(() => generateRandomDefects())

  // 시뮬레이션 상태
  const [scanPhase, setScanPhase] = useState('waiting') // waiting | scanning | paused | complete
  const [discoveredList, setDiscoveredList] = useState([])
  const [scanProgress, setScanProgress] = useState(0)
  const [currentRoom, setCurrentRoom] = useState('')
  const progressRef = useRef(0)
  const discoveredIdsRef = useRef(new Set())
  const listEndRef = useRef(null)

  // 자동 시작 (2초 후)
  useEffect(() => {
    const timer = setTimeout(() => setScanPhase('scanning'), 2000)
    return () => clearTimeout(timer)
  }, [])

  // 드론 위치 기반 UI 동기화
  const droneXRef = useRef(0), droneZRef = useRef(0)
  useEffect(() => {
    if (scanPhase !== 'scanning') return
    const interval = setInterval(() => {
      setScanProgress(progressRef.current)
      setCurrentRoom(getRoomName(droneXRef.current, droneZRef.current))
    }, 200)
    return () => clearInterval(interval)
  }, [scanPhase])

  // 하자 발견 콜백
  const handleDiscover = useCallback((defect) => {
    if (discoveredIdsRef.current.has(defect.id)) return
    discoveredIdsRef.current.add(defect.id)
    setDiscoveredList(prev => [...prev, { ...defect, discoveredAt: Date.now() }])
  }, [])

  // 스캔 완료
  const handleComplete = useCallback(() => {
    setScanPhase('complete')
    setScanProgress(1)
    setCurrentRoom('')
  }, [])

  // 일시정지 / 재개
  const handlePause = useCallback(() => setScanPhase('paused'), [])
  const handleResume = useCallback(() => setScanPhase('scanning'), [])

  // 중지 (현재 위치에서 스캔 종료, 발견된 하자 유지)
  const handleStop = useCallback(() => {
    setScanPhase('complete')
    setScanProgress(progressRef.current)
    setCurrentRoom('')
  }, [])

  // 처음부터 다시 스캔 (하자도 새로 생성)
  const handleRestart = useCallback(() => {
    setDiscoveredList([])
    discoveredIdsRef.current.clear()
    setSelectedDefect(null)
    setScanProgress(0)
    setCurrentRoom('')
    setSampleDefects(generateRandomDefects())
    setScanPhase('waiting')
    setTimeout(() => setScanPhase('scanning'), 1000)
  }, [])

  // 새 하자 발견 시 목록 스크롤
  useEffect(() => {
    if (listEndRef.current) {
      listEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [discoveredList.length])

  const highCount = discoveredList.filter(d => d.severity === 'HIGH').length
  const medCount = discoveredList.filter(d => d.severity === 'MED').length
  const lowCount = discoveredList.filter(d => d.severity === 'LOW').length
  const totalArea = discoveredList.reduce((s, d) => s + d.area, 0)

  return (
    <div className="h-screen w-screen bg-slate-950 text-white flex flex-col overflow-hidden">
      {/* 상단 바 */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 backdrop-blur-sm z-20">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/')} className="flex items-center gap-1.5 text-slate-400 hover:text-white transition text-sm">
            <ArrowLeft size={16} /><span className="hidden sm:inline">홈으로</span>
          </button>
          <div className="w-px h-5 bg-slate-700" />
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-indigo-400" />
            <div>
              <h1 className="text-sm font-bold leading-tight">3D 점검 리포트 — 래미안 강남포레스트 1204호</h1>
              <p className="text-[10px] text-slate-500">드론 실내 자율비행 SLAM 스캔 · 25평형 · Level 3</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded"><Eye size={11} />SAMPLE</span>
          <button type="button" onClick={() => navigate('/signup')} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded transition">무료로 시작하기</button>
        </div>
      </header>

      {/* 메인 */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* 3D 캔버스 */}
        <div className="flex-1 relative">
          <Scene3D
            scanPhase={scanPhase} progressRef={progressRef} discoveredIdsRef={discoveredIdsRef}
            discoveredList={discoveredList} selectedDefect={selectedDefect} defects={sampleDefects}
            onDiscover={handleDiscover} onComplete={handleComplete} onSelectDefect={setSelectedDefect}
            droneXRef={droneXRef} droneZRef={droneZRef}
          />

          {/* 스캔 상태 오버레이 */}
          {scanPhase === 'waiting' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-slate-900/80 border border-slate-700 rounded-xl px-6 py-4 text-center backdrop-blur-sm pointer-events-auto">
                <Radar size={28} className="text-emerald-400 mx-auto mb-2 animate-pulse" />
                <div className="text-sm font-bold">드론 스캔 준비 중...</div>
                <div className="text-[10px] text-slate-400 mt-1">잠시 후 실내 점검이 시작됩니다</div>
              </div>
            </div>
          )}

          {/* 스캔 컨트롤 바 — scanning / paused / complete */}
          {(scanPhase === 'scanning' || scanPhase === 'paused') && (
            <div className="absolute top-3 left-3 flex items-center gap-2 text-xs bg-slate-900/85 border border-cyan-500/30 px-3 py-2 rounded-lg backdrop-blur-sm">
              {scanPhase === 'scanning' ? (
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-amber-400" />
              )}
              <span className={scanPhase === 'scanning' ? 'text-cyan-400 font-semibold' : 'text-amber-400 font-semibold'}>
                {scanPhase === 'paused' ? '일시정지' : `${currentRoom} 스캔 중`}
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400 font-mono tabular-nums">{Math.round(scanProgress * 100)}%</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400">하자 {discoveredList.length}건{scanPhase === 'complete' ? ` (전체 ${sampleDefects.length}건)` : ''}</span>
              {/* 컨트롤 버튼 */}
              <span className="w-px h-4 bg-slate-600 mx-1" />
              {scanPhase === 'scanning' ? (
                <button type="button" onClick={handlePause} className="p-1 rounded hover:bg-slate-700 text-amber-400 transition" title="일시정지">
                  <Pause size={14} />
                </button>
              ) : (
                <button type="button" onClick={handleResume} className="p-1 rounded hover:bg-slate-700 text-cyan-400 transition" title="재개">
                  <Play size={14} />
                </button>
              )}
              <button type="button" onClick={handleStop} className="p-1 rounded hover:bg-slate-700 text-red-400 transition" title="중지">
                <Square size={12} />
              </button>
              <button type="button" onClick={handleRestart} className="p-1 rounded hover:bg-slate-700 text-slate-400 transition" title="처음부터">
                <RotateCcw size={12} />
              </button>
            </div>
          )}

          {scanPhase === 'complete' && (
            <div className="absolute top-3 left-3 flex items-center gap-2 text-xs bg-slate-900/85 border border-indigo-500/30 px-3 py-2 rounded-lg backdrop-blur-sm">
              <CheckCircle2 size={14} className="text-indigo-400" />
              <span className="text-indigo-400 font-semibold">스캔 완료</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400">총 {discoveredList.length}건 탐지</span>
              <span className="w-px h-4 bg-slate-600 mx-1" />
              <button type="button" onClick={handleRestart} className="flex items-center gap-1 p-1 rounded hover:bg-slate-700 text-cyan-400 transition" title="처음부터 다시 스캔">
                <RotateCcw size={12} /><span>다시 스캔</span>
              </button>
            </div>
          )}

          {/* 진행 바 */}
          {scanPhase === 'scanning' && (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-64">
              <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-200" style={{ width: `${scanProgress * 100}%` }} />
              </div>
            </div>
          )}

          {/* 범례 */}
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2.5 text-[10px] text-slate-400 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/70 backdrop-blur-sm shadow-lg">
            <LegendDot color="#ef4444" label="심각" /><span className="w-px h-2.5 bg-slate-700" />
            <LegendDot color="#f97316" label="보통" /><span className="w-px h-2.5 bg-slate-700" />
            <LegendDot color="#eab308" label="경미" /><span className="w-px h-2.5 bg-slate-700" />
            <span className="font-mono text-slate-500 tabular-nums">{discoveredList.length}건</span>
          </div>

          {/* 조작 힌트 */}
          <div className="absolute bottom-3 left-3 text-[10px] text-slate-600 bg-slate-900/50 px-2 py-1 rounded">
            드래그: 회전 · 스크롤: 줌 · 마커 클릭: 상세
          </div>

          {/* 모바일 패널 토글 */}
          <button type="button" onClick={() => setPanelOpen(!panelOpen)} className="lg:hidden absolute top-3 right-3 bg-slate-800 border border-slate-700 text-slate-300 p-2 rounded-lg z-10">
            {panelOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>

        {/* 우측 패널 */}
        <aside className={`${panelOpen ? 'translate-x-0' : 'translate-x-full'} lg:translate-x-0 transition-transform absolute lg:static right-0 top-0 h-full w-80 xl:w-96 bg-slate-900/95 lg:bg-slate-900/80 border-l border-slate-800 backdrop-blur-md flex flex-col overflow-hidden z-10`}>
          {/* 점검 개요 */}
          <div className="flex-shrink-0 p-4 border-b border-slate-800/80 space-y-3">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2"><FileText size={14} className="text-indigo-400" />점검 개요</h2>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-slate-400"><Building2 size={12} /><span>래미안 강남포레스트</span></div>
              <div className="flex items-center gap-1.5 text-slate-400"><Calendar size={12} /><span>2026-04-25</span></div>
              <div className="flex items-center gap-1.5 text-slate-400"><User size={12} /><span>김점검 (드론팀)</span></div>
              <div className="flex items-center gap-1.5 text-slate-400"><MapPin size={12} /><span>서울 강남구</span></div>
              <div className="flex items-center gap-1.5 text-slate-400"><Layers3 size={12} /><span>Level 3 (SLAM)</span></div>
              <div className="flex items-center gap-1.5 text-slate-400"><Eye size={12} /><span>25평형 · 1204호</span></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <StatCard icon={AlertTriangle} label="심각" value={highCount} color="text-red-400" />
              <StatCard icon={AlertTriangle} label="보통" value={medCount} color="text-orange-400" />
              <StatCard icon={CheckCircle2} label="경미" value={lowCount} color="text-yellow-400" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <StatCard icon={Eye} label="총 하자" value={`${discoveredList.length}건`} sub={totalArea > 0 ? `총 면적: ${totalArea.toFixed(2)}m²` : '스캔 중...'} color="text-indigo-400" />
              <StatCard icon={Layers3} label="스캔 진행" value={scanPhase === 'complete' ? '완료' : `${Math.round(scanProgress * 100)}%`} sub={scanPhase === 'complete' ? '커버리지 96.8%' : currentRoom ? `${currentRoom} 스캔 중` : '대기 중'} color="text-emerald-400" />
            </div>
          </div>

          {/* 하자 목록 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              탐지된 하자 ({discoveredList.length}건{scanPhase === 'complete' ? ` / ${sampleDefects.length}건` : ''})
            </h3>
            {discoveredList.length === 0 && scanPhase !== 'complete' && (
              <div className="text-center py-8">
                <Radar size={24} className="text-slate-600 mx-auto mb-2 animate-pulse" />
                <p className="text-xs text-slate-500">드론이 하자를 탐지하면<br />여기에 표시됩니다</p>
              </div>
            )}
            {discoveredList.map((d, i) => (
              <DefectListItem
                key={d.id}
                defect={d}
                isSelected={selectedDefect?.id === d.id}
                isNew={Date.now() - d.discoveredAt < 2000}
                onSelect={setSelectedDefect}
              />
            ))}
            <div ref={listEndRef} />
          </div>

          {/* 하단 CTA */}
          <div className="flex-shrink-0 p-4 border-t border-slate-800/80 space-y-2">
            <div className="flex gap-2">
              <button type="button" className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 text-slate-300 text-xs font-medium py-2.5 rounded-lg border border-slate-700/50 transition cursor-not-allowed opacity-60" title="샘플 페이지에서는 비활성">
                <Download size={13} />PDF
              </button>
              <button type="button" className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 text-slate-300 text-xs font-medium py-2.5 rounded-lg border border-slate-700/50 transition cursor-not-allowed opacity-60" title="샘플 페이지에서는 비활성">
                <Download size={13} />Excel
              </button>
              {scanPhase === 'complete' && (
                <button type="button" onClick={handleRestart} className="flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium px-3 py-2.5 rounded-lg transition">
                  <RotateCcw size={13} />
                </button>
              )}
            </div>
            <button type="button" onClick={() => navigate('/signup')} className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-sm font-bold py-3 rounded-lg transition shadow-lg shadow-indigo-500/20">
              지금 무료로 시작하기
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
