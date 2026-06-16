/**
 * components/report/ReportModal.jsx
 * 역할: `/dashboard/report` nested route 용 리포트 오버레이 — 현장 즉석 편집 + 아카이브 저장
 *
 *   //* [Modified Code v2] 기존 세션 요약 + ReportPanel 만 있던 모달을 **ReportEditor 포함**으로 확장:
 *     - 현장 비행이 끝나면 이 모달에서 바로 공종·장소·심각도·메모 편집 + false positive 삭제 + 수동 추가 가능
 *     - 편집 결과는 메모리 only — "아카이브 저장" 버튼 클릭 시 reportsStore.create 로 저장 (복구 가능)
 *     - 편집 없이 대시보드로 돌아가거나 새 점검 시작해도 OK (저장하지 않은 변경은 사라짐)
 *     - 기존 ReportPanel(LLM 내레이션) 은 상단 탭 전환으로 접근
 */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, FileText, CheckCircle2, RotateCcw, Save, Pencil, Sparkles } from 'lucide-react'
import ReportPanel from './ReportPanel.jsx'
import ReportEditor from './ReportEditor.jsx'
import useSessionStore from '../../store/sessionStore.js'
import useDroneStore from '../../store/droneStore.js'
import useDefectStore from '../../store/defectStore.js'
import useReportsStore from '../../store/reportsStore.js'
import { inferInitialLocation, suggestTradeFromCode } from '../../constants/trades.js'
import { buildReportMarkdown } from '../../utils/buildReportMarkdown.js'
import { buildThermalFindings } from '../../utils/buildThermalFindings.js'

const LEVEL_NAME = {
  1: 'CAD 도면',
  2: '평면도 이미지',
  3: '드론 자율비행',
}

// 세션 defect(WS 스트림 원본) → 리포트 defect(편집용) 변환
// //* [Modified Code v2] location 은 area 와 독립 필드. 초기값은 area 기반 휴리스틱으로만 추정.
// //* R-v1.1.17 등재 정책: backend grade='CONFIRMED' 만 보고서 등재. REVIEW/REFERENCE 는 제외.
//     (사용자 수동 추가는 is_manual=true 라 grade 무관 통과)
function toEditableDefects(raw) {
  return raw
    // 열화상 영상의 RGB 오탐(source_channel=thermal)은 보고서 제외 — 단열은 별도 Thermal 섹션.
    .filter((d) => (d.is_manual || !d.grade || d.grade === 'CONFIRMED') && d.source_channel !== 'thermal')
    .map((d) => ({
      ...d,
      trade: d.trade ?? suggestTradeFromCode(d.category_code),
      trade_confidence: d.trade_confidence ?? 0.65,
      location: d.location ?? d.location_label ?? inferInitialLocation(d.area),
      verified: d.verified ?? false,
      action_note: d.action_note ?? '',
      is_manual: d.is_manual ?? false,
      image_wide: d.image_wide ?? null,
    }))
}

