# Frontend Task.md

## 프로젝트 개요
- **목적**: AeroInspect AI 프론트엔드 — 실시간 3D 드론 관제 대시보드, 세션 워크플로우, 채팅/알림, 현장 관리, 리포트 뷰어
- **주요 스택**: React 18 (Vite), Three.js + React Three Fiber (R3F), Tailwind CSS, Zustand (9 stores), axios
- **팀원**: @youminsu0523 (풀스택), @unknownName-15 (인증 UI/반응형)

---

## 작업 목록 — @youminsu0523 (branch: MS)

### 3D 리포트 샘플 페이지 (260427)
- [x] v4.1_260427 — 3D 리포트 샘플 페이지 **SampleReport.jsx** (~1200줄, 신규)
  - `HeroSection.jsx`「3D 리포트 샘플 보기」버튼 → `/sample-report` 네비게이션 연결
  - `App.jsx`: `/sample-report` Route 추가
  - 25평 아파트 3D 모델링: 6개 공간(거실/주방/침실1/침실2/화장실/현관), 외벽/내벽/문/창문, 가구 12종(복합 메시)
  - 드론 스캔 시뮬레이션: 격자형 3D 수직 지그재그(genScan), 가구 장애물 회피(바운딩 박스 기반 높이 조정), 문 개구부만 통과
  - 근접 기반 하자 탐지(0.7m): 드론 접근 시 3D 마커+우측 패널 순차 추가
  - 쿼드콥터 드론 모델(1.5배 스케일, 시안/화이트, 4암+프로펠러+가드+LED+짐벌+스키드)
  - 스캔 컨트롤 UI: 일시정지/재개/중지/시작 버튼
  - SLAM 포인트 클라우드 18000점, 경로 트레일(주황), 하자 펄스 애니메이션

### 랜딩 페이지 & 라우팅 (260414~260416)
- [x] v2.0_260414 — React 대시보드 Header + DefectPanel 구현
  - `Header.jsx`: `useDroneStore` 텔레메트리(고도/속도/배터리/모드), `useDefectStore` 하자 심각도 카운트(HIGH/MED/LOW), WebSocket 연결 상태 뱃지
  - `DefectPanel.jsx`: `DefectFilter`(심각도/영역/카테고리) + `DefectCard` 리스트 + `useDefects` REST 초기 로드
- [x] v2.1_260415 — 랜딩 페이지 **95개 파일** (이미지 ~80개 포함)
  - `App.jsx` 라우팅: `/` = Landing, `/dashboard` = DashboardLayout (WS는 대시보드 진입 시에만 초기화)
  - `Landing.jsx`: 6개 섹션 조립 (LandingHeader + HeroSection + ServiceIntroSection + FeaturesSection + CasesSection + DualCTASection)
  - `HeroSection.jsx`: `import.meta.glob` 이미지 자동 스캔 → 5초 주기 3장 크로스페이드(더블 버퍼링) → 그라데이션 오버레이 → CTA 2개("3D 리포트 샘플 보기"/"서비스 도입 문의"), 「서비스 도입 문의」 클릭 시 `ContactModal` 직접 연동
  - `LandingHeader.jsx`: 스크롤 위치 기반 투명↔흰색 배경 전환, 로고 스왑(`logoWhite`/`logoDark`), `ContactModal` 연동, 3-column grid 중앙 정렬(비로그인: 3링크 / 로그인: 3링크+직원전용), focus→focus-visible 전환
  - `ContactModal.jsx`: 개인/사업자 탭, 사업자등록번호 10자리 진위 시뮬레이션, 담당자/연락처/문의 수집, 로그인 시 `authStore` user 정보(name/phone/account_type/biz_number) 자동 기입
  - `ServiceIntroSection.jsx`: 접근성/정밀성/효율성 3가치 카드 + `Reveal` 애니메이션
  - `FeaturesSection.jsx`: 하이브리드 3D 복원 / AI 하자 식별 / 정밀 공간 매핑 3기술 카드
  - `CasesSection.jsx`: B2B 건설사 / 정밀 안전진단 / B2C 입주민 3레퍼런스 + `CaseSlideshow` 크로스페이드
  - `DualCTASection.jsx`: B2B(다크 테마, 통합 관제) / B2C(옐로 테마, 3D 뷰어) 좌우 분할 CTA 체크리스트
  - `Reveal.jsx`: IntersectionObserver 스크롤 진입 1회 애니메이션 + `prefers-reduced-motion` 존중
  - `smoothScroll.js`: 앵커 링크 부드러운 스크롤 유틸 (`handleAnchorClick`, `smoothScrollTo`)
  - 이미지 에셋 ~80개: `assets/hero/`, `cases/`, `cta/`, `features/`, `logo/`
