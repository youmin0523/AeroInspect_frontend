# Frontend Implementation Plan

## 아키텍처 개요
- **프레임워크**: React 18 (Vite 빌드)
- **3D 렌더링**: React Three Fiber + Three.js (BuildingMesh, DroneMarker, DefectMarker)
- **상태 관리**: Zustand 9 stores (authStore, chatStore, defectStore, droneStore, notificationStore, preModelStore, reportsStore, sessionStore, sitesStore)
- **스타일링**: Tailwind CSS (Mobile First, 3단계 반응형)
- **API 통신**: axios (REST) + WebSocket (실시간 텔레메트리/하자/채팅)
- **리포트 생성**: @react-pdf/renderer (PDF) + SheetJS/ExcelJS (Excel)
- **아이콘**: Remix Icon 4.5.0 (CDN)

### UX 경계 정의 (메모리 고정)
| 영역 | 경로 | 성격 |
|------|------|------|
| 사무실 허브 | `/employee/*` | 도면 사전 작업, 보고서 작성, 현장/팀 관리, KPI/일정/알림/채팅 |
| 현장 실무 | `/session/*` → `/dashboard` | 실시간 드론 관제, 하자 탐지, 3D 모델링 |
| **두 영역은 절대 섞지 않음** |

### 상태 관리 상세
| Store | persist | 주요 상태 | 주요 액션 |
|-------|---------|----------|----------|
| authStore | localStorage 4키 | token, user, isAuthenticated, organizations, currentOrg | setAuth, switchOrg, logout |
| chatStore | 없음 | conversations, activeConversationId, messages, unreadTotal/perConv, loading, searchQuery/filterType | fetchConversations, selectConversation, sendMessage, createConversation, startDM, markRead, leaveConversation |
| defectStore | 없음 | defects(500 FIFO), filters(severity/area/categoryCode), selectedDefect | addDefect(WS), setDefects(REST), setFilter, getFilteredDefects, getSeverityCounts |
| droneStore | 없음 | connectionStatus, telemetry(xyz/rpy/battery/speed/distance/mode), cameraMode(rgb/thermal/blend), selectedDroneId, missionStatus(idle/flying/ended) | updateTelemetry(WS), setCameraMode, setSelectedDrone(+DRONE_CAMERA_MAP), startMission/endMission |
| sessionStore | localStorage `drone-inspect-session` | 30+ 필드: Setup(siteName/operator/date/type/area 등), Level(1/2/3), Modeling(status/progress/stage), ModelSource(premodel/drone/test), TestMode(isTestMode/testSource/testPlayState/testDetectionMode) | setSessionInfo, setLevel, selectPreModel, selectDroneScan, setUploadedFile(base64), startModeling(mockModeling), enterTestMode, finish, reset |
| sitesStore | 없음 | sites, loading, error | fetchAll, fetchOne, create, update, remove |
| reportsStore | 없음 | reports, loading, error | fetchAll, fetchOne, create, update, remove |
| preModelStore | 없음 | models | add, remove |
| notificationStore | 없음 | notifications, unread | fetch, markRead |

---

## 구현 계획 (단계별 상세)

### Step 1. 랜딩 페이지 & 기초 라우팅 (260414~260416) ✅
- **담당**: @youminsu0523
- **파일**: Landing.jsx, 8개 landing 컴포넌트, Reveal.jsx, smoothScroll.js, ~80개 이미지 에셋
- **상세**: Hero 크로스페이드(더블 버퍼링, 5초 주기), IntersectionObserver Reveal, 스크롤 기반 헤더 투명↔흰색, ContactModal(사업자 진위 + 로그인 시 user 정보 자동 기입), Hero「서비스 도입 문의」→ContactModal 연동, B2B/B2C CTA, LandingHeader 3-column grid 중앙 정렬(비로그인 3링크 / 로그인 3링크+직원전용 중앙 합류), focus→focus-visible 전환(마우스 클릭 시 링 제거, 키보드 접근성 유지)

