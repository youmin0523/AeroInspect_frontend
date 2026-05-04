/**
 * store/preModelStore.js
 * 역할: 사전 작업(`/employee/pre-work`) 에서 생성된 3D 모델 "라이브러리" — 세션과 분리된 전역 자원
 *
 *   흐름 정합성 (사용자 확정 2026-04-16):
 *     (1) 사무실에서 `/employee/pre-work` 진입 → 현장 라벨 + Level(1=CAD / 2=평면도) 선택 + 파일 업로드
 *         → Mock 3D 모델링 → 완료 시 preModels 배열에 append
 *     (2) 현장 나가서 `/session/setup` 에 같은 현장 라벨 입력 → `/session/level` 이 라벨 매칭으로
 *         기존 preModel 을 "로드 옵션" 으로 노출, 사용자가 선택 시 세션은 level=1/2, modelSource='premodel'
 *         상태로 /session/modeling 진입 → 짧은 "로드 중" 애니메이션 후 대시보드 진입
 *     (3) 매칭되는 preModel 이 없으면 L3(드론 자율비행) 만 선택 가능 → 11초 시뮬레이션
 *
 *   persist: 5MB 쿼터 주의. L2 이미지(base64) 포함 시 항목당 평균 300KB~1MB. 데모용.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const usePreModelStore = create(
  persist(
    (set, get) => ({
      /**
       * preModels: [
       *   {
       *     id: string (uuid),
       *     siteName: string,
       *     level: 1 | 2,
       *     fileName: string,
       *     fileSize: number,
       *     imageDataUrl: string | null,  // L2 전용: BuildingMesh 바닥 텍스처 용 base64
       *     wallsData: array | null,      // 벽체 좌표 [{x1,y1,x2,y2}, ...] (0-1 정규화)
       *     outline: array | null,        // 건물 외곽 다각형 [{x,y}, ...] (0-1 정규화, 닫힘)
       *     createdAt: number (ms),
       *   }
       * ]
       */
      preModels: [],

      /** 사전 모델 추가 — PreWork 페이지에서 벽체 추출 완료 시 호출 */
      addPreModel: (model) =>
        set((state) => ({
          preModels: [
            ...state.preModels,
            {
              id: model.id ?? crypto.randomUUID(),
              siteName: model.siteName,
              level: model.level,
              fileName: model.fileName,
              fileSize: model.fileSize ?? 0,
              imageDataUrl: model.imageDataUrl ?? null,
              wallsData: model.wallsData ?? null,
              outline: model.outline ?? null,
              createdAt: Date.now(),
            },
          ],
        })),

      /** 특정 사전 모델 제거 */
      removePreModel: (id) =>
        set((state) => ({
          preModels: state.preModels.filter((m) => m.id !== id),
        })),

      /** 현장명으로 필터 — SessionLevel 에서 "이 현장에 맞는 모델" 조회 */
      listForSite: (siteName) => {
        if (!siteName) return []
        return get().preModels.filter((m) => m.siteName === siteName)
      },

      /** 모두 지우기 (테스트/데모용) */
      clear: () => set({ preModels: [] }),
    }),
    {
      name: 'drone-inspect-pre-models',
      // File 객체는 들어오지 않지만(이미 base64 변환됨), 방어적으로 전체 구조 그대로 persist.
    }
  )
)

export default usePreModelStore