- [x] v2.2_260416 — 프론트엔드 인증 페이지 + 국세청 API **11개 파일**
  - `Signup.jsx` (784줄): 개인/사업자 탭, 사업자번호 국세청 진위확인(`checkBusinessStatus` odcloud.kr POST), 이메일 도메인 드롭다운+중복확인, 아이디 중복확인, 비밀번호 자동생성 옵션, 약관 3종(서비스/개인정보/마케팅) 아코디언+전체동의
  - `Login.jsx` (254줄): 개인/사업자 탭, 소셜 로그인(Google/Naver/Kakao 원형 아이콘), 아이디/비밀번호 찾기 링크
  - `FindAccount.jsx` (320줄): 아이디찾기/비밀번호찾기 탭, `?tab=id|pw` URL 쿼리 파라미터 연동
  - `businessVerifyApi.js`: 국세청 odcloud.kr POST (Vite 프록시 `/odcloud` 경유), `interpretStatus()` 상태코드 매핑(01계속/02휴업/03폐업)
  - `vite.config.js`: `/odcloud` 프록시 + `/api` 프록시 설정

### 대시보드 HUD & 드론 관제 (260416~260417)
- [x] v2.3_260416 — 풀스크린 HUD 대시보드 UI **31개 파일**
  - `DashboardTopBar.jsx`: 풀스크린 HUD 상단 바 — 브랜드 로고, Global Search, Satellite Map 토글, Flightpaths 필터, WS 연결 상태, 알림 뱃지, 프로필 아이콘
  - `DronesPanel.jsx`: 좌하단 Drones 패널 — DRONE 01(RGB) + DRONE 02(THERMAL) 카드, 클릭 시 `setSelectedDrone()` 카메라 자동 매핑
  - `Dashboard.jsx`: 메인 LIVE 카메라 피드(16:9 safe zone), 좌상단 Thermal Trend PIP, 좌하단 DronesPanel, 우하단 3D Mini Map, 우측 AI Defect Analysis 패널
  - `DroneStatusCard.jsx`: 드론 상태 카드 (배터리 바, 모드 표시)
  - `droneStore.js` 확장: `DRONE_CAMERA_MAP`(drone-01=rgb, drone-02=thermal), `selectedDroneId`, `setSelectedDrone()`
- [x] v2.8_260417 — DroneMarker 비행 경로 시각화
  - `DroneMarker.jsx` 대폭 개선: 비행 경로 폴리라인(`Line` dashed), `useRef` 위치 히스토리 축적(MAX_PATH_POINTS 500개, MIN_MOVE_DIST 0.05 필터링), 바닥 2D 투영 경로 그림자, 미션 시작 시 초기화
- [x] v4.4_260424 — 대시보드 인프라 (TestModeBar, DashboardTopBar)
  - `TestModeBar.jsx` (319줄): 시작/일시중지/정지 재생 버튼, 프로젝트 데이터↔직접 업로드 소스 전환, 이미지/영상 대량 첨부 UI, bbox↔detection 시각화 모드 전환