### Step 2. 인증 페이지 + 국세청 API (260416) ✅
- **담당**: @youminsu0523
- **파일**: Signup.jsx(784줄), Login.jsx(254줄), FindAccount.jsx(320줄), businessVerifyApi.js, vite.config.js
- **상세**: 개인/사업자 탭 전환, odcloud.kr 국세청 API(Vite 프록시), 약관 3종 아코디언, 소셜 로그인 UI(Google/Naver/Kakao)

### Step 3. 대시보드 HUD & 드론 관제 (260416~260424) ✅
- **담당**: @youminsu0523
- **파일**: Dashboard.jsx, DashboardTopBar.jsx, DronesPanel.jsx, DroneStatusCard.jsx, TestModeBar.jsx(319줄), droneStore.js
- **상세**: 풀스크린 HUD(16:9 LIVE 카메라, Thermal PIP, 3D Mini Map, AI Defect 패널), 드론 2대 카드+카메라 자동 매핑, 테스트 모드 재생/소스/업로드/시각화 제어

### Step 4. 세션 워크플로우 & 3D 시각화 (260416) ✅
- **담당**: @youminsu0523
- **파일**: SessionSetup/Level/Modeling.jsx, sessionStore.js(30+필드 persist), mockModeling.js, 세션 컴포넌트 5개, DroneMarker/BuildingMesh/DefectMarker.jsx, MissionControl.jsx
- **상세**: 3단계 플로우(Setup→Level→Modeling), Level별 Mock 시뮬레이터(6~12초), DroneMarker(cone+프로펠러+비행경로 500점 폴리라인+2D 그림자), 미션 시작/중지/착륙

### Step 5. 직원 사무실 허브 (260416) ✅
- **담당**: @youminsu0523
- **파일**: EmployeeLanding.jsx(749줄)
- **상세**: KPI 카드, 일정 테이블, 알림/공지, 팀원 현황, 최근 활동, 세션 카드(실데이터), MOCK_*→API 점진 교체 설계

### Step 6. 리포트 관리 & 내보내기 (260416~260417) ✅
- **담당**: @youminsu0523
- **파일**: ReportsList/ReportDetail.jsx, ReportEditor(AI 공종제안), AddDefectDialog, DefectEditRow, ExcelExportButton(SheetJS), PdfExportButton(react-pdf Noto Sans KR), ExcelPreviewModal, PdfPreviewModal, TemplateExportButton, templateExport.js(ExcelJS 양식 주입), 하자점검_결과보고서.xlsx 템플릿, trades.js(12종), PreWork.jsx
- **상세**: 공종별 그룹 테이블, AI 제안, 인라인 편집, Excel/PDF 미리보기+다운로드, 양식 주입(점검개요/결과총괄/하자상세/이미지)

### Step 7. 인증 & OAuth 연동 (260417~260420) ✅
- **담당**: @youminsu0523
- **파일**: authApi.js(login/oauthLogin/getMe/URL빌더 3종), authStore.js(token/user/orgs/localStorage 4키), OAuthCallback.jsx, Login.jsx
- **상세**: JWT Bearer, OAuth code→token→JWT 교환, 조직 자동 선택, 인증 상태 persist

### Step 8. 현장 관리 (260418) ✅
- **담당**: @youminsu0523
- **파일**: 22개 — sitesApi.js(시드 5건), sitesStore.js, SiteManagement.jsx(히어로+KPI+검색+필터+테이블), SiteDetail.jsx(미니KPI+2컬럼+3탭), SiteFormModal, 탭 3개, siteTypes.js, Analytics, TrendReport, WeeklyReport
- **상세**: CRUD + 필터(상태/건물유형/의뢰자), 히어로 배너, KPI 카드, 탭 전환(보고서/도면3D/촬영영상)

### Step 9. 채팅 & 알림 (260420~260424) ✅
- **담당**: @youminsu0523
- **파일**: Chat.jsx, 채팅 컴포넌트 9개, NotificationDropdown, chatStore(12+액션), chatApi(8함수), notificationStore, notificationApi, organizationApi
- **상세**: Slack 3컬럼 + 카카오톡 말풍선, DM 중복방지, 대화 나가기, 10종 알림 카테고리, 플로팅 채팅 버튼

