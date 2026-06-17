/**
 * components/report/PdfExportButton.jsx
 * 역할: 현재 리포트를 `.pdf` 로 내보내기 (@react-pdf/renderer)
 *       - 요약 페이지 + 공종별 하자 리스트 + 이미지 크롭 포함
 *       - 한글 폰트는 기본 Helvetica 로는 표기 불가 → Noto Sans KR 을 CDN 에서 load
 *       - 이미지가 base64 data URL 이면 그대로 <Image /> 에 전달 가능
 *
 *   //* [Modified Code] 프론트엔드 생성 선택(사용자 확정: "부하 덜 걸리고 정확, 빠르게").
 *       백엔드 전환 시 WeasyPrint + HTML 템플릿으로 교체 가능.
 */

import { useState } from 'react'
import { Download } from 'lucide-react'
import {
  Document, Page, Text, View, StyleSheet, Image, Font,
} from '@react-pdf/renderer'
import PdfPreviewModal from './PdfPreviewModal.jsx'

// //* [Modified Code] 한글 지원 폰트 — 로컬 파일 (public/fonts/) 에서 로드
// CDN 404 이슈 해소. Noto Sans KR OTF (Google Noto CJK, Apache 2.0)
// public/ 디렉토리 파일은 Vite 가 / 루트로 서빙 → '/fonts/NotoSansKR-Regular.ttf'
Font.register({
  family: 'NotoSansKR',
  fonts: [
    { src: '/fonts/NotoSansKR-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/NotoSansKR-Bold.ttf',    fontWeight: 700 },
  ],
})

Font.registerHyphenationCallback((word) => [word])