### 세션 워크플로우 & 3D 시각화 (260416)
- [x] v3.0_260416 — 세션 3단계 + 3D + 미션 제어 **23개 파일**
  - `SessionSetup.jsx`: 현장명/운용자/점검일자 입력 폼, 유효성 검증, `sessionStore.setSessionInfo()` → `/session/level`
  - `SessionLevel.jsx`: L1(CAD .dwg/.dxf/.ifc) / L2(평면도 이미지) / L3(드론 자율비행) 선택 카드, L3에 "추천" 뱃지
  - `SessionModeling.jsx`: Level별 업로드/시뮬레이션, Mock 프로그레스 6~12초, 완료 후 `/dashboard` 자동 이동
  - `sessionStore.js` (Zustand+persist, 30+필드): siteName/operatorName/inspectionDate/level/uploadedFile/modelStatus/modelProgress/modelStage + startModeling/cancelModeling/setUploadedFile(이미지 base64 변환)
  - `mockModeling.js`: L1(CAD 파싱→층고→메시 6~8초), L2(윤곽→역설계 6~8초), L3(SLAM→포인트클라우드→메시 10~12초), `onTick` 콜백
  - 세션 컴포넌트 5개: `FileDropzone.jsx`(드래그&드롭+클릭+썸네일), `LevelCard.jsx`(아이콘/제목/설명/불릿/추천), `ModelingProgress.jsx`(진행률 바+단계명), `SessionLayout.jsx`(Stepper+centered), `ProtectedSessionLayout.jsx`(인증 가드)
  - `DroneMarker.jsx`: cone 본체+4프로펠러+고도 라인, `Billboard` ID 라벨, yaw 회전, `missionStatus` 기반 색상(flying=accent, idle=slate)
  - `BuildingMesh.jsx`: Level별 3D 건물 메시
  - `MissionControl.jsx`: 미션 시작/중지/착륙 버튼

### 직원 전용 사무실 허브 (260416)
- [x] v5.0_260416 — `EmployeeLanding.jsx` (749줄) 신규
  - 사무실 허브 레이아웃: KPI 카드 3개(이번 달 점검 42건/보고서 38건/평균 비행 23분), 오늘 일정 테이블(시간/현장/상태/운용자), 알림/공지(공지/경고/시스템 타입별 아이콘), 팀원 현황(이름/직급/팀/담당현장/상태 office/field/standby), 최근 활동 로그, 현재 세션 카드(sessionStore 실데이터: siteName/operatorName/level/defects severity)
  - MOCK_* 상수(MOCK_MONTHLY_KPI, MOCK_TODAY_SCHEDULE, MOCK_NOTIFICATIONS, MOCK_TEAM_MEMBERS, MOCK_RECENT_ACTIVITIES) — 동일 스키마 API 훅으로 점진 교체 설계
  - `App.jsx`: `/employee` 라우트 추가
  - `LandingHeader.jsx`: 직원 전용 진입 링크

### 리포트 관리 시스템 (260416~260417)
- [x] v4.0_260416 — 드론 리포트 관리 **36개 파일**
  - `ReportsList.jsx`: `/employee/reports` 보고서 목록 (현장명/일자/공종/하자 요약/상태 draft/published/열기/삭제)
  - `ReportDetail.jsx`: 개별 리포트 편집, debounce 500ms 낙관적 업데이트
  - `ReportEditor.jsx`: 공종별 그룹 테이블 + `suggestTrades()` AI 공종 자동 제안 + LocationMapEditor + AddDefectDialog + ExcelExport/PdfExport
  - `AddDefectDialog.jsx`: 수동 하자 추가 (유형명/영역A~E/장소 datalist/공종 TradeSelect/심각도 HIGH-MED-LOW/조치메모/이미지)
  - `DefectEditRow.jsx`: 인라인 수정/삭제/이미지 크롭 표시
  - `ExcelExportButton.jsx`: SheetJS `.xlsx` 내보내기 (요약 시트 + 하자 목록 시트)
  - `PdfExportButton.jsx`: `@react-pdf/renderer` `.pdf` (Noto Sans KR 한글 폰트, 요약 페이지+공종별 리스트+이미지)
  - `LocationMapEditor.jsx`: 장소명 일괄 rename
  - `TradeSelect.jsx`: 공종 선택 드롭다운 + "직접 입력" 옵션
  - `reportsStore.js`: Zustand fetchAll/fetchOne/create/update/remove
  - `reportsApi.js`: localStorage 기반 CRUD (DB 전 대체)
  - `reportApi.js`: `suggestTrades()` AI API
  - `preModelStore.js`: 사전 작업 모델 라이브러리 스토어
  - `trades.js`: 건설 공종 12종 마스터 `TRADES`, `CATEGORY_TRADE_MAP`, `LOCATION_PRESETS`, `TRADE_TO_TEMPLATE_CODE`, `SEVERITY_TO_GRADE`
  - `PreWork.jsx`: 사전 작업 페이지 (라벨→Level→업로드→Mock 3D→preModelStore 저장)