### Step 10. 조직/멤버 관리 (260424) ✅
- **담당**: @youminsu0523
- **파일**: AdminMembers.jsx, organizationApi.js
- **상세**: 슈퍼어드민 조직 배정 4단계(조직→역할→부서→직위), 전체 조직 목록/부서 목록 로드

### Step 11. 모바일 반응형 & UI 개선 (260420) ✅
- **담당**: @unknownName-15
- **파일**: index.html(Remix Icon CDN), index.css(포커스링 제거), LandingHeader.jsx(햄버거 메뉴), HeroSection.jsx, Login/Signup/FindAccount.jsx(뒤로가기 통일)
- **상세**: 햄버거 메뉴(외부클릭/aria/드롭다운), navigate(-1)+아이콘 UX, focus:ring 전역 제거

### Step 12. API localStorage→백엔드 전환 (260424) ✅
- **담당**: @youminsu0523
- **파일**: chatApi/notificationApi/organizationApi/reportsApi/sitesApi
- **상세**: -1,000줄+ 목업 제거, axios fetch 교체

---

### Step 13 — 3D 리포트 샘플 페이지 (260427, @youminsu0523)
- **파일**: `pages/SampleReport.jsx`(신규), `components/landing/HeroSection.jsx`, `App.jsx`
- **상세**:
  - 랜딩「3D 리포트 샘플 보기」→ `/sample-report` 라우트 연결
  - 25평 아파트 내부 3D 모델링 (Three.js / R3F):
    - 6개 공간 (거실/주방/침실1/침실2/화장실/현관), 외벽(0.12m)/내벽(0.08m), 문 4개소, 창문 5개소
    - 가구 12종 복합 메시 (Sofa, DoubleBed, SingleBed, TVUnit, KitchenUnit, DiningSet, Bathtub, ToiletBowl, WashBasin, DeskWithChair, Wardrobe, ShoeRack, NightStand, CoffeeTable)
    - SLAM 포인트클라우드 18000점 (벽·바닥·천장·가구 표면 분포)
  - 드론 스캔 시뮬레이션:
    - `genScan(xMin, xMax, zMin, zMax, xN, zN, obstacles)` — 격자형 3D 수직 지그재그 패턴 자동 생성
    - Pass 1(x방향) + Pass 2(z방향 교차) → 3D 격자 전수 스캔
    - 가구 장애물 회피: 방별 바운딩 박스 배열, 가구 위(top+0.3m)부터 스캔
    - 문 개구부만 통과하는 호실 전환 경로
  - 근접 기반 하자 탐지 (반경 0.7m): 10개 하자, 드론 접근 시 마커 생성 + 패널 추가
  - 쿼드콥터 드론 모델 (1.5배, 시안/화이트, 4암+프로펠러+가드+LED+짐벌+스키드)
  - 스캔 컨트롤: 일시정지/재개/중지/시작, 실시간 진행률+현재 룸 표시

---

## 향후 계획 (미완료)
- [ ] `ProtectedEmployeeLayout` — 직원 라우트 인증 가드
- [x] **(2026-05-03)** EmployeeLanding MOCK_* 4개 상수 → 백엔드 `/api/v1/employee/*` + `/organizations/members` 병렬 fetch로 완전 교체
- [x] **(2026-05-03)** 가짜 팀원명 → 실제 팀(백승희/오희진/유민수)로 통일 (4파일)
- [ ] 반응형 전면 검증 (Mobile/Tablet/Desktop)
- [ ] 접근성(a11y) 감사 (키보드 내비게이션 포커스 복원)
- [ ] 다크 모드 지원
- [x] **(2026-05-06)** 브라우저 탭 favicon — 자체 로고 그래픽(텍스트 제외)을 ico/PNG 다중 사이즈로 등록(`frontend/public/favicon.ico` + `favicon-{16,32,192,512}.png` + `apple-touch-icon.png`), `index.html` link 5줄 등록
- [x] **(2026-05-06, R19 후속)** favicon 흰색 원 배경 추가 — 다크 탭/작은 사이즈 시인성 보강. 512×512 master 캔버스에 `FillEllipse` 흰 원 + inscribed 사각형 92% 기준 로고 재배치 + 모든 ico/PNG 갱신

