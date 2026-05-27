# AeroInspect Frontend

드론 기반 자율 하자 점검 플랫폼 **AeroInspect**의 웹 프론트엔드입니다. React + Vite SPA 위에 3D 디지털 트윈 대시보드, 실시간 드론 영상 스트림, 직원·관리자 워크스페이스, PDF/Excel 보고서 출력까지 한 번에 제공합니다.

---

## 🛠️ 기술 스택

### 코어
| 구분 | 라이브러리 | 버전 | 용도 |
|------|-----------|------|------|
| Framework | **React** | 18.3 | UI 렌더링 (함수형 컴포넌트 + Hooks) |
| Build Tool | **Vite** | 6.0 | 개발 서버 / 번들러 (HMR, ESM) |
| Routing | **react-router-dom** | 6.28 | SPA 라우팅, 중첩 라우트, 보호 라우트 |
| State | **Zustand** | 5.0 | 전역 상태 (스토어 9개, 셀렉터 기반 구독) |
| HTTP | **axios** | 1.7 | REST API 호출, 인터셉터로 JWT 자동 첨부 |

### 3D · 비주얼라이제이션
| 라이브러리 | 용도 |
|------------|------|
| **three** + **@react-three/fiber** | 3D 디지털 트윈 캔버스 (드론·건물·점검 경로) |
| **@react-three/drei** | 카메라 컨트롤·OrbitControls·헬퍼 |
| **recharts** | 분석 페이지 차트 (Defect 추이·심각도 분포) |

### 스타일링 · UX
| 라이브러리 | 용도 |
|------------|------|
| **tailwindcss** 3.4 + **postcss** + **autoprefixer** | 유틸리티 우선 스타일 |
| **@fontsource/noto-sans-kr** | 한글 폰트 번들링 |
| **lucide-react** + **remixicons** | 아이콘 |
| **clsx** | 조건부 className 합성 |
| **emoji-picker-react** | 채팅 이모지 입력 |

### 데이터 · 산출물
| 라이브러리 | 용도 |
|------------|------|
| **@react-pdf/renderer** | 점검 보고서 PDF 출력 |
| **exceljs** | 엑셀 보고서 (.xlsx) 출력 |
| **date-fns** | 날짜 포맷 / 상대 시간 |

### 통신 · 실시간
- **WebSocket** (네이티브) — `/api/v1/ws?channel=defects`, `/api/v1/ws/stream` 구독
- **MJPEG Stream** — 드론 영상 `<img src="/stream/...">` 직결
- **Vite Dev Proxy** — `/api`, `/ws`, `/stream`, `/odcloud`(국세청 사업자 조회) CORS 우회

---

## 🚀 사용법

### 1) 사전 요구
- **Node.js 18+** (권장 20 LTS)
- **npm 9+** 또는 yarn / pnpm
- 백엔드 서버가 `http://localhost:8000`에서 실행 중일 것 (Vite 프록시 기본값)

### 2) 설치 & 실행
```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

### 3) 환경 변수
프로젝트 루트(`frontend/`)에 `.env.local` 생성:

```env
# 운영 배포 시 백엔드 절대 URL로 교체. 로컬 개발에서는 비워두면 Vite 프록시 경유
VITE_API_BASE_URL=