- [x] v4.1_260417 — 리포트 내보내기 강화 **50개 파일 중 프론트엔드 핵심**
  - `ExcelPreviewModal.jsx`: HTML 테이블 미리보기 + 다운로드 버튼
  - `PdfPreviewModal.jsx`: BlobProvider → iframe 인라인 표시 → 확인 후 다운로드
  - `TemplateExportButton.jsx`: 양식 기반 Excel 진입 버튼
  - `templateExport.js`: ExcelJS 양식 주입 (하자점검_결과보고서.xlsx 로드→셀에 점검개요/결과총괄/하자상세 데이터 주입→이미지 삽입)
  - `하자점검_결과보고서.xlsx`: Excel 보고서 양식 템플릿
  - 한글 폰트: NotoSansKR-Bold.ttf, NotoSansKR-Regular.ttf
  - `SessionSetup.jsx` 확장: siteUnit/inspectionType/witness 등 필드

### 인증 & OAuth (260417~260420)
- [x] v6.0_260417 — 풀스택 인증 연동
  - `authApi.js`: `login()`, `oauthLogin()`, `getMe()`, OAuth URL 빌더 3종(`getGoogleAuthUrl`, `getKakaoAuthUrl`, `getNaverAuthUrl`)
  - `authStore.js` (Zustand): token/user/isAuthenticated/organizations/currentOrg + setAuth(localStorage 4키 저장)/switchOrg/logout
  - `OAuthCallback.jsx`: `/auth/:provider/callback` — URL code 추출→백엔드 전송→JWT 저장→`/employee` 리다이렉트
  - `Login.jsx`: 소셜 버튼에 실제 OAuth URL 연결

### 현장 관리 (260418)
- [x] v5.2_260418 — 현장 CRUD UI **22개 파일** (+2,822줄)
  - `sitesApi.js`: localStorage 기반 + 시드 5건 (헬리오시티/판교 알파돔/위례 자이/성북B2C/강남 래미안)
  - `sitesStore.js` (Zustand): fetchAll/fetchOne/create/update/remove/clear
  - `SiteManagement.jsx`: 히어로 배너 + KPI 4카드(전체/진행중/예정/완료) + 통합 검색 + 상태 필터 탭 + 현장 테이블(순번/현장명/점검구분/건물유형/의뢰자/계약기간/점검건수/상태/편집/삭제)
  - `SiteDetail.jsx`: 히어로 배너 + 미니 KPI 4개 + 의뢰자/운영 2컬럼 그리드 + 탭 3개(보고서/도면3D/촬영영상)
  - `SiteFormModal.jsx`: 등록/수정 모달 폼
  - 탭 컴포넌트 3개: SiteReportsTab, SiteModelsTab, SiteRecordingsTab
  - `siteTypes.js`: 건물 유형, 상태, 의뢰자 유형 상수
  - `Analytics.jsx` + `TrendReport.jsx` + `WeeklyReport.jsx` + `mockTrendData.js`

### 채팅 & 알림 시스템 (260420~260424)
- [x] v7.0_260420 — 풀스택 채팅 + 알림 **48개 파일** (+4,313줄) 프론트엔드 부분
  - **채팅 UI 9컴포넌트**: Chat.jsx(Slack 3컬럼), ConversationList(검색+필터), ConversationItem, MessageThread(히스토리+입력), MessageBubble(카카오톡 스타일 발신/수신), MessageInput, ChatHeader, NewChatModal(조직 멤버 선택), ParticipantPanel, FloatingChatButton
  - **알림**: NotificationDropdown (227줄), notificationCategories.js (10종 카테고리)
  - **Store/API**: chatStore.js (fetchConversations/selectConversation/sendMessage/createConversation/startDM/markRead/leaveConversation/refreshUnreadCounts), notificationStore.js, chatApi.js, notificationApi.js, organizationApi.js
- [x] v7.2_260424 — 채팅 고도화 **15개 파일**
  - AdminMembers 슈퍼어드민 조직 배정 4단계 워크플로우 (조직→역할→부서→직위, 조직 미선택 시 나머지 비활성화)
  - ParticipantPanel: "대화 나가기" 버튼 + `leaveConversation()`, 부서/직위 null-safe 표시
  - ChatHeader/ConversationItem/ConversationList/MessageBubble/NewChatModal: 참여자 데이터 구조 변경 대응

