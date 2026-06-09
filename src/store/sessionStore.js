/**
 * store/sessionStore.js
 * 역할: 점검 세션 전역 관리 (현장/운용자/날짜/Level/모델링 진행) + localStorage persist
 *       - 직원 전용 진입 시 Setup → Level → Modeling → Dashboard 순서로 채워짐
 *       - persist: 새로고침에도 세션 유지 (File 객체는 직렬화 불가라 메타만, L2 이미지는 base64)
 *       - runMockModeling 유틸과 연동 — 실제 백엔드 연결 전 프로시저럴 시뮬레이션
 *
 * 제약:
 *   - uploadedImageDataUrl (L2 전용) 은 base64 라 localStorage 쿼터(≈5MB) 주의. 큰 파일은 자동 resize 하지 않으므로
 *     데모용 평면도 이미지는 1MB 미만 권장.
 *   - CAD 파일(L1) 은 dashboard 에서 실제 내용이 필요 없으므로 메타(name/size) 만 persist.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { runMockModeling } from '../utils/mockModeling.js'

// 클로저에 러너 cancel 함수 보관 (store state 밖 — persist 되면 안 되는 런타임 참조)
let cancelRunner = null

const todayISO = () => new Date().toISOString().slice(0, 10)

const useSessionStore = create(
  persist(
    (set, get) => ({
      // ── Setup 단계 ──────────────────────────
      siteName: '',           // 현장명 (아파트명)
      siteUnit: '',           // 동·호수 ("102동 1501호")
      operatorName: '',       // 점검자
      inspectionDate: todayISO(),
      inspectionType: '',     // 점검구분: '사전점검' | '입주점검' | '정기'
      inspectionArea: '',     // 점검면적 (예: "84㎡")
      department: '',         // 소속
      position: '',           // 직책
      phoneNumber: '',        // 연락처
      witness: '',            // 입회자
      confirmer: '',          // 확인자 (리포트 편집 시 기입)

      // ── Level & Modeling 단계 ──────────────
      level: null, // 1 | 2 | 3 | null
      uploadedFileName: null,
      uploadedFileSize: null,
      uploadedImageDataUrl: null, // L2 전용: BuildingMesh 텍스처용 base64 (persist)
      wallsData: null,            // 벽체 좌표 [{x1,y1,x2,y2}, ...] (0-1 정규화)
      outline: null,              // 건물 외곽 다각형 [{x,y}, ...] (0-1 정규화, 닫힘)
      // //* [Modified Code 2026-05-13] 정확한 치수 산출용
      imageWidth: null,           // 원본 이미지 가로(px) — 종횡비 보존용
      imageHeight: null,          // 원본 이미지 세로(px)
      scalePxPerMeter: null,      // calibrate 결과 — 있으면 실측 미터 단위 렌더
      // //* [Modified Code 2026-05-13] 가구/빌트인 — 자율비행 충돌 회피용
      furnitureData: null,        // [{cx,cy,w,h,angle,label}, ...] (0-1 정규화)
      modelStatus: 'pending', // 'pending' | 'modeling' | 'ready'
      modelProgress: 0,
      modelStage: '',

      // //* [Modified Code] 흐름 재설계 (2026-04-16): 모델 소스 구분
      //   'premodel'  = /employee/pre-work 에서 미리 만들어둔 모델을 로드
      //   'drone'     = L3 자율비행 실시간 스캔
      //   'test'      = 테스트 모드 (로컬 이미지/영상으로 프로토타입 테스트)
      modelSource: null, // 'premodel' | 'drone' | 'test' | null
      loadedPreModelId: null, // preModelStore.preModels 의 id 참조

      // ── 테스트 모드 ───────────────────────────
      isTestMode: false,
      testSource: 'project', // 'project' (프로젝트 로컬) | 'upload' (직접 업로드)
      testPlayState: 'stopped', // 'stopped' | 'playing' | 'paused'
      testDetectionMode: 'bbox', // 'bbox' (네모박스) | 'detection' (객체감지)

      // ── 세션 메타 ──────────────────────────
      sessionId: null,
      startedAt: null,
      finishedAt: null,

      // ── Actions ───────────────────────────

      /** Setup 단계: 현장·운용자·날짜·부가 정보 커밋 */
      setSessionInfo: (info) =>
        set({
          siteName: info.siteName ?? '',
          siteUnit: info.siteUnit ?? '',
          operatorName: info.operatorName ?? '',
          inspectionDate: info.inspectionDate ?? todayISO(),
          inspectionType: info.inspectionType ?? '',
          inspectionArea: info.inspectionArea ?? '',
          department: info.department ?? '',
          position: info.position ?? '',
          phoneNumber: info.phoneNumber ?? '',
          witness: info.witness ?? '',
        }),

      /** 확인자 — 리포트 편집기에서 별도 기입 */
      setConfirmer: (name) => set({ confirmer: name }),

      /** Level 변경 시 업로드/모델 상태 리셋 (이전 Level 흔적 제거) */
      setLevel: (level) =>
        set({
          level,
          uploadedFileName: null,
          uploadedFileSize: null,
          uploadedImageDataUrl: null,
          wallsData: null,
          outline: null,
          imageWidth: null,
          imageHeight: null,
          scalePxPerMeter: null,
          furnitureData: null,
          modelStatus: 'pending',
          modelProgress: 0,
          modelStage: '',
          modelSource: null,
          loadedPreModelId: null,
        }),

      /**
       * 사전 모델 선택 — /session/level 에서 pre-made model 클릭 시.
       * preModel: { id, level, fileName, imageDataUrl, wallsData, outline, imageWidth, imageHeight, scalePxPerMeter }
       */
      selectPreModel: (preModel) =>
        set({
          level: preModel.level,
          modelSource: 'premodel',
          loadedPreModelId: preModel.id,
          uploadedFileName: preModel.fileName,
          uploadedFileSize: preModel.fileSize ?? 0,
          uploadedImageDataUrl: preModel.imageDataUrl ?? null,
          wallsData: preModel.wallsData ?? null,
          outline: preModel.outline ?? null,
          imageWidth: preModel.imageWidth ?? null,
          imageHeight: preModel.imageHeight ?? null,
          scalePxPerMeter: preModel.scalePxPerMeter ?? null,
          furnitureData: preModel.furnitureData ?? null,
          modelStatus: 'pending',
          modelProgress: 0,
          modelStage: '',
        }),

      /** 드론 자율비행 선택 — L3 고정. */
      selectDroneScan: () =>
        set({
          level: 3,
          modelSource: 'drone',
          loadedPreModelId: null,
          uploadedFileName: null,
          uploadedFileSize: null,
          uploadedImageDataUrl: null,
          wallsData: null,
          outline: null,
          imageWidth: null,
          imageHeight: null,
          scalePxPerMeter: null,
          furnitureData: null,
          modelStatus: 'pending',
          modelProgress: 0,
          modelStage: '',
        }),

      /** L1/L2 업로드 처리 — File 객체 받아 메타만 저장. 이미지면 base64 도 저장 */
      setUploadedFile: async (file) => {
        if (!file) {
          set({
            uploadedFileName: null,
            uploadedFileSize: null,
            uploadedImageDataUrl: null,
            wallsData: null,
            outline: null,
          })
          return
        }
        const isImage = file.type?.startsWith('image/')
        let imageDataUrl = null
        if (isImage) {
          imageDataUrl = await readFileAsDataUrl(file)
        }
        set({
          uploadedFileName: file.name,
          uploadedFileSize: file.size,
          uploadedImageDataUrl: imageDataUrl,
        })
      },

      /** 모델링 시작 — mockModeling 러너 기동, onTick 으로 state 업데이트 */
      startModeling: () => {
        if (get().modelStatus === 'modeling') return
        const level = get().level
        if (!level) return
        set({
          modelStatus: 'modeling',
          modelProgress: 0,
          modelStage: '초기화...',
          startedAt: get().startedAt ?? Date.now(),
          sessionId: get().sessionId ?? crypto.randomUUID(),
        })
        cancelRunner?.()
        cancelRunner = runMockModeling({
          level,
          onTick: ({ progress, stage }) => set({ modelProgress: progress, modelStage: stage }),
          onComplete: () => {
            cancelRunner = null
            set({ modelStatus: 'ready', modelProgress: 100 })
          },
        })
      },

      /** 모델링 취소 (뒤로가기 등) */
      cancelModeling: () => {
        cancelRunner?.()
        cancelRunner = null
        set({ modelStatus: 'pending', modelProgress: 0, modelStage: '' })
      },

      /** 테스트 모드 진입 — 세션 가드 통과를 위해 목업 데이터 채우고 modelStatus='ready' 설정 */
      enterTestMode: () => {
        cancelRunner?.()
        cancelRunner = null
        set({
          isTestMode: true,
          // 진입 즉시 '파일 첨부' 버튼이 보이도록 기본 소스를 upload 로 둔다
          // (project 였을 때는 업로드 탭을 한 번 더 눌러야 첨부 UI가 떠서 동선이 길었음).
          testSource: 'upload',
          siteName: '[TEST] 하자 검출 테스트',
          siteUnit: 'TEST-001',
          operatorName: '테스트 운용자',
          inspectionDate: todayISO(),
          inspectionType: '테스트',
          inspectionArea: 'N/A',
          department: 'R&D',
          position: '개발자',
          phoneNumber: '',
          witness: '',
          level: 3,
          modelStatus: 'ready',
          modelProgress: 100,
          modelStage: '현장 점검',
          modelSource: 'test',
          loadedPreModelId: null,
          uploadedFileName: null,
          uploadedFileSize: null,
          uploadedImageDataUrl: null,
          wallsData: null,
          outline: null,
          imageWidth: null,
          imageHeight: null,
          scalePxPerMeter: null,
          furnitureData: null,
          sessionId: `test-${crypto.randomUUID()}`,
          startedAt: Date.now(),
          finishedAt: null,
        })
      },

      /** 테스트 이미지 소스 전환: 'project' ↔ 'upload' */
      setTestSource: (source) => set({ testSource: source }),

      /** 테스트 재생 상태: 'stopped' | 'playing' | 'paused' */
      setTestPlayState: (state) => set({ testPlayState: state }),

      /** 테스트 감지 모드: 'bbox' | 'detection' */
      setTestDetectionMode: (mode) => set({ testDetectionMode: mode }),

      /** 비행 종료 시 타임스탬프 기록 (리포트 용) */
      finish: () => set({ finishedAt: Date.now() }),

      /** 전체 초기화 — "새 점검 시작" 버튼에서 호출 */
      reset: () => {
        cancelRunner?.()
        cancelRunner = null
        set({
          siteName: '',
          siteUnit: '',
          operatorName: '',
          inspectionDate: todayISO(),
          inspectionType: '',
          inspectionArea: '',
          department: '',
          position: '',
          phoneNumber: '',
          witness: '',
          confirmer: '',
          level: null,
          uploadedFileName: null,
          uploadedFileSize: null,
          uploadedImageDataUrl: null,
          wallsData: null,
          outline: null,
          imageWidth: null,
          imageHeight: null,
          scalePxPerMeter: null,
          furnitureData: null,
          modelStatus: 'pending',
          modelProgress: 0,
          modelStage: '',
          modelSource: null,
          loadedPreModelId: null,
          isTestMode: false,
          testSource: 'project',
          testPlayState: 'stopped',
          testDetectionMode: 'bbox',
          sessionId: null,
          startedAt: null,
          finishedAt: null,
        })
      },
    }),
    {
      name: 'drone-inspect-session',
      // File 객체/러너 취소 클로저/런타임 전용 필드 제외
      partialize: (state) => ({
        siteName: state.siteName,
        siteUnit: state.siteUnit,
        operatorName: state.operatorName,
        inspectionDate: state.inspectionDate,
        inspectionType: state.inspectionType,
        inspectionArea: state.inspectionArea,
        department: state.department,
        position: state.position,
        phoneNumber: state.phoneNumber,
        witness: state.witness,
        confirmer: state.confirmer,
        level: state.level,
        uploadedFileName: state.uploadedFileName,
        uploadedFileSize: state.uploadedFileSize,
        uploadedImageDataUrl: state.uploadedImageDataUrl,
        wallsData: state.wallsData,
        outline: state.outline,
        imageWidth: state.imageWidth,
        imageHeight: state.imageHeight,
        scalePxPerMeter: state.scalePxPerMeter,
        furnitureData: state.furnitureData,
        modelStatus: state.modelStatus,
        modelSource: state.modelSource,
        loadedPreModelId: state.loadedPreModelId,
        isTestMode: state.isTestMode,
        testSource: state.testSource,
        testDetectionMode: state.testDetectionMode,
        sessionId: state.sessionId,
        startedAt: state.startedAt,
        finishedAt: state.finishedAt,
      }),
    }
  )
)

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default useSessionStore