const styles = StyleSheet.create({
  page:      { padding: 32, fontFamily: 'NotoSansKR', fontSize: 9, color: '#1e293b' },
  header:    { marginBottom: 16, borderBottom: '2 solid #1e40af', paddingBottom: 8 },
  title:     { fontSize: 18, fontWeight: 700, color: '#1e40af' },
  subtitle:  { fontSize: 10, color: '#64748b', marginTop: 3 },
  metaGrid:  { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  metaCell:  { width: '50%', marginBottom: 6 },
  metaLabel: { fontSize: 8, color: '#64748b', textTransform: 'uppercase' },
  metaValue: { fontSize: 10, fontWeight: 700, color: '#1e293b', marginTop: 1 },
  section:   { marginTop: 12, marginBottom: 8 },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: '#1e40af', marginBottom: 6, paddingBottom: 3, borderBottom: '1 solid #e2e8f0' },
  defectRow: { flexDirection: 'row', marginBottom: 8, padding: 6, border: '1 solid #e2e8f0', borderRadius: 3 },
  thumbCell: { width: 56, marginRight: 8 },
  thumb:     { width: 56, height: 56, borderRadius: 3, objectFit: 'cover' },
  thumbPlaceholder: { width: 56, height: 56, borderRadius: 3, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  thumbPlaceholderText: { fontSize: 7, color: '#94a3b8' },
  defectBody: { flex: 1, flexDirection: 'column' },
  defectHeadRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  defectTypeLabel: { fontSize: 10, fontWeight: 700, color: '#1e293b', flex: 1 },
  sevBadge:  { fontSize: 7, fontWeight: 700, padding: 2, borderRadius: 2, marginLeft: 4 },
  sevHigh:   { backgroundColor: '#fee2e2', color: '#b91c1c' },
  sevMed:    { backgroundColor: '#ffedd5', color: '#c2410c' },
  sevLow:    { backgroundColor: '#fef9c3', color: '#a16207' },
  defectMeta: { flexDirection: 'row', marginTop: 2 },
  metaPill:   { fontSize: 7, color: '#475569', backgroundColor: '#f1f5f9', padding: '1 4', borderRadius: 2, marginRight: 4 },
  note:       { fontSize: 8, color: '#475569', marginTop: 4, fontStyle: 'italic' },
  footer:     { position: 'absolute', bottom: 24, left: 32, right: 32, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', fontSize: 7, color: '#94a3b8' },
})

const sevStyle = (sev) =>
  sev === 'HIGH' ? styles.sevHigh : sev === 'MED' ? styles.sevMed : styles.sevLow

export function ReportDocument({ report }) {
  const defects = report.defects ?? []
  const hi = defects.filter((d) => d.severity === 'HIGH').length
  const me = defects.filter((d) => d.severity === 'MED').length
  const lo = defects.filter((d) => d.severity === 'LOW').length

  // 공종별 그룹 (공종 키가 없으면 '미분류')
  const byTrade = defects.reduce((acc, d) => {
    const key = d.trade || '미분류'
    ;(acc[key] ||= []).push(d)
    return acc
  }, {})

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>DRONE INSPECT 하자 점검 리포트</Text>
          <Text style={styles.subtitle}>
            발행 {new Date().toLocaleString('ko-KR')} · Level {report.level ?? '-'} · {report.model_source ?? '-'}
          </Text>
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>현장</Text>
            <Text style={styles.metaValue}>{report.site_name ?? '-'}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>운용자</Text>
            <Text style={styles.metaValue}>{report.operator_name ?? '-'}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>일자</Text>
            <Text style={styles.metaValue}>{report.inspection_date ?? '-'}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>총 하자 수</Text>
            <Text style={styles.metaValue}>
              {defects.length}건 (HIGH {hi} / MED {me} / LOW {lo})
            </Text>
          </View>
        </View>

        {Object.entries(byTrade).map(([trade, list]) => (
          <View key={trade} wrap={true}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                공종 · {trade}  ({list.length}건)
              </Text>
            </View>
            {list.map((d, i) => (
              <View key={d.id ?? i} style={styles.defectRow} wrap={false}>
                <View style={styles.thumbCell}>
                  {d.image_crop ? (
                    <Image src={d.image_crop} style={styles.thumb} />
                  ) : (
                    <View style={styles.thumbPlaceholder}>
                      <Text style={styles.thumbPlaceholderText}>NO IMG</Text>
                    </View>
                  )}
                </View>
                <View style={styles.defectBody}>
                  <View style={styles.defectHeadRow}>
                    <Text style={styles.defectTypeLabel}>
                      {d.defect_type ?? d.category_code ?? '-'}
                    </Text>
                    <Text style={[styles.sevBadge, sevStyle(d.severity)]}>{d.severity ?? '-'}</Text>
                  </View>
                  <View style={styles.defectMeta}>
                    <Text style={styles.metaPill}>장소: {d.location || d.location_label || '-'}</Text>
                    {d.area && <Text style={styles.metaPill}>영역 {d.area}</Text>}
                    {d.category_code && <Text style={styles.metaPill}>{d.category_code}</Text>}
                    {d.is_manual && <Text style={styles.metaPill}>수동추가</Text>}
                    {d.verified && <Text style={styles.metaPill}>검증</Text>}
                  </View>
                  {d.action_note && <Text style={styles.note}>조치: {d.action_note}</Text>}
                </View>
              </View>
            ))}
          </View>
        ))}

        {/* 열화상 단열 스크리닝 (확인분) — RGB 하자와 별도 섹션 */}
        {(report.thermal_findings?.length ?? 0) > 0 && (
          <View wrap={true}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                열화상 단열 스크리닝 · 확인분  ({report.thermal_findings.length}건)
              </Text>
            </View>
            <Text style={styles.note}>
              ⚠ 의사색(FLIR) 상대온도 기반 단열 의심부 — 점검자 확인분. 절대 ΔT 확정 진단 아님.
            </Text>
            {report.thermal_findings.map((t, i) => (
              <View key={t.id ?? i} style={styles.defectRow} wrap={false}>
                <View style={styles.defectBody}>
                  <View style={styles.defectHeadRow}>
                    <Text style={styles.defectTypeLabel}>{i + 1}. {t.kind_label ?? '단열 의심'}</Text>
                    <Text style={[styles.sevBadge, sevStyle(t.severity)]}>{t.severity ?? '-'}</Text>
                  </View>
                  <View style={styles.defectMeta}>
                    <Text style={styles.metaPill}>
                      영상시점: {typeof t.video_timestamp_sec === 'number' ? `${t.video_timestamp_sec.toFixed(1)}s` : '-'}
                    </Text>
                    {t.score != null && <Text style={styles.metaPill}>강도 {t.score}</Text>}
                  </View>
                  {t.note ? <Text style={styles.note}>비고: {t.note}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text>DRONE INSPECT</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
          <Text>{report.site_name ?? ''}{report.site_unit ? ` ${report.site_unit}` : ''}</Text>
        </View>
      </Page>
    </Document>
  )
}

export default function PdfExportButton({ report, label = 'PDF 내보내기', variant = 'primary' }) {
  const [showPreview, setShowPreview] = useState(false)

  const date = report.inspection_date ?? new Date().toISOString().slice(0, 10)
  const site = (report.site_name ?? 'report').replace(/[\\/:*?"<>|]/g, '_')
  const filename = `${date.replace(/-/g, '')}_${site}_하자리포트.pdf`

  const baseClass =
    variant === 'primary'
      ? 'bg-red-600 text-white hover:bg-red-700'
      : 'bg-white text-red-700 border border-red-600 hover:bg-red-50'

  return (
    <>
      <button
        type="button"
        onClick={() => setShowPreview(true)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold shadow-sm transition ${baseClass}`}
        title="PDF 미리보기 후 다운로드"
      >
        <Download size={13} /> {label}
      </button>
      {showPreview && (
        <PdfPreviewModal
          document={<ReportDocument report={report} />}
          filename={filename}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  )
}