### API 리팩토링 (260424)
- [x] v8.0_260424 — localStorage 목업 → 실제 백엔드 API 전환
  - chatApi.js, notificationApi.js, organizationApi.js, reportsApi.js, sitesApi.js에서 총 -1,000줄 이상 목업 코드 제거, axios fetch 호출로 교체
  - sessionStore.js: 테스트 모드 상태 추가 (testSource/testPlayState/testDetectionMode + setter)

---

## 작업 목록 — @unknownName-15 (branch: SH)

### 인증 UI & 모바일 반응형 (260417~260420)
- [x] v1.0_260417 — package-lock.json 생성 (의존성 버전 잠금)
- [x] v1.1_260420 — **7개 파일** (+146줄)
  - **Remix Icon CDN 도입**: `index.html`에 `remixicon@4.5.0` 전역 등록 (ri-menu-line, ri-close-line, ri-corner-up-left-line 등)
  - **LandingHeader 모바일 햄버거 메뉴 풀 구현**: `isMobileMenuOpen` state + `mobileMenuRef` 외부클릭 닫기 + 햄버거 버튼(`md:hidden`, aria-label/aria-expanded) + 드롭다운 메뉴(`w-56`, 직원전용+TEMP뱃지/로그인/도입문의) + 스크롤 상태별 배경 분기(hero=slate-900/95 backdrop-blur, 일반=white)
  - **네비게이션 UX 통일**: Login.jsx/Signup.jsx/FindAccount.jsx "뒤로가기" — `<Link to="/">` → `<button onClick={() => navigate(-1)}>` + `ri-corner-up-left-line` 아이콘 + `aria-label`
  - **포커스 링 전역 제거**: `index.css` button:focus/focus-visible outline:none + HeroSection/LandingHeader 개별 focus:ring 클래스 일괄 제거
  - **데스크탑 정리**: "도입 문의하기" CTA `hidden md:block` (모바일 햄버거에서 대신 표시), 불필요 Original/Modified 주석 대량 삭제

---

## 현재 프론트엔드 구조
```
frontend/src/
├── api/              — REST API 호출 모듈 (9개)
│   authApi, businessVerifyApi, chatApi, defectsApi,
│   notificationApi, organizationApi, reportApi, reportsApi, sitesApi
├── components/       — UI 컴포넌트 (15 디렉토리, 40+ 파일)
│   analytics/(TrendReport, WeeklyReport)
│   auth/(OrgRequired)
│   charts/(ThermalGraph)
│   chat/(ChatHeader, ConversationList, ConversationItem, MessageBubble,
│         MessageInput, MessageThread, NewChatModal, ParticipantPanel, FloatingChatButton)
│   common/(Reveal)
│   dashboard/(DashboardTopBar, DronesPanel, MissionControl, TestModeBar)
│   defects/(DefectCard, DefectFilter, DefectPanel, SeverityBadge)
│   landing/(HeroSection, FeaturesSection, CasesSection, CaseSlideshow,
│            ContactModal, DualCTASection, LandingHeader, ServiceIntroSection)
│   layout/(Header, Sidebar, DroneStatusCard)
│   map3d/(BuildingMesh, BuildingScene, DefectMarker, DroneMarker)
│   notification/(NotificationDropdown)
│   report/(AddDefectDialog, DefectEditRow, ExcelExportButton, PdfExportButton,
│           ExcelPreviewModal, PdfPreviewModal, TemplateExportButton,
│           LocationMapEditor, ReportEditor, TradeSelect)
│   session/(FileDropzone, LevelCard, ModelingProgress, SessionLayout, ProtectedSessionLayout)
│   site/(SiteFormModal, SiteReportsTab, SiteModelsTab, SiteRecordingsTab)
│   video/(비디오 스트리밍 컴포넌트)
├── pages/
│   Landing, Dashboard, Login, Signup, FindAccount, OAuthCallback, EmployeeLanding
│   employee/(AdminMembers, Analytics, Chat, Onboarding, PreWork,
│             ReportDetail, ReportsList, SiteDetail, SiteManagement)
│   session/(SessionSetup, SessionLevel, SessionModeling)
├── store/            — Zustand 상태 관리 (9개)
│   authStore(token/user/orgs/setAuth/logout)
│   chatStore(conversations/messages/unread/send/create/leave)
│   defectStore(defects 500 FIFO/filters/severity counts)
│   droneStore(telemetry/cameraMode/missionStatus/DRONE_CAMERA_MAP)
│   notificationStore, preModelStore
│   reportsStore(CRUD), sessionStore(30+ persist 필드, 테스트모드)
│   sitesStore(CRUD)
├── constants/        — trades.js, siteTypes.js, notificationCategories.js
├── utils/            — mockModeling.js, smoothScroll.js, templateExport.js
├── hooks/            — useReveal.js
└── assets/           — hero/, cases/, cta/, features/, logo/, templates/
```