---

## Revision History

### v6.0_260515 (작성자: @youminsu0523 / branch: MS)
- **(frontend R-v1.1.01) OpenAI 챗봇 UI 통합** — 통합 repo 와 동일.
  - 신규 `src/api/aiChatApi.js` — REST + SSE 스트리밍 (fetch+ReadableStream `data: {json}\n\n` 파서).
  - 신규 `src/store/aiChatStore.js` — Zustand. `isOpen / view / threads / messagesByThread / streaming`. 낙관적 user 메시지 + onDone 에서 thread 끌어올림.
  - 신규 `src/components/chatbot/` 8개 (FloatingChatbotButton / ChatbotPanel / Header / ThreadList / ChatbotMessageThread / ChatbotMessageBubble / ChatbotInput / GlobalFloatingChatbot). 우측 sliding drawer + violet FAB. react-markdown raw HTML 비허용.
  - `App.jsx` 마운트 + `package.json` `react-markdown` ^9.0.1.

### v5.1_260506 (작성자: @youminsu0523 / branch: main)
- **R19 (5/6)** Landing 탭 favicon 일원화 — 누락된 `/drone-icon.svg` 참조 제거 후 ico+PNG 다중 등록. PowerShell + System.Drawing 알파 row 스캔으로 로고 PNG의 graphic/text 자동 분리(graphic = rows 59–252, cols 235–441). 정사각 캔버스(239×239) 가운데 배치 + 양쪽 16px 패딩. ICO 직접 바이너리 작성(ICONDIR + ICONDIRENTRY × 3 + 16/32/48 PNG payload)으로 32bpp 알파 보존. 배포 환경 globe 기본 favicon 이슈 해소.
- **R23 (5/6, R19 후속)** favicon 흰 원 배경 + 로고 확대 — 다크 탭/작은 사이즈에서 어두운 푸른빛 로고가 묻히는 이슈 해결. master 사이즈 239 → 512 격상(다운샘플 안티앨리어싱 품질 향상), `FillEllipse(0,0,512,512)` 흰 원 배경, inscribed 사각형(=512/√2) 92% 기준(333×312)에 로고 aspect 보존 fit. 모든 사이즈(ico 16/32/48 + PNG 16/32/192/512 + apple-touch 180) 갱신 + 픽셀 검증으로 흰 원/투명/로고 색상 확인.

### v5.0_260503 (작성자: @youminsu0523 / branch: MS)
- **R12 (5/3)** EmployeeLanding.jsx의 4개 MOCK_* const(`MOCK_TODAY_SCHEDULE`, `MOCK_TEAM_MEMBERS`, `MOCK_MONTHLY_KPI`, `MOCK_RECENT_ACTIVITIES`) 완전 삭제 + axios 병렬 fetch (`/api/v1/employee/schedule/today`, `/employee/kpi/monthly`, `/employee/activities`, `/organizations/members`)
- KPI snake_case → camelCase 변환, 빈 응답 fallback 처리 (EMPTY_MONTHLY_KPI), 토큰 없으면 fetch 스킵
- mockup 팀원명 4파일(mockTrendData / chatConstants / SiteFormModal / EmployeeLanding) 일괄 정리

### v4.2_260427 (작성자: @youminsu0523 / branch: MS)
- Step 13 추가: 3D 리포트 샘플 페이지 (SampleReport.jsx)

### v4.1_260427 (작성자: @youminsu0523 / branch: MS)
- Step 1 갱신: LandingHeader 3-column grid 중앙 정렬 + 직원 전용 네비 합류 + focus-visible 전환

### v4.0_260427 (작성자: @youminsu0523 / branch: MS)
- 전면 재작성: git log 기반 12 Step 상세 기록, 상태 관리 상세 표, 라우팅 전체 구조

### v1.0_260413 (작성자: @Antigravity / branch: main)
- 프론트엔드 구현 계획서 초기화