export default function ReportModal() {
  const navigate = useNavigate()
  const { siteName, siteUnit, operatorName, inspectionDate, level, modelSource, sessionId, startedAt, finishedAt } = useSessionStore()
  const sessionReset = useSessionStore((s) => s.reset)
  const droneReset = useDroneStore((s) => s.reset)
  const defectsRaw = useDefectStore((s) => s.defects)
  const defectsReset = useDefectStore((s) => s.reset)
  const createReport = useReportsStore((s) => s.create)

  const [tab, setTab] = useState('editor') // 'editor' | 'narrative'
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState(null)

  // 리포트 편집 draft — 모달 진입 시 defectStore 에서 초기화
  const [draft, setDraft] = useState(() => ({
    id: null,
    site_name: siteName || '',
    site_unit: siteUnit || '',
    operator_name: operatorName || '',
    inspection_date: inspectionDate || '',
    level: level || null,
    model_source: modelSource || null,
    session_id: sessionId || null,
    started_at: startedAt || null,
    finished_at: finishedAt || Date.now(),
    status: 'draft',
    defects: toEditableDefects(defectsRaw),
    narrative_content: '',
  }))

  // defectStore 가 바뀌면(새 하자 수신 등) draft 의 defects 도 반영 (이미 편집된 건은 유지)
  useEffect(() => {
    setDraft((prev) => {
      // id 기준 merge: prev 에 있으면 유지, 없으면 새로 변환 추가
      const byId = new Map(prev.defects.map((d) => [d.id, d]))
      const merged = defectsRaw.map((d) => byId.get(d.id) ?? toEditableDefects([d])[0])
      return { ...prev, defects: merged }
    })
  }, [defectsRaw])

  const severityCounts = useMemo(() => {
    const acc = { HIGH: 0, MED: 0, LOW: 0 }
    for (const d of draft.defects) acc[d.severity] = (acc[d.severity] || 0) + 1
    return acc
  }, [draft.defects])

  const handleClose = () => navigate('/dashboard')

  const handleEditorChange = (patch) => {
    setDraft((prev) => ({ ...prev, ...patch }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // 백엔드 Report SoT = 마크다운 content. draft(구조화) → 마크다운(열화상 단열 섹션 포함) 생성.
      const thermalFindings = buildThermalFindings()
      const content = buildReportMarkdown(
        { defects: draft.defects, thermal_findings: thermalFindings, narrative_content: draft.narrative_content },
        {
          siteName: draft.site_name,
          siteUnit: draft.site_unit,
          operatorName: draft.operator_name,
          inspectionDate: draft.inspection_date,
        },
      )
      const created = await createReport({
        title: `${draft.site_name || '현장'}${draft.site_unit ? ` ${draft.site_unit}` : ''} 하자점검 결과보고서`.trim(),
        building_name: draft.site_name || undefined,
        inspector_name: draft.operator_name || undefined,
        provider: 'claude',
        content,
        defect_count: draft.defects.length,
        high_count: draft.defects.filter((d) => d.severity === 'HIGH').length,
        med_count: draft.defects.filter((d) => d.severity === 'MED').length,
        low_count: draft.defects.filter((d) => d.severity === 'LOW').length,
      })
      setSavedId(created.id)
    } catch (err) {
      alert('저장 실패: ' + (err?.response?.data?.detail || err?.message || err))
    } finally {
      setSaving(false)
    }
  }

  const handleNewInspection = () => {
    sessionReset()
    droneReset()
    defectsReset()
    navigate('/session/setup', { replace: true })
  }

  const handleOpenInEmployee = () => {
    if (savedId) navigate(`/employee/reports/${savedId}`)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="absolute inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-slate-950/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div className="relative w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-2xl bg-slate-900 border border-accent-500/30 shadow-2xl flex flex-col">
        {/* 헤더 */}
        <header className="flex items-start justify-between px-6 py-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-accent-500/20 border border-accent-500/60 flex items-center justify-center">
              <CheckCircle2 size={20} className="text-accent-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">비행 종료 · 점검 리포트</h2>
              <p className="text-xs text-slate-400">
                공종·장소 자동 분류 결과를 확인 후 수정하고, 엑셀·PDF 로 발행하세요.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            title="대시보드로 돌아가기"
            className="p-1.5 rounded text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </header>

        {/* 세션 요약 */}
        <section className="px-6 py-3 border-b border-slate-800 flex-shrink-0">
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2 text-xs">
            <Pill label="현장" value={draft.site_name || '—'} span={2} />
            <Pill label="운용자" value={draft.operator_name || '—'} />
            <Pill label="일자" value={draft.inspection_date || '—'} />
            <Pill label="Level" value={draft.level ? `L${draft.level}` : '—'} />
            <Pill label="총" value={`${draft.defects.length}`} accent />
            <Pill label="HIGH" value={severityCounts.HIGH} color="text-red-400" />
            <Pill label="MED" value={severityCounts.MED} color="text-orange-400" />
          </div>
        </section>

        {/* 탭 전환 */}
        <div className="flex items-center border-b border-slate-800 flex-shrink-0 px-4">
          <button
            type="button"
            onClick={() => setTab('editor')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
              tab === 'editor'
                ? 'border-accent-500 text-white'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Pencil size={12} /> 편집
          </button>
          <button
            type="button"
            onClick={() => setTab('narrative')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
              tab === 'narrative'
                ? 'border-accent-500 text-white'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles size={12} /> AI 내레이션
          </button>
        </div>

        {/* 본문: 탭별 */}
        <section className="flex-1 overflow-hidden bg-white text-slate-800">
          {tab === 'editor' ? (
            <ReportEditor report={draft} onChange={handleEditorChange} variant="modal" />
          ) : (
            <div className="h-full overflow-y-auto p-5">
              <ReportPanel />
            </div>
          )}
        </section>

        {/* 하단 액션 */}
        <footer className="flex items-center justify-between px-6 py-3 border-t border-slate-800 flex-shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="text-xs text-slate-400 hover:text-white transition"
          >
            대시보드로 돌아가기
          </button>
          <div className="flex items-center gap-2">
            {savedId ? (
              <>
                <span className="text-[11px] text-accent-300 inline-flex items-center gap-1">
                  <CheckCircle2 size={11} /> 아카이브 저장됨
                </span>
                <button
                  type="button"
                  onClick={handleOpenInEmployee}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-slate-700 text-white text-xs font-bold hover:bg-slate-600 transition"
                >
                  사무실에서 열기
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition shadow disabled:opacity-60"
              >
                <Save size={12} /> {saving ? '저장 중...' : '아카이브 저장'}
              </button>
            )}
            <button
              type="button"
              onClick={handleNewInspection}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-accent-500 text-white font-bold text-xs hover:bg-accent-400 transition shadow-lg"
            >
              <RotateCcw size={12} /> 새 점검 시작
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}

function Pill({ label, value, accent, color, span }) {
  return (
    <div
      className={`rounded-md px-2 py-1 border ${accent ? 'bg-accent-500/10 border-accent-500/40' : 'bg-slate-950/40 border-slate-800'} ${span === 2 ? 'col-span-2' : ''}`}
    >
      <div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">{label}</div>
      <div className={`text-xs font-semibold truncate ${color || (accent ? 'text-accent-300' : 'text-white')}`}>
        {value}
      </div>
    </div>
  )
}

export { FileText }