---

## 라우팅 구조 (App.jsx)
| 경로 | 컴포넌트 | 가드 | 비고 |
|------|----------|------|------|
| `/` | Landing | 없음 | 공개 |
| `/login` | Login | 없음 | 개인/사업자 탭 + 소셜 3종 |
| `/signup` | Signup | 없음 | 784줄 개인/사업자+국세청 |
| `/find-account` | FindAccount | 없음 | 탭+쿼리파라미터 |
| `/auth/:provider/callback` | OAuthCallback | 없음 | Google/Kakao/Naver |
| `/employee/onboarding` | Onboarding | 없음 | 미소속 사용자 |
| `/employee` | EmployeeLanding | OrgRequired | 사무실 허브 |
| `/employee/pre-work` | PreWork | OrgRequired | 사전 작업 |
| `/employee/reports` | ReportsList | OrgRequired | 리포트 목록 |
| `/employee/reports/:id` | ReportDetail | OrgRequired | 리포트 편집 |
| `/employee/sites` | SiteManagement | OrgRequired | 현장 관리 |
| `/employee/sites/:id` | SiteDetail | OrgRequired | 현장 상세 |
| `/employee/analytics` | Analytics | OrgRequired | 분석 |
| `/employee/chat` | Chat | OrgRequired | 메신저 |
| `/employee/admin/members` | AdminMembers | OrgRequired adminOnly | 관리자 전용 |
| `/session/setup` | SessionSetup | SessionLayout | 세션 시작 |
| `/session/level` | SessionLevel | SessionLayout | 레벨 선택 |
| `/session/modeling` | SessionModeling | SessionLayout | 모델링 |
| `/dashboard` | Dashboard | ProtectedSessionLayout | 실시간 관제 (WS 여기서 초기화) |
| `/dashboard/report` | ReportModal | nested | 리포트 오버레이 |

**특이사항**: GlobalFloatingChat은 `/employee` 경로에서만 표시, DashboardLayout은 테스트모드 시 `/api/v1/stream/test/init` 자동 호출

---

## 요구사항
1. `team_project_rules.md` 준수
2. JSX `// //!`, `// //*` Better Comment 규칙
3. 반응형 필수 (Mobile/Tablet/Desktop, Mobile First)
4. 상태 UI 4종 세트 (Loading/Empty/Error/Success)
5. Tailwind CSS 유틸리티 클래스

---

## Revision History