# OAuth (Google/Kakao/Naver) — 콜백 URL 검증용
VITE_OAUTH_REDIRECT_BASE=http://localhost:5173
```

> `import.meta.env.VITE_*` 만 클라이언트 번들에 노출됩니다. 비공개 키는 절대 넣지 마세요.

### 4) 빌드 & 미리보기
```bash
npm run build        # → dist/ 산출
npm run preview      # 빌드 결과 로컬 검증
npm run lint         # ESLint
```

### 5) 배포
- 정적 호스팅(Vercel / Cloudflare Pages 등)에 `dist/` 업로드
- 운영 환경에서는 `/api`, `/ws`, `/stream`을 백엔드 도메인으로 리라이트하거나 `VITE_API_BASE_URL`에 절대 URL 지정

---

## 📂 디렉터리 구조

```
frontend/
├── public/                  정적 자산 (favicon, sample-images)
├── src/
│   ├── App.jsx              루트 라우터 (공개/세션/직원/대시보드 라우트 분기)
│   ├── main.jsx             진입점 (createRoot + StrictMode)
│   ├── api/                 REST 클라이언트 (axios)
│   │   ├── authApi.js               로그인·회원가입·OAuth
│   │   ├── businessVerifyApi.js     국세청 사업자 상태 조회 (odcloud)
│   │   ├── defectsApi.js            하자 로그 CRUD
│   │   ├── reportsApi.js            보고서 생성·조회
│   │   ├── sitesApi.js              현장 관리
│   │   ├── chatApi.js · notificationApi.js · organizationApi.js · reportApi.js
│   ├── components/          기능별 UI 컴포넌트
│   │   ├── analytics/  charts/  chat/  common/  dashboard/
│   │   ├── auth/       로그인 가드 · OrgRequired
│   │   ├── defects/    하자 카드·필터·상세 모달
│   │   ├── landing/    랜딩 섹션 (Hero, Feature, Pricing 등)
│   │   ├── layout/     Sidebar · Header
│   │   ├── map3d/      Three.js 디지털 트윈 캔버스
│   │   ├── notification/  실시간 알림 토스트
│   │   ├── report/     PDF/Excel 미리보기 + ReportModal
│   │   ├── session/    세션 워크플로우(Setup → Level → Modeling) 가드
│   │   ├── site/       현장 등록·관리 폼
│   │   └── video/      드론 라이브 스트림 뷰어
│   ├── pages/
│   │   ├── Landing.jsx              공개 랜딩
│   │   ├── Login.jsx · Signup.jsx · FindAccount.jsx · OAuthCallback.jsx
│   │   ├── EmployeeLanding.jsx      직원 허브 (조직 소속 필수)
│   │   ├── Dashboard.jsx            풀스크린 HUD 디지털 트윈 대시보드
│   │   ├── SampleReport.jsx         보고서 샘플
│   │   ├── employee/   PreWork · ReportsList · ReportDetail · SiteManagement · SiteDetail · Analytics · Chat · AdminMembers · Onboarding
│   │   └── session/    SessionSetup · SessionLevel · SessionModeling
│   ├── store/               Zustand 전역 상태 (총 9개)
│   │   ├── authStore.js             로그인 사용자·JWT·조직 정보
│   │   ├── sessionStore.js          현장 점검 세션 (testMode 포함)
│   │   ├── droneStore.js            드론 텔레메트리·연결 상태
│   │   ├── defectStore.js           실시간 하자 목록
│   │   ├── sitesStore.js            현장 마스터
│   │   ├── chatStore.js             채팅·미읽음 카운트
│   │   ├── notificationStore.js     알림
│   │   ├── reportsStore.js          보고서 캐시
│   │   └── preModelStore.js         3D 사전 모델링 상태
│   ├── hooks/
│   │   ├── useWebSocket.js          /ws 채널 구독 + 자동 재연결
│   │   ├── useThermalData.js        열화상 오버레이 데이터
│   │   ├── useDefects.js            하자 페이지네이션·필터
│   │   └── useReveal.js             스크롤 등장 애니메이션
│   ├── constants/           defectCategories · siteTypes · trades · chatConstants · notificationCategories
│   ├── data/                정적 모킹·시드 데이터
│   ├── utils/               mockModeling · smoothScroll · templateExport(엑셀)
│   ├── assets/              이미지·아이콘
│   └── index.css            Tailwind base + 커스텀 변수
├── index.html               Vite 진입 HTML
├── vite.config.js           프록시(/api, /ws, /stream, /odcloud) + 빌드 설정
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

---

## 🧭 라우팅 맵

| 경로 | 컴포넌트 | 가드 | 설명 |
|------|---------|------|------|
| `/` | Landing | — | 공개 랜딩(소개·가격·문의) |
| `/login` · `/signup` · `/find-account` | Login/Signup/FindAccount | — | 계정 페이지 |
| `/auth/:provider/callback` | OAuthCallback | — | Google/Kakao/Naver OAuth 콜백 |
| `/sample-report` | SampleReport | — | 보고서 샘플 |
| `/employee/onboarding` | Onboarding | 로그인 | 미소속 사용자 진입점 |
| `/employee` | EmployeeLanding | OrgRequired | 직원 허브 (사무실) |
| `/employee/pre-work` | PreWork | OrgRequired | 점검 사전 준비 |
| `/employee/sites` · `/employee/sites/:id` | SiteManagement / SiteDetail | OrgRequired | 현장 마스터 |
| `/employee/reports` · `/employee/reports/:id` | ReportsList / ReportDetail | OrgRequired | 보고서 |
| `/employee/analytics` | Analytics | OrgRequired | 통계 차트 |
| `/employee/chat` | Chat | OrgRequired | 사내 채팅 |
| `/employee/admin/members` | AdminMembers | OrgRequired + Admin | 조직원 관리 |
| `/session/setup` · `/level` · `/modeling` | SessionSetup/Level/Modeling | — | 현장 점검 세션 워크플로우 |
| `/dashboard` | DashboardLayout (HUD) | ProtectedSession | 3D 디지털 트윈 대시보드 |
| `/dashboard/report` | ReportModal (nested) | ProtectedSession | 보고서 오버레이 |

> **UX 경계 원칙** — `/employee` 영역은 사무실 허브, `/session/*` ~ `/dashboard`는 현장 실무. 두 영역은 섞지 않습니다.

---

## 🔌 백엔드 연동

