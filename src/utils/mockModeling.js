/**
 * utils/mockModeling.js
 * 역할: Level 별 3D 모델링 프로세스를 프로시저럴하게 시뮬레이션
 *       - 4단계 스테이지 텍스트 + 0 → 100 프로그레스
 *       - 실제 백엔드(CAD 파싱/평면도 변환/SLAM) 연결 전 데모용 — DB 미연결 단계
 *       - requestAnimationFrame 기반이라 tab 비활성 시 자동 pause(browser throttle)
 */

// Level 별 스테이지 정의 — 도메인 용어에 맞춰 차별화
const STAGES_BY_LEVEL = {
  1: [
    { label: '도면 파싱 중', until: 25 },
    { label: '레이어 추출', until: 55 },
    { label: '3D 압출', until: 85 },
    { label: 'LiDAR 정합', until: 100 },
  ],
  2: [
    { label: '이미지 정규화', until: 25 },
    { label: '벽·문 추출', until: 55 },
    { label: '벽 extrude', until: 85 },
    { label: '텍스처 매핑', until: 100 },
  ],
  3: [
    { label: '드론 비행 초기화', until: 15 },
    { label: 'SLAM 포인트 수집', until: 55 },
    { label: '공간 좌표 병합', until: 85 },
    { label: 'LiDAR 정합', until: 100 },
  ],
}

// Level 별 총 소요 시간 (ms). L3(자율비행) 가 가장 "진짜스러운" 체감 시간.
const DURATION_BY_LEVEL = {
  1: 7000,
  2: 7000,
  3: 11000,
}

/**
 * 모델링 러너 실행
 * @param {{ level: 1|2|3, onTick: ({progress, stage}) => void, onComplete: () => void }} opts
 * @returns {() => void} cancel 함수
 */
export function runMockModeling({ level, onTick, onComplete }) {
  const stages = STAGES_BY_LEVEL[level] ?? STAGES_BY_LEVEL[3]
  const duration = DURATION_BY_LEVEL[level] ?? 8000

  const started = performance.now()
  let raf = null
  let cancelled = false

  function tick(now) {
    if (cancelled) return
    const elapsed = now - started
    const pct = Math.min(100, (elapsed / duration) * 100)
    const stage = stages.find((s) => pct <= s.until) ?? stages[stages.length - 1]
    onTick?.({ progress: Math.round(pct), stage: stage.label })

    if (pct < 100) {
      raf = requestAnimationFrame(tick)
    } else {
      onComplete?.()
    }
  }
  raf = requestAnimationFrame(tick)

  return () => {
    cancelled = true
    if (raf) cancelAnimationFrame(raf)
  }
}

export { STAGES_BY_LEVEL, DURATION_BY_LEVEL }