### v6.0_260515 (작성자: @youminsu0523 / branch: MS)
- **(frontend R-v1.1.01) OpenAI 챗봇 UI 통합** — 통합 repo 와 동일.
  - 신규 `src/api/aiChatApi.js` — REST + SSE 스트리밍 (fetch+ReadableStream `data: {json}\n\n` 파서). EventSource 미사용(GET-only + 헤더 한계).
  - 신규 `src/store/aiChatStore.js` (Zustand) — isOpen/view/threads/messagesByThread/streaming(+draft+AbortController). 낙관적 user 메시지, onDone 에서 thread 끌어올림.
  - 신규 `src/components/chatbot/` 8개: FloatingChatbotButton(violet FAB right-24) / ChatbotPanel(우측 sliding drawer + ESC) / ChatbotPanelHeader(뒤로/새 대화/삭제/닫기) / ThreadList(빈 상태 추천 질문 4) / ChatbotMessageThread(자동 스크롤, 임시 streaming bubble, 에러 배너) / ChatbotMessageBubble(react-markdown raw HTML 비허용) / ChatbotInput(Enter 전송, 4000자 가드, 중단 버튼) / GlobalFloatingChatbot(/employee/* + 토큰 보유 시).
  - `App.jsx` — `<GlobalFloatingChatbot />` 마운트(기존 메신저 FAB 옆).
  - `package.json` — `react-markdown` ^9.0.1.

### v5.1_260506 (작성자: @youminsu0523 / branch: main)
- **R19 (5/6)** 브라우저 탭 favicon = 자체 로고 그래픽만 적용. `frontend/public/`에 favicon.ico(16/32/48 다중 entry) + favicon-{16,32,192,512}.png + apple-touch-icon.png(180×180) 신규 생성. `index.html` 의 누락 자산 참조 `/drone-icon.svg` 1줄 → ico/PNG 5줄 명시 등록으로 교체. 로고 원본 `logo_transparent-removebg-preview.png`(677×369)에서 알파 row 자동 스캔으로 graphic 영역(rows 59–252, cols 235–441) 검출 → 정사각 캔버스 가운데 배치(텍스트 "DRONE INSPECT / PRECISION DEFECT ANALYSIS" 제외). 배포 사이트 globe 기본 favicon 문제 해소.
- **R23 (5/6, R19 후속)** favicon 시인성 보강 — 다크 탭/작은 사이즈에서 푸른빛 로고가 어둡게 묻히는 이슈 해결. 512×512 master 캔버스에 흰색 원 배경(`FillEllipse(0,0,512,512)`) + inscribed 정사각형 92% 기준(333×312) 가운데 로고 재배치(R19 의 239 master → 512 master 격상으로 안티앨리어싱 품질 향상). 모든 사이즈(ico 16/32/48 + PNG 16/32/192/512 + apple-touch 180) 흰 원 배경 버전으로 재생성. 픽셀 검증으로 흰 원/투명/로고 색상 모두 확인.

### v5.0_260503 (작성자: @youminsu0523 / branch: MS)
- **R10 (4/29)** OAuth 콜백 + AdminMembers UX 보강 — 3개 provider(Google/Kakao/Naver) 단일 OAuthCallback로 수렴, AdminMembers의 슈퍼어드민/조직 admin 분기 + 부서 관리 + 초대 코드 만료 표시.
- **R11 (5/2)** Signup.jsx — 약관 동의 분리, 사업자 회원 분기, 사업자등록번호 검증 흐름.
- **R12 (5/3 본 세션, 1단계)** Mockup 팀원명 정리 — mockTrendData / chatConstants / SiteFormModal / EmployeeLanding 4파일에서 가짜 팀원명(김다연/이준혁/박지훈/이서현/박서연) → 실제 팀(백승희/오희진/유민수)로 통일.
- **R12 (5/3 본 세션, 2단계)** EmployeeLanding.jsx의 `MOCK_TODAY_SCHEDULE` / `MOCK_TEAM_MEMBERS` / `MOCK_MONTHLY_KPI` / `MOCK_RECENT_ACTIVITIES` 4개 const 삭제 + axios useEffect로 백엔드 API 4개(`/api/v1/employee/schedule/today`, `/employee/kpi/monthly`, `/employee/activities`, `/organizations/members`) 병렬 fetch. KPI snake_case → camelCase 변환. 빈 응답 fallback 처리.

### v4.1_260427 (작성자: @youminsu0523 / branch: MS)
- 3D 리포트 샘플 페이지 추가: `SampleReport.jsx` (신규), `HeroSection.jsx`, `App.jsx`
- 25평 아파트 내부 3D 모델링 + 드론 격자스캔 시뮬레이션 + 근접 기반 하자 탐지

### v4.0_260427 (작성자: @youminsu0523 / branch: MS)
- 전면 재작성: git log 기반 전체 팀원 10일간 작업 상세 기록
- 각 버전별 변경 파일 수, 구체적 파일 경로, 컴포넌트명/함수명/스토어 필드 상세

### v1.5_260416 (작성자: @youminsu0523 / branch: MS)
- 직원 전용 랜딩 사무실 허브 v2 전면 재설계

### v1.0_260413 (작성자: @Antigravity / branch: main)
- 프론트엔드 Task.md 초기 생성
