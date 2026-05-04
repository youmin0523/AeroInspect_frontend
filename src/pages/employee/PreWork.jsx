/**
 * pages/employee/PreWork.jsx
 * 역할: 사무실 사전 작업 — `/employee/pre-work`
 *       - 현장 라벨 입력 → Level 선택(L1 CAD / L2 평면도) → 파일 업로드
 *       - L2: 백엔드 OpenCV 벽체 추출 → 3D 프리뷰 표시 → preModelStore 라이브러리에 저장
 *       - 직원 랜딩(`/employee`) 의 "도면 업로드 · 사전 작업" 카드가 여기로 진입
 *
 *   UX 경계선 (memory: project_ux_boundary_employee_vs_session):
 *     이 페이지는 "사무실" 맥락이다 — 실시간 드론 HUD 나 현장 요소를 섞지 말 것.
 *     `/employee` 랜딩과 같은 톤(흰 배경 + blue/yellow accent + 카드 레이아웃) 유지.
 */

import { Suspense, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import {
  ArrowLeft,
  Building,
  FileText,
  Image as ImageIcon,
  Upload,
  Play,
  CheckCircle2,
  Loader2,
  Trash2,
  Eye,
} from 'lucide-react'
import FileDropzone from '../../components/session/FileDropzone.jsx'
import BuildingMesh from '../../components/map3d/BuildingMesh.jsx'
import usePreModelStore from '../../store/preModelStore.js'

const LEVEL_CHOICES = [
  {
    level: 1,
    icon: FileText,
    title: 'CAD 도면',
    desc: 'DWG / DXF / IFC 형식의 설계 도면을 업로드합니다.',
    accept: '.dwg,.dxf,.ifc',
    hint: 'DWG · DXF · IFC 파일 지원',
  },
  {
    level: 2,
    icon: ImageIcon,
    title: '평면도 이미지',
    desc: 'PNG / JPG / WEBP 형식의 평면도 스캔 이미지를 업로드합니다.',
    accept: 'image/*',
    hint: 'PNG · JPG · WEBP 이미지',
  },
]

export default function PreWork() {
  const navigate = useNavigate()
  const preModels = usePreModelStore((s) => s.preModels)
  const addPreModel = usePreModelStore((s) => s.addPreModel)
  const removePreModel = usePreModelStore((s) => s.removePreModel)

  const [siteLabel, setSiteLabel] = useState('')
  const [level, setLevel] = useState(2) // 기본: 평면도 이미지
  const [fileMeta, setFileMeta] = useState(null) // { name, size, imageDataUrl }
  const [status, setStatus] = useState('pending') // pending | modeling | ready
  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState('')
  const [error, setError] = useState(null)
  const [wallsData, setWallsData] = useState(null) // 추출된 벽체 좌표
  const [outline, setOutline] = useState(null)     // 건물 외곽 다각형

  // 실제 File 객체 보관 (API 전송용 — state 에 넣으면 직렬화 문제)
  const fileObjRef = useRef(null)

  const cfg = LEVEL_CHOICES.find((c) => c.level === level) ?? LEVEL_CHOICES[1]
  const canStart = siteLabel.trim().length >= 2 && fileMeta && status === 'pending'

  const handleFile = async (file) => {
    if (!file) {
      setFileMeta(null)
      fileObjRef.current = null
      return
    }
    fileObjRef.current = file
    const isImage = file.type?.startsWith('image/')
    let imageDataUrl = null
    if (isImage) {
      imageDataUrl = await readAsDataUrl(file)
    }
    setFileMeta({
      name: file.name,
      size: file.size,
      imageDataUrl,
    })
    setError(null)
  }

  const handleChangeLevel = (lv) => {
    if (status === 'modeling') return
    setLevel(lv)
    setFileMeta(null)
    fileObjRef.current = null
    setError(null)
    setWallsData(null)
    setOutline(null)
  }

  /** 모델링 시작 — L2: 백엔드 OpenCV 벽체 추출 API 호출 */
  const handleStart = async () => {
    if (!canStart) return
    setStatus('modeling')
    setProgress(10)
    setStage('파일 업로드 중...')
    setError(null)
    setWallsData(null)
    setOutline(null)

    try {
      if (level === 2 && fileObjRef.current) {
        // L2: 실제 백엔드 OpenCV 벽체 추출
        const formData = new FormData()
        formData.append('file', fileObjRef.current)

        setProgress(25)
        setStage('서버로 전송 중...')

        const response = await fetch('/api/v1/floorplan/analyze', {
          method: 'POST',
          body: formData,
        })

        setProgress(60)
        setStage('OpenCV 벽체 추출 중...')

        if (!response.ok) {
          const err = await response.json().catch(() => ({}))
          throw new Error(err.detail || `서버 오류 (${response.status})`)
        }

        const data = await response.json()

        setProgress(90)
        setStage('3D 모델 생성 중...')

        await new Promise((r) => setTimeout(r, 500))

        setWallsData(data.walls)
        setOutline(data.outline)

        addPreModel({
          siteName: siteLabel.trim(),
          level,
          fileName: fileMeta.name,
          fileSize: fileMeta.size,
          imageDataUrl: fileMeta.imageDataUrl,
          wallsData: data.walls,
          outline: data.outline,
        })

        setProgress(100)
        setStage(`완료 — ${data.wall_count}개 벽체 + 외곽 윤곽선 추출`)
        setStatus('ready')
      } else {
        // L1(CAD) 은 아직 mock — 향후 백엔드 파서 연결
        setStage('도면 파싱 중... (데모)')
        await new Promise((r) => setTimeout(r, 2000))
        setProgress(100)
        setStage('완료')

        addPreModel({
          siteName: siteLabel.trim(),
          level,
          fileName: fileMeta.name,
          fileSize: fileMeta.size,
          imageDataUrl: fileMeta.imageDataUrl,
          wallsData: null,
          outline: null,
        })
        setStatus('ready')
      }
    } catch (err) {
      console.error('[PreWork] 벽체 추출 실패:', err)
      setError(err.message || '벽체 추출에 실패했습니다. 백엔드 서버가 실행 중인지 확인하세요.')
      setStatus('pending')
      setProgress(0)
      setStage('')
    }
  }

  const handleNewEntry = () => {
    setSiteLabel('')
    setFileMeta(null)
    fileObjRef.current = null
    setStatus('pending')
    setProgress(0)
    setStage('')
    setError(null)
    setWallsData(null)
    setOutline(null)
    setLevel(2)
  }

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800 font-sans antialiased">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 md:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 md:gap-6">
            <Link
              to="/employee"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-blue-600 transition"
              title="직원 허브로"
            >
              <ArrowLeft size={16} /> 직원 허브
            </Link>
            <div className="h-5 w-px bg-gray-200 hidden md:block" aria-hidden />
            <div className="flex items-center gap-2">
              <Building className="text-blue-600" size={20} />
              <span className="font-extrabold tracking-tight text-slate-800 uppercase text-sm md:text-base">
                도면 업로드 · 사전 작업
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 md:px-8 py-10 space-y-8">
        {/* 섹션 헤더 */}
        <section>
          <p className="text-xs font-bold text-blue-600 uppercase tracking-[0.15em]">PRE-WORK</p>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mt-1">
            현장 나가기 전, 도면 기반 3D 모델을 먼저 준비해두세요
          </h1>
          <p className="text-sm text-gray-600 mt-2 break-keep max-w-3xl">
            여기서 만들어둔 모델은 현장에서 <span className="font-semibold text-blue-700">/세션 시작 → Level 선택</span> 화면에 자동 노출되어 즉시 불러올 수 있습니다.
            도면이 없는 현장은 현장에서 드론 자율비행으로 스캔합니다.
          </p>
        </section>

        {/* 모델 생성 카드 */}
        <section className="bg-white rounded-xl shadow-md border-t-4 border-yellow-500 p-6 md:p-8">
          {/* 1) 현장 라벨 */}
          <label className="block mb-6">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              <Building size={13} /> 현장 라벨
            </span>
            <input
              type="text"
              value={siteLabel}
              onChange={(e) => setSiteLabel(e.target.value)}
              placeholder="예: 송파 헬리오시티 102동 1501호"
              disabled={status !== 'pending'}
              className="w-full bg-white border border-gray-300 rounded-md px-3 py-2.5 text-sm text-slate-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            />
            <p className="text-[11px] text-gray-500 mt-1.5">
              현장 세션에서 동일한 라벨을 입력하면 이 모델이 "Load" 옵션으로 자동 매칭됩니다.
            </p>
          </label>

          {/* 2) Level 선택 */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              모델 소스
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {LEVEL_CHOICES.map((c) => {
                const Icon = c.icon
                const selected = level === c.level
                return (
                  <button
                    key={c.level}
                    type="button"
                    onClick={() => handleChangeLevel(c.level)}
                    disabled={status !== 'pending'}
                    className={`flex items-start gap-3 text-left border rounded-lg px-4 py-3 transition disabled:opacity-60 ${
                      selected
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      selected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">{c.title}</span>
                        <span className="text-[10px] font-mono text-gray-500">Level {c.level}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5 break-keep">{c.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 3) 파일 업로드 */}
          {status === 'pending' && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                파일 업로드
              </p>
              <FileDropzone
                accept={cfg.accept}
                hint={cfg.hint}
                file={fileMeta ? { name: fileMeta.name, size: fileMeta.size } : null}
                previewUrl={fileMeta?.imageDataUrl}
                onFile={handleFile}
                onClear={() => { setFileMeta(null); fileObjRef.current = null }}
              />
            </div>
          )}

          {/* 4) 진행 중 / 완료 UI */}
          {(status === 'modeling' || status === 'ready') && (
            <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-5">
              <div className="flex items-center gap-3 mb-4">
                {status === 'ready' ? (
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 size={20} className="text-green-700" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Loader2 size={20} className="text-blue-700 animate-spin" />
                  </div>
                )}
                <div>
                  <div className="text-sm font-bold text-slate-800">
                    {status === 'ready' ? '모델링 완료 — 라이브러리에 저장됨' : '모델링 진행 중'}
                  </div>
                  <div className="text-[11px] text-gray-500 font-mono">
                    {status === 'ready'
                      ? '세션 Level 선택 화면에서 이 현장 라벨을 입력하면 자동 노출됩니다'
                      : '백엔드에서 벽체를 추출 중입니다...'}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="text-gray-600">{stage || '준비 중...'}</span>
                <span className="text-blue-700 tabular-nums font-bold">{progress}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-[width] duration-200 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* 5) 3D 프리뷰 — 벽체 추출 완료 시 */}
          {status === 'ready' && wallsData && wallsData.length > 0 && (
            <div className="mb-6 rounded-xl border border-gray-200 bg-slate-900 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 border-b border-slate-700">
                <Eye size={14} className="text-blue-400" />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  3D 프리뷰 — {wallsData.length}개 벽체
                </span>
              </div>
              <div className="h-72 md:h-80">
                <Canvas shadows>
                  <PerspectiveCamera makeDefault position={[8, 6, 8]} fov={50} />
                  <OrbitControls
                    enablePan
                    enableZoom
                    enableRotate
                    maxPolarAngle={Math.PI / 2}
                    minDistance={2}
                    maxDistance={30}
                  />
                  <ambientLight intensity={0.4} />
                  <directionalLight position={[5, 10, 5]} intensity={0.8} castShadow />
                  <Suspense fallback={null}>
                    <BuildingMesh
                      level={2}
                      imageUrl={fileMeta?.imageDataUrl}
                      wallsData={wallsData}
                      outline={outline}
                    />
                  </Suspense>
                </Canvas>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          {/* 6) 액션 버튼 */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate('/employee')}
              className="text-sm text-gray-500 hover:text-slate-800 transition"
            >
              취소하고 허브로
            </button>

            {status === 'pending' && (
              <button
                type="button"
                onClick={handleStart}
                disabled={!canStart}
                className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition shadow disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                <Play size={14} /> 모델링 시작
              </button>
            )}

            {status === 'modeling' && (
              <div className="text-xs text-gray-400 font-mono">처리 중...</div>
            )}

            {status === 'ready' && (
              <button
                type="button"
                onClick={handleNewEntry}
                className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition shadow"
              >
                <Upload size={14} /> 다른 도면 추가
              </button>
            )}
          </div>
        </section>

        {/* 기존 라이브러리 */}
        <section className="bg-white rounded-xl shadow-md p-6 md:p-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-[0.15em]">LIBRARY</p>
              <h2 className="text-xl font-bold text-slate-800 mt-1">사전 작업 완료 모델 ({preModels.length})</h2>
            </div>
          </div>

          {preModels.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">
              아직 사전 작업된 모델이 없습니다. 상단에서 첫 모델을 생성해보세요.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {preModels.slice().reverse().map((m) => (
                <li key={m.id} className="py-3 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    m.level === 1 ? 'bg-blue-50 text-blue-700' : 'bg-yellow-50 text-yellow-700'
                  }`}>
                    {m.level === 1 ? <FileText size={18} /> : <ImageIcon size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate break-keep">{m.siteName}</p>
                    <p className="text-xs text-gray-500 mt-0.5 font-mono truncate">
                      L{m.level} · {m.fileName}
                      {m.wallsData ? ` · ${m.wallsData.length}벽체` : ''}
                      {' · '}{new Date(m.createdAt).toLocaleString('ko-KR')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePreModel(m.id)}
                    title="삭제"
                    className="p-2 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