### REST
- 모든 API는 `/api/v1/*` 프리픽스. axios 기본 URL은 `VITE_API_BASE_URL` 또는 동일 출처(개발 시 Vite 프록시)
- JWT는 `authStore`에 저장 → axios 인터셉터에서 `Authorization: Bearer <token>` 자동 첨부

### WebSocket (`useWebSocket` 훅)
| 채널 | 용도 |
|------|------|
| `/api/v1/ws?channel=defects` | 신규 하자 이벤트 (`defect.new`) → `defectStore` 갱신 |
| `/api/v1/ws?channel=stream` | 추론 결과 broadcast |
| `/api/v1/ws/stream` | 드론 JPEG 업링크 + 추론 다운링크 (대시보드 전용) |

### 영상 스트림
- MJPEG: `<img src="/stream/live">` 형태로 직결 (Vite 프록시 → 백엔드)
- 테스트 모드: 대시보드 마운트 시 `POST /api/v1/stream/test/init` 자동 호출, 언마운트 시 `/test/stop`

---

## 🧪 개발 가이드

### 코드 컨벤션
- 함수형 컴포넌트 + Hooks. Class 컴포넌트 금지
- 파일명: 컴포넌트는 `PascalCase.jsx`, 훅·유틸·스토어는 `camelCase.js`
- Zustand 셀렉터는 항상 단일 필드 형태로 구독해 불필요한 리렌더 차단
  ```jsx
  // ✅
  const isTestMode = useSessionStore((s) => s.isTestMode)
  // ❌ (객체 반환 → 리렌더 폭증)
  const { isTestMode, sessionId } = useSessionStore()
  ```
- 스타일은 Tailwind 우선, 컴포넌트 단위로 한정. 글로벌 CSS는 `index.css`에서만

### 주요 스크립트
| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 (포트 5173, HMR) |
| `npm run build` | 프로덕션 빌드 → `dist/` |
| `npm run preview` | 빌드 결과 로컬 서빙 |
| `npm run lint` | ESLint (react / react-hooks 룰셋) |

### 운영 에러 모니터링 (Sentry)

운영 환경에서만 활성화. 로컬 개발은 `VITE_SENTRY_DSN` 비워두면 자동 no-op (init 도 skip, ErrorBoundary fallback UI 는 그대로 동작).

1. **DSN 발급**: [sentry.io](https://sentry.io) → 새 프로젝트 (Platform: `React`) → Settings → Client Keys (DSN) 복사.
2. **Vercel 환경변수 등록** (Project Settings → Environment Variables, Production 환경):
   - `VITE_SENTRY_DSN` = 발급받은 DSN
   - `VITE_SENTRY_ENVIRONMENT` = `production`
   - (선택) `VITE_SENTRY_TRACES_SAMPLE_RATE` = `0.1`, `VITE_SENTRY_REPLAYS_ERROR_RATE` = `1.0`
3. **(선택) sourcemap 업로드** — 운영 stack trace 를 원본 소스로 매핑하려면 build env 에 추가:
   - `SENTRY_AUTH_TOKEN` (User Auth Token, scopes: `project:releases`, `project:write`)
   - `SENTRY_ORG`, `SENTRY_PROJECT`
   - 세 변수 모두 있으면 `vite.config.js` 의 `@sentry/vite-plugin` 이 자동 활성, 빌드 결과 sourcemap 을 Sentry 로 업로드.
4. **자동 적용 항목**: BrowserTracing 라우트 트랜잭션, Session Replay (에러 발생 시만 자동 첨부, 텍스트/입력/미디어 전체 마스킹), `SentryErrorBoundary` 트리 최상위 fallback (검정화면 방지), 민감 키 `[REDACTED]`, `sendDefaultPii=false`.

### 동작 확인 체크리스트
- [ ] `npm run dev` 후 `http://localhost:5173` 진입 시 Landing 렌더
- [ ] 로그인 후 `/employee` 진입, 조직 미소속이면 `/onboarding`으로 리다이렉트
- [ ] `/session/setup → level → modeling` 순서대로만 진행 가능 (가드 정상)
- [ ] `/dashboard` 진입 시 WebSocket 연결, 좌상단 상태 인디케이터 GREEN
- [ ] 하자 신규 발생 시 토스트 + 사이드 패널 카드 즉시 갱신
- [ ] PDF/Excel 보고서 다운로드 정상

---

## 📎 관련 문서
- 백엔드 API · 추론 파이프라인: [`backend/README.md`](../backend/README.md)
- 프로젝트 전체 개요·온보딩: [`../README.md`](../README.md)
- 팀 규칙 · AI Vibe Coding 가이드: [`team_project_rules.md`](team_project_rules.md)
- 작업 로그: [`Vibe_Coding_Log.md`](Vibe_Coding_Log.md)

---

**Happy Vibe Coding! 💡**
