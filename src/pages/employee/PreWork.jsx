/**
 * pages/employee/PreWork.jsx
 * 역할: 사무실 사전 작업 — `/employee/pre-work`
 *       - 현장 라벨 입력 → Level 선택(L1 CAD / L2 평면도) → 파일 업로드
 *       - L1: 백엔드 /upload + /process (DXF LINE 추출) → 3D 프리뷰 → preModel 저장
 *       - L2: 백엔드 /validate(품질 게이트) → /analyze (OpenCV 벽체 추출) → 3D 프리뷰 → preModel 저장
 *       - 직원 랜딩(`/employee`) 의 "도면 업로드 · 사전 작업" 카드가 여기로 진입
 *
 *   //* [Modified Code 2026-05-13]
 *     - raw fetch → floorplanApi (axios) 로 교체, 실제 onUploadProgress 사용
 *     - 클라이언트 사전 검증(파일 크기/타입) 으로 무의미한 백엔드 트래픽 차단
 *     - L2: /validate 품질 게이트 추가 — rejected 시 차단, warning 시 경고 후 진행
 *     - L1: 가짜 setTimeout 제거하고 실제 백엔드 DXF 처리 호출
 *     - imageWidth/imageHeight 받아 preModel 에 저장 → BuildingMesh 종횡비 보존
 *
 *   UX 경계선 (memory: project_ux_boundary_employee_vs_session):
 *     이 페이지는 "사무실" 맥락이다 — 실시간 드론 HUD 나 현장 요소를 섞지 말 것.
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
  AlertTriangle,
} from 'lucide-react'
import FileDropzone from '../../components/session/FileDropzone.jsx'
import BuildingMesh from '../../components/map3d/BuildingMesh.jsx'
import usePreModelStore from '../../store/preModelStore.js'
import {
  preflightFloorplanFile,
  validateFloorplan,
  analyzeFloorplan,
  uploadAndProcessCad,
  describeFloorplanError,
} from '../../api/floorplanApi.js'

const LEVEL_CHOICES = [
  {
    level: 1,
    icon: FileText,
    title: 'CAD 도면',
    desc: 'DWG / DXF / IFC 형식의 설계 도면을 업로드합니다. (현재 DXF 만 실제 처리 — DWG/IFC 는 향후 지원)',
    accept: '.dwg,.dxf,.ifc',
    hint: 'DWG · DXF · IFC 파일 (최대 50MB)',
  },
  {
    level: 2,
    icon: ImageIcon,
    title: '평면도 이미지',
    desc: 'PNG / JPG / WEBP 형식의 평면도 스캔 이미지를 업로드합니다.',
    accept: 'image/jpeg,image/png,image/webp',
    hint: 'JPG · PNG · WEBP 이미지 (50KB ~ 25MB)',
  },
]

export default function PreWork() {
  const navigate = useNavigate()
  const preModels = usePreModelStore((s) => s.preModels)
  const addPreModel = usePreModelStore((s) => s.addPreModel)
  const removePreModel = usePreModelStore((s) => s.removePreModel)

  const [siteLabel, setSiteLabel] = useState('')
  const [level, setLevel] = useState(2) // 기본: 평면도 이미지
  const [fileMeta, setFileMeta] = useState(null) // { name, size, imageDataUrl, imageWidth, imageHeight }
  const [status, setStatus] = useState('pending') // pending | modeling | ready
  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState('')
  const [error, setError] = useState(null)
  const [warnings, setWarnings] = useState([])    // /validate 의 warnings
  const [wallsData, setWallsData] = useState(null)
  const [outline, setOutline] = useState(null)
  const [imageWidth, setImageWidth] = useState(null)
  const [imageHeight, setImageHeight] = useState(null)
  // //* [Modified Code 2026-05-13] 가구 — 자율비행 충돌 회피용
  const [furnitureData, setFurnitureData] = useState(null)

  // 실제 File 객체 보관 (API 전송용)
  const fileObjRef = useRef(null)

  const cfg = LEVEL_CHOICES.find((c) => c.level === level) ?? LEVEL_CHOICES[1]
  const canStart = siteLabel.trim().length >= 2 && fileMeta && status === 'pending' && !error

  const handleFile = async (file) => {
    if (!file) {
      setFileMeta(null)
      fileObjRef.current = null
      setError(null)
      return
    }

    // 클라이언트 사전 검증 — 백엔드 도달 전 거름망
    const kind = level === 2 ? 'image' : 'cad'
    const pre = preflightFloorplanFile(file, kind)
    if (!pre.ok) {
      setError(pre.error)
      setFileMeta(null)
      fileObjRef.current = null
      return
    }

    fileObjRef.current = file
    const isImage = file.type?.startsWith('image/')
    let imageDataUrl = null
    let imgW = null
    let imgH = null

    if (isImage) {
      imageDataUrl = await readAsDataUrl(file)
      // 이미지 크기 사전 추출 — 종횡비 보존 + 백엔드 응답 검증용
      const dims = await readImageDimensions(imageDataUrl)
      imgW = dims.width
      imgH = dims.height
    }

    setFileMeta({
      name: file.name,
      size: file.size,
      imageDataUrl,
      imageWidth: imgW,
      imageHeight: imgH,
    })
    setError(null)
    setWarnings([])
  }

  const handleChangeLevel = (lv) => {
    if (status === 'modeling') return
    setLevel(lv)
    setFileMeta(null)
    fileObjRef.current = null
    setError(null)
    setWarnings([])
    setWallsData(null)
    setOutline(null)
    setImageWidth(null)
    setImageHeight(null)
    setFurnitureData(null)
  }

  /** 모델링 시작 — Level 별 백엔드 호출 분기 */
  const handleStart = async () => {
    if (!canStart) return
    setStatus('modeling')
    setProgress(0)
    setStage('파일 검증 중...')
    setError(null)
    setWarnings([])
    setWallsData(null)
    setOutline(null)

    const file = fileObjRef.current
    if (!file) {
      setError('파일이 누락되었습니다. 다시 선택해주세요.')
      setStatus('pending')
      return
    }

    try {
      if (level === 2) {
        // ── L2: 평면도 이미지 ─────────────────────────
        // (1) 품질 게이트 — rejected 면 차단, warning 이면 사용자에게 알리고 진행
        setStage('이미지 품질 검증 중...')
        setProgress(5)
        const validation = await validateFloorplan(file)

        if (validation.status === 'rejected') {
          throw new Error(
            `이미지 품질이 낮아 처리를 중단했습니다 (점수 ${validation.score}). ${validation.errors.join(' ')}`
          )
        }
        if (validation.status === 'warning') {
          setWarnings(validation.warnings)
          // warning 은 차단하지 않고 진행
        }

        // (2) 벽체 추출
        setStage('OpenCV 벽체 추출 중...')
        const data = await analyzeFloorplan(file, (pct) => {
          // analyze 의 진행률은 10-95 구간으로 매핑 (검증 5%, 추출 90%)
          setProgress(10 + Math.round(pct * 0.85))
        })

        setStage('3D 프리뷰 생성...')
        setProgress(98)

        setWallsData(data.walls)
        setOutline(data.outline)
        setImageWidth(data.image_width)
        setImageHeight(data.image_height)
        // //* [Modified Code 2026-05-13] 가구 — 자율비행 충돌 회피용
        setFurnitureData(data.furniture ?? [])

        addPreModel({
          siteName: siteLabel.trim(),
          level,
          fileName: fileMeta.name,
          fileSize: fileMeta.size,
          imageDataUrl: fileMeta.imageDataUrl,
          wallsData: data.walls,
          outline: data.outline,
          imageWidth: data.image_width,
          imageHeight: data.image_height,
          furnitureData: data.furniture ?? [],
        })

        setProgress(100)
        setStage(`완료 — 벽 ${data.wall_count}개 + 외곽 ${data.outline?.length ?? 0}점 + 가구 ${data.furniture_count ?? 0}개 추출`)
        setStatus('ready')
      } else {
        // ── L1: CAD 도면 ─────────────────────────
        // DXF 만 실제 백엔드 처리. DWG/IFC 는 백엔드 미지원 → 명확히 안내
        const lower = (file.name || '').toLowerCase()
        if (!lower.endsWith('.dxf')) {
          throw new Error('현재 DXF 형식만 실제 처리 가능합니다. DWG/IFC 는 향후 지원 예정입니다.')
        }

        setStage('CAD 파일 업로드 중...')
        const data = await uploadAndProcessCad(file, (pct) => setProgress(pct))

        if (!data.walls || data.walls.length === 0) {
          throw new Error('CAD 파일에서 벽체(LINE 엔티티)를 찾지 못했습니다. 다른 도면을 시도해주세요.')
        }

        setStage('3D 프리뷰 생성...')

        setWallsData(data.walls)
        setOutline(data.outline ?? [])
        // CAD 는 픽셀 이미지가 아니지만 BuildingMesh 종횡비 산출을 위해 image_width/height 활용
        // /process 응답이 image_width/height 를 안 주므로 outline/walls bbox 에 의존 (deriveSceneSize 가 처리)
        setImageWidth(null)
        setImageHeight(null)
        // L1 DXF 는 가구를 별도 추출하지 않음 (LINE 만 처리) → 빈 배열
        setFurnitureData(data.furniture ?? [])

        addPreModel({
          siteName: siteLabel.trim(),
          level,
          fileName: fileMeta.name,
          fileSize: fileMeta.size,
          imageDataUrl: null,
          wallsData: data.walls,
          outline: data.outline ?? [],
          imageWidth: null,
          imageHeight: null,
          furnitureData: data.furniture ?? [],
        })

        setProgress(100)
        setStage(`완료 — DXF LINE ${data.wall_count}개 + 가구 ${data.furniture_count ?? 0}개 추출`)
        setStatus('ready')
      }
    } catch (err) {
      console.error('[PreWork] 모델링 실패:', err)
      setError(describeFloorplanError(err))
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
    setWarnings([])
    setWallsData(null)
    setOutline(null)
    setImageWidth(null)
    setImageHeight(null)
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
                onClear={() => {
                  setFileMeta(null)
                  fileObjRef.current = null
                  setError(null)
                }}
              />
              {fileMeta?.imageWidth && fileMeta?.imageHeight && (
                <p className="text-[11px] text-gray-500 mt-2 font-mono">
                  원본 {fileMeta.imageWidth} × {fileMeta.imageHeight} px (종횡비 {(fileMeta.imageWidth / fileMeta.imageHeight).toFixed(2)})
                </p>
              )}
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
                      : '백엔드에서 처리 중입니다...'}
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

          {/* 5) 품질 검증 경고 */}
          {warnings.length > 0 && status === 'ready' && (
            <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-800 mb-1">이미지 품질 경고 (처리는 진행됨)</p>
                  <ul className="text-[11px] text-amber-700 list-disc list-inside space-y-0.5">
                    {warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* 6) 3D 프리뷰 — 벽체 추출 완료 시 */}
          {status === 'ready' && wallsData && wallsData.length > 0 && (
            <div className="mb-6 rounded-xl border border-gray-200 bg-slate-900 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 border-b border-slate-700">
                <Eye size={14} className="text-blue-400" />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  3D 프리뷰 — 벽 {wallsData.length}
                  {outline?.length ? ` · 외곽 ${outline.length}` : ''}
                  {furnitureData?.length ? ` · 가구 ${furnitureData.length}` : ''}
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
                      level={level}
                      imageUrl={fileMeta?.imageDataUrl}
                      wallsData={wallsData}
                      outline={outline}
                      imageWidth={imageWidth ?? fileMeta?.imageWidth}
                      imageHeight={imageHeight ?? fileMeta?.imageHeight}
                      furnitureData={furnitureData}
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

          {/* 7) 액션 버튼 */}
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
                      {m.wallsData ? ` · 벽 ${m.wallsData.length}` : ''}
                      {m.furnitureData?.length ? ` · 가구 ${m.furnitureData.length}` : ''}
                      {m.imageWidth && m.imageHeight ? ` · ${m.imageWidth}×${m.imageHeight}px` : ''}
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

function readImageDimensions(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = reject
    img.src = dataUrl
  })
}
