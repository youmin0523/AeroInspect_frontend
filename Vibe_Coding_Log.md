# 🤖 바이브코딩(Vibe Coding) 프롬프트 & 결과 추적 로그

> **💡 설명**: 프론트엔드(Frontend) 전용 바이브코딩 로그입니다. AI에게 언제, 어떤 프롬프트를 입력하여 어떤 코드를 도출했는지 기록합니다.

---

## 📝 기본 정보 (Meta)

- 작성자 (Who): @youminsu0523
- 작성 일자 (When): 2026-04-14 17:35   <!-- 착수(질문) 시점 — YYYY-MM-DD HH:MM -->
- 목표 기능 (Objective): AeroInspect 드론 하자점검 플랫폼 프론트엔드 전체 스캐폴드 구축 (React18 + Vite + Tailwind + R3F 3D 대시보드)
- 작업 브랜치/환경: `MS`

---

## 💬 바이브코딩 대화 흐름 (Vibe Coding Log)

### 1️⃣ 초기 질문 / 프롬프트 (Initial Prompt)
> *계획서(v1.3) PDF를 첨부하여 AI에게 전달한 지시*
- **프롬프트 내용**:
  ```text
  "위 계획서 참고해서 backend/ frontend 에 맞춰서 기초 파일 작업해줘"
  ```

### 2️⃣ 계획(Plan) 단계 피드백 (Plan Mode Feedback)
- **카메라 전환 UI**: `CameraToggle.jsx` 버튼 클릭 → `POST /api/v1/stream/mode` 호출 + `droneStore.setCameraMode()` 낙관적 업데이트
- **droneStore cameraMode**: `"rgb" | "thermal" | "blend"` 상태, WS `camera.mode_changed` 이벤트로 멀티클라이언트 동기화
- **LiveVideoFeed**: `key={streamUrl}` 속성으로 모드 변경 시 `<img>` 강제 리마운트 (MJPEG 스트림 재연결)

### 3️⃣ 구현된 프론트엔드 핵심 아키텍처

#### Zustand 스토어 설계
```javascript
// store/defectStore.js — 하자 데이터 관리
{
  defects: [],          // 최대 500개 (오래된 항목 자동 삭제)
  filters: { severity: 'ALL', area: 'ALL', categoryCode: null },
  selectedDefect: null,
  addDefect(d),         // WS defect.new 이벤트 수신 시 호출
  getFilteredDefects(), // 필터 적용 후 반환
  getSeverityCounts(),  // HIGH/MED/LOW 카운트
}

// store/droneStore.js — 드론 상태 관리
{
  connectionStatus: 'disconnected', // connected/reconnecting/disconnected
  telemetry: { altitude, battery, speed, heading, signal },
  cameraMode: 'rgb',    // 'rgb' | 'thermal' | 'blend'
  setCameraMode(mode),
  syncCameraMode(mode), // WS 이벤트 수신 시 다른 클라이언트 동기화
}
```

#### WebSocket 자동 재연결 (지수 백오프)
```javascript
// hooks/useWebSocket.js 핵심 패턴
const reconnect = useCallback(() => {
  delay = Math.min(delay * 2, 30000)  // 1s → 2s → 4s ... 최대 30s
  setTimeout(connect, delay)
}, [])

// 메시지 라우팅
"defect.new"          → defectStore.addDefect(payload)
"telemetry.update"    → droneStore.updateTelemetry(payload)
"camera.mode_changed" → droneStore.syncCameraMode(payload.mode)
"ping"                → ws.send(JSON.stringify({type:"pong"}))
```

#### React Three Fiber 3D 하자 마커
```javascript
// components/map3d/DefectMarker.jsx
// LiDAR 좌표 매핑: lidar_z(고도) → Three.js Y축
const x = defect.lidar_x ?? 0
const y = defect.lidar_z ?? 1  // Z(고도)를 Three.js Y축으로 매핑
const z = defect.lidar_y ?? 0

// 선택된 마커 펄스 애니메이션
useFrame(() => {
  if (isSelected) mesh.scale.setScalar(1.2 + Math.sin(Date.now() * 0.005) * 0.15)
})
```

#### LLM 보고서 스트리밍
```javascript
// api/reportApi.js — fetch ReadableStream 청크 수신
const reader = response.body.getReader()
while (true) {
  const { done, value } = await reader.read()
  if (done) break
  onChunk(new TextDecoder().decode(value))
}
```

---

## ✅ 최종 결과 (Final Outcome)

### 📁 생성된 프론트엔드 파일 목록 (34개)
- `package.json` — react@18, zustand@5, recharts@2, @react-three/fiber@8, @react-three/drei@9, three@0.170, axios, date-fns
- `vite.config.js` — `/api`, `/ws`, `/stream` → localhost:8000 프록시
- `tailwind.config.js` — brand, severity.high/med/low, dashboard.bg/surface/border 커스텀 컬러
- `src/App.jsx` — BrowserRouter + Header + Sidebar + Routes, 최상위에서 `useWebSocket()` 호출
- `src/store/defectStore.js` / `droneStore.js` — Zustand 상태 관리
- `src/hooks/useWebSocket.js` — 지수 백오프 재연결 + 메시지 라우팅
- `src/components/video/LiveVideoFeed.jsx` — `key={streamUrl}` 강제 리마운트로 스트림 전환
- `src/components/video/CameraToggle.jsx` — RGB/열화상/블렌드 전환 버튼
- `src/components/defects/DefectPanel.jsx` — 심각도 필터 탭 + 스크롤 목록
- `src/components/charts/ThermalGraph.jsx` — Recharts 슬라이딩 윈도우 실시간 그래프
- `src/components/map3d/BuildingScene.jsx` — R3F Canvas + OrbitControls (lidar_x/y/z 있는 하자만 마커)
- `src/components/map3d/DefectMarker.jsx` — 심각도별 색상 구체 + 펄스 애니메이션 + Html 툴팁
- `src/components/report/ReportPanel.jsx` — Claude/Gemini 선택 + 스트리밍 실시간 표시
- `src/components/report/ReportExport.jsx` — 마크다운 클립보드 복사 + .md 파일 다운로드
- `src/constants/defectCategories.js` — 20종 하자 정의 (5개 영역 A-E, 심각도 매핑)

### 📊 UI 레이아웃 구조
```
Dashboard (12-col grid)
├── [col-span-7] 좌측 패널
│   ├── LiveVideoFeed + CameraToggle  ← MJPEG 스트림
│   ├── ThermalGraph                  ← Recharts 실시간 그래프
│   └── BuildingScene (R3F)           ← 3D 하자 위치 맵
└── [col-span-5] 우측 패널
    ├── DefectPanel                   ← 하자 목록 + 필터
    └── ReportPanel + ReportExport    ← LLM 보고서
```

---

## 💡 배운 점 및 인사이트 (Lessons Learned)

- **MJPEG 스트림 전환**: `<img src>` 변경만으로는 브라우저가 기존 스트림 연결을 재사용할 수 있어, `key={streamUrl}` 패턴으로 DOM 요소 강제 재생성이 필요
- **R3F LiDAR 좌표 매핑**: 드론 좌표계(X=동서, Y=남북, Z=고도)와 Three.js 좌표계(Y=상하) 불일치 → `lidar_z`를 Three.js Y축으로 매핑
- **Zustand 최대 항목 제한**: WS를 통해 지속적으로 들어오는 하자 데이터가 메모리를 무한 누적하지 않도록 `addDefect`에서 500개 초과 시 오래된 항목 자동 제거
- **WS 재연결 전략**: 지수 백오프(1s→30s max) + 백그라운드 탭 처리(`visibilitychange` 이벤트)로 안정적인 연결 유지

### 4️⃣ 트러블슈팅 및 디버깅 (Troubleshooting)
- **이슈 (Issue)**: 프론트엔드 실행 시 `Maximum update depth exceeded` 무한 루프 렌더링 에러 발생 (빈 화면 출력).
- **원인 (Root Cause)**: `Header.jsx`와 `DefectPanel.jsx`에서 Zustand의 셀렉터(예: `getFilteredDefects()`)를 직접 함수로 파생하면서, 렌더링마다 매번 새로운 배열(참조값)을 반환했습니다. 이에 따라 리액트는 상태가 변경된 것으로 착각하여 무한정 재렌더링 트리거.
- **해결 (Solution)**:
  - Zustand 스토어에서 상태를 원시 배열(`state.defects` 등) 단위로만 구독하여 불필요한 재렌더링 방지.
  - 리렌더링 시 발생하던 불필요한 참조 변경을 개선하여 안정적인 렌더링 보장 완료.

---

### 5️⃣ 추가 피드백 & 반영 (Feedback Iterations)

> *초기 구현 이후, 협업 도구(Notion 싱크) 품질을 높이기 위한 피드백 라운드 기록*

#### ⏱ 2026-04-14 17:40 | 노션 타임스탬프 기준 변경
- **피드백**: Notion에 찍히는 시간이 싱크 실행 시각이라, 팀원들의 로그를 합쳤을 때 시간순이 뒤죽박죽됨. "질문(착수) 시점" 기준으로 바꿔달라.
- **반영**:
  - `sync_notion_logs.py`의 `extract_meta()`를 수정하여 `작성 일자 (When)` 필드에서 `YYYY-MM-DD HH:MM` 포맷을 파싱.
  - `append_session_to_page()`가 파싱된 착수 시각을 우선 사용하고, 없을 때만 현재 시각으로 폴백.
  - 로그 템플릿의 When 필드 포맷을 `2026-04-14 17:35`처럼 시분 포함으로 갱신.

#### ⏱ 2026-04-14 17:42 | Notion UI 디자인 개선
- **피드백**: 세션 블록이 단조로움 — 디자인을 좀 더 신경써달라.
- **반영**:
  - 영역별 이모지 헤딩 (`🎨 [Frontend]`, `⚙️ [Backend]`)
  - 메타 콜아웃(회색 배경): `🕒 착수 HH:MM · 👤 @author · 🌿 branch`
  - 스크린샷을 세션 상단으로 이동 → 시각적 훅 강화

#### ⏱ 2026-04-14 17:46 | 파일트리/코드블록 가독성 복구
- **피드백**: 이전에 보이던 파일 구조 트리가 사라졌음. 접힘 없이 바로 보이게 해달라.
- **원인**: UI 개선 과정에서 본문 전체를 "📝 상세 로그 펼치기" 토글로 감쌌더니, 트리처럼 시각적으로 중요한 코드블록이 접혀 안 보임.
- **반영**: 토글 제거, 본문 블록을 그대로 노출하도록 `append_session_to_page()` 재수정. 메타 콜아웃과 상단 스크린샷은 유지.

#### ⏱ 2026-04-14 17:55 | 피드백 흐름도 로그에 기록
- **피드백**: 초기 질문과 결과만이 아닌, 피드백/수정 요구 라운드도 대화 흐름에 시각과 함께 남겨달라. 팀원 로그를 합쳐도 시간순 추적이 가능하도록.
- **반영**: 본 `5️⃣ 추가 피드백 & 반영` 섹션 신설. 이후 라운드마다 `⏱ YYYY-MM-DD HH:MM | 피드백 → 반영` 형식으로 append하는 규칙을 정립.

---

### 6️⃣ 랜딩 페이지 섹션 확장 & 스크롤 UX (2026-04-15)

#### ⏱ 2026-04-15 | "서비스 소개" HTML → React 변환
- **피드백**: 제공된 서비스 소개 정적 HTML(다크 배너 + 3개 가치 카드: 안전성/정밀성/효율성)을 리액트 컴포넌트로 이식해달라.
- **반영**:
  - `components/landing/ServiceIntroSection.jsx` 신설. 카드 데이터 배열 + `map`으로 DRY화, Tailwind JIT 안전을 위해 accent별 full class name 매핑(`ACCENT_STYLES`).
  - `pages/Landing.jsx`에 `<ServiceIntroSection />` 삽입(Hero 아래).
  - 원본 `<h1>` → `<h2>`로 강등(페이지 h1은 HeroSection이 소유). 중복되는 `<header>`/CDN Tailwind 태그는 제외.

#### ⏱ 2026-04-15 | 네비 구조 확인 — 싱글페이지 스크롤 방식
- **피드백**: "서비스 소개" 클릭 시 페이지 이동이 아닌 같은 페이지 내 스크롤로 동작하는 거냐? 위치 확인하고 스크롤 이펙트 줘라.
- **확인 결과**:
  - `LandingHeader`의 네비 링크가 `#intro` / `#features` / `#cases` 앵커.
  - `#cases` 타겟 부재 → 클릭해도 동작 안 함.
  - Sticky 헤더(80px)에 섹션 제목이 가려지는 문제 → `scroll-mt` 보정 필요.

#### ⏱ 2026-04-15 | 핵심 기술 섹션 — 기존/신규 내용 융합
- **피드백**: 기존 FeaturesSection(3가지 모델링 파이프라인)과 새로 전달한 "핵심 기술 스택"(3D 복원 / AI 분석 / 공간 매핑)을 병합해달라.
- **반영**: `FeaturesSection.jsx` 전면 재작성. 3개 기술 축을 카드로 세우고, 첫 카드(MODELING) 하단에 기존 3개 파이프라인(`CAD 연동`·`2D 역설계`·`자율비행 스캔`)을 칩(chip) 리스트로 품음 → 중복 제거 + 정보 손실 없음.

#### ⏱ 2026-04-15 | 도입 사례 섹션 신설 + 스크롤 이펙트 통합
- **피드백**: 제공된 "도입 사례" HTML(B2B 건설사 / 정밀 안전진단 / B2C 입주민 3개 카드)을 반영하고, 스크롤 이펙트/앵커 오프셋까지 한번에 처리해달라.
- **반영**:
  - `components/landing/CasesSection.jsx` 신설, `id="cases"` + `scroll-mt-20 md:scroll-mt-24`.
  - `pages/Landing.jsx`에 `<CasesSection />` 연결 → `#cases` 앵커 활성화.
  - `hooks/useReveal.js` + `components/common/Reveal.jsx` 추가. IntersectionObserver 기반 "뷰포트 진입 시 1회 페이드업" 패턴. `prefers-reduced-motion` 존중, `delay` prop으로 카드 스태거(120ms 간격) 연출.
  - `ServiceIntroSection` / `FeaturesSection` / `CasesSection` 카드에 `<Reveal>` 래핑 적용.
  - `index.html` `<html>`에 `scroll-smooth` 클래스 추가 → 앵커 점프가 부드럽게 스크롤되도록.
  - 모든 섹션에 `scroll-mt-20 md:scroll-mt-24` 적용하여 sticky 헤더에 제목이 가려지는 문제 해소.

#### ⏱ 2026-04-15 | 앵커 스크롤 속도 커스터마이즈
- **피드백**: 네비 메뉴를 눌렀을 때 섹션으로 넘어가는 속도가 너무 빠르다. 조금 더 느긋하게 넘어가면 좋겠다.
- **원인**: CSS `scroll-smooth`는 브라우저가 자체 속도로 애니메이션해서 duration 제어가 불가.
- **반영**:
  - `utils/smoothScroll.js` 신설 — rAF + easeInOutCubic 기반 커스텀 스크롤. duration/headerOffset 파라미터화, `prefers-reduced-motion` 존중, 휠/터치/키 입력 시 즉시 중단.
  - `LandingHeader`의 네비 `<a>`에 `onClick={handleAnchorClick(...)}` 연결 → 기본 점프를 가로채 1100ms easeInOutCubic으로 부드럽게 이동, 헤더 오프셋 96px 보정.

#### ⏱ 2026-04-15 | 이징 커브 교정 (즉시 출발 + 느긋한 도착)
- **피드백**: "누르면 바로 움직이되 내려가는 속도를 늦춰라"는 의도였는데, 현재 구현은 시작도 느리게 움직여서 멈칫한 느낌이 난다.
- **원인**: `easeInOutCubic`은 시작(t=0)과 끝(t=1) 모두 속도 0 → 클릭 직후 "멈칫" 후 가속하는 체감.
- **반영**: `smoothScroll.js`의 이징을 `easeOutCubic`으로 교체 (t=0 속도 최대 → 감속하며 정지). duration은 1100 → 1400ms로 소폭 증가하여 "느긋하게 도착하는" 느낌 강화.

#### ⏱ 2026-04-15 | 초기 가속 추가 강화 (easeOutQuart)
- **피드백**: easeOutCubic도 클릭 직후 움직이기까지 살짝 뜸을 들이는 느낌이다. 그 지연을 더 줄여달라.
- **원인**: easeOutCubic은 t=0에서의 파생값이 3 → 초기 몇 프레임의 변위가 작아 체감상 "딜레이".
- **반영**: `easeOutQuart`(파생값 4)로 교체. 첫 프레임부터 더 큰 변위가 발생하여 "누르자마자 팍" 출발하는 체감. 감속은 더 급격하지만 도착은 여전히 부드러움 유지.

#### ⏱ 2026-04-15 15:42 | 서비스 소개 첫 카드 카피 교체 (실내 사각지대 강조)
- **피드백**: 첫 번째 카드(SAFETY FIRST / 고소 작업 사고율 0%)가 외벽 점검 맥락이라, 실내 하자점검 서비스의 차별점과 어긋난다. 3개 옵션 중 "옵션 1 — 접근성 & 사각지대 해소"로 교체해달라.
- **반영**: `ServiceIntroSection.jsx`의 `VALUE_CARDS[0]`를 아래로 교체 (accent=blue 유지).
  - kicker: `SAFETY FIRST` → `BLIND SPOT ZERO`
  - tag: `안전성` → `접근성`
  - title: `고소 작업 사고율 0%` → `실내 난접근 구역 사각지대 0%`
  - desc: 외벽 로프 작업 대체 문구 → "높은 천장·좁은 틈새·어두운 배관/공조실 등 실내 사각지대를 드론이 진입해 빈틈없이 스캔" 문구로 교체.

#### ⏱ 2026-04-15 15:45 | 가치 카드 키커 영역 비중 축소
- **피드백**: `BLIND SPOT ZERO` / `ACCURACY` / `EFFICIENCY` 같은 영문 키커가 본문보다 더 큰 공간을 차지해 시선이 분산된다.
- **반영**: `ServiceIntroSection.jsx` 키커 패널을 `h-48 → h-20`, 글자 `font-bold text-lg → font-semibold text-xs tracking-[0.2em]`로 축소. 컬러 띠 + 태그라인 성격만 유지하고 본문(title/desc)이 카드의 주연이 되도록 레이아웃 재정돈.

#### ⏱ 2026-04-15 15:48 | 키커 재강조 (디스플레이 타이포)
- **피드백**: 직전 축소가 너무 과했다. `BLIND SPOT ZERO` 같은 키커를 좀 더 강조해달라.
- **반영**: 패널 `h-20 → h-28`, 글자 `text-xs → text-2xl md:text-3xl`, `font-semibold → font-extrabold`, tracking은 `0.2em → 0.15em`로 약간 타이트하게. 본문 영역은 침범하지 않으면서 "컬러 히어로 타이포" 느낌으로 키커가 시선을 잡도록 조정.

#### ⏱ 2026-04-15 15:52 | 키커 방향 전환 — 크기 대신 굵기 + 그라데이션
- **피드백**: 크기 강조가 원했던 방향이 아니다. 폰트를 더 두껍게 하고 그라데이션으로 강조해달라.
- **반영**: 사이즈 `text-2xl md:text-3xl → text-xl md:text-2xl`, 굵기 `font-extrabold → font-black`, 패널 `h-28 → h-24`로 소폭 축소. `ACCENT_STYLES`의 단색 `kickerText`를 `kickerGradient`로 교체 — accent별 3-stop 그라데이션(blue: blue-700→blue-500→sky-400 / yellow: amber-600→yellow-500→orange-400 / green: green-700→emerald-500→teal-400)을 `bg-gradient-to-r + bg-clip-text + text-transparent`로 텍스트에 적용. 크기로 밀지 않고 색과 굵기로 무게감을 주는 방향.

#### ⏱ 2026-04-15 15:56 | 키커 글리프 팻닝 + 자간 타이트
- **피드백**: 폰트를 더 두껍게 해달라 + 자간도 줄여달라.
- **제약**: Tailwind 폰트 weight 최대치(`font-black` = 900)를 이미 사용 중 → 추가 굵기는 CSS 수준에서 글리프 윤곽선을 덧씌워야 함.
- **반영**: `ACCENT_STYLES`에 `kickerStroke` 추가 — `[-webkit-text-stroke:1px_<accent-700>] [paint-order:stroke_fill]` 조합으로 각 accent의 짙은 톤을 외곽선에 얹음. `paint-order: stroke fill`로 스트로크를 먼저 깔아 그라데이션 fill이 위에 찍히게 해 색 손상 최소화. 자간은 `tracking-[0.12em] → tracking-[0.06em]`로 축소해 글리프 밀도를 높임 → "두껍고 꽉 찬" 디스플레이 타이포 느낌.

#### ⏱ 2026-04-15 16:05 | 한글 단어 중간 줄바꿈 방지 (break-keep 일괄 적용)
- **피드백**: Hero에서 "3D 모델링,"이 "모델" / "링," 으로 쪼개지고, 카드 본문에서 "안전하게"가 "안" / "전하게"로 쪼개지는 등 한글 단어 중간 wrap이 어색하다.
- **원인**: 기본 `word-break: normal`은 CJK에서 음절 단위로 끊음.
- **반영**: 한글 카피 전체에 Tailwind `break-keep`(= `word-break: keep-all`) 일괄 적용.
  - `HeroSection.jsx`: `<h1>`, 서브 `<p>`.
  - `ServiceIntroSection.jsx` / `CasesSection.jsx` / `FeaturesSection.jsx`: 카드 `<h3>` 제목 + `<p>` 설명.
  - 공백/문장부호 기준으로만 줄바꿈되도록 통일 → "모델링"·"안전하게" 같은 복합어가 한 덩어리로 움직임. 영문/숫자 혼합 토큰(`3D`, `0.1mm` 등)은 원래도 분리되지 않음.

#### ⏱ 2026-04-15 16:12 | 로고 클릭 → 최상단 스크롤 동작 수정
- **피드백**: 좌측 상단 로고를 눌러도 페이지 최상단으로 올라가지 않는다.
- **원인**: 로고가 `<Link to="/">`인데, 이미 `/` 경로에 있는 경우 react-router가 리렌더·네비게이션을 트리거하지 않아 스크롤이 전혀 발생하지 않음.
- **반영**: `LandingHeader.jsx`에 `useLocation` + `handleLogoClick` 추가. `location.pathname === '/'`이면 `event.preventDefault()` 후 `smoothScrollTo(0, 1000)`으로 최상단까지 스무스 스크롤(네비 메뉴와 동일한 `easeOutQuart`, 1000ms). `replaceState`로 해시도 정리. 다른 경로(예: `/dashboard`)에서 로고를 누르면 기존대로 `/`로 라우팅.

#### ⏱ 2026-04-15 16:20 | B2C 카드 설명 문구 구체화 (실내 하자 요소 명시)
- **피드백**: "프리미엄 개별 세대 리포트" 카드 설명이 "샷시 외부 및 외벽 상태"로 되어 있어, 실내 하자점검 서비스 맥락과 어긋난다. 3개 옵션 중 "옵션 1 — 직관성 강조"(도배/마루/마감재 등 구체적 하자 요소 명시)로 교체해달라.
- **반영**: `CasesSection.jsx`의 `CASE_CARDS[b2c].desc`를 "세대주가 직접 접속하여 도배, 마루, 마감재 등 실내 공간의 하자 상태를 3D 뷰어로 확인하고 보수 이력을 트래킹."으로 교체. 세대주가 일상에서 마주치는 구체 요소를 노출해 서비스 직관성을 높이고, B2C 카드가 실내 스캔 포지션과 정렬되도록 조정.

#### ⏱ 2026-04-15 16:28 | B2B 건설사 카드 카피 교체 (규모·확장성 강조)
- **피드백**: B2B 건설사 카드가 "외벽 및 로프 접근 불가 구역" 중심이라 실내 전수조사 서비스 포지션과 어긋난다. 3개 옵션 중 "옵션 1 — 규모/확장성 강조"로 교체해달라.
- **반영**: `CasesSection.jsx`의 `CASE_CARDS[b2b]` 제목을 "수도권 1,500세대 신축 점검" → "대규모 신축 단지 실내 전수조사"로, desc를 "수천 세대 규모의 현장도 문제없이 완벽한 전수조사 지원. 기존 인력 대비 점검 기간을 60% 단축하며, 전 세대 내부 마감재 스캔 및 하자 리포트를 일괄 제출합니다."로 교체. 외벽/로프 뉘앙스를 제거하고 실내 전수조사·확장성 메시지로 정렬.

#### ⏱ 2026-04-15 16:35 | 정밀 안전진단 카드 카피 교체 (문제 해결 직관성 강조)
- **피드백**: "준공 20년 차 주상복합 진단" 카드가 특정 사례 한 건 느낌이라 서비스 포괄성을 덜 전달한다. 3개 옵션 중 "옵션 1 — 직관적인 문제 해결 강조"로 교체해달라.
- **반영**: `CasesSection.jsx`의 `CASE_CARDS[diagnosis]` 제목을 "준공 20년 차 주상복합 진단" → "도면 미보유 노후 건축물 정밀 진단"으로, desc를 "도면이 소실되거나 현행화되지 않은 현장이라도 문제없습니다. 드론 자율비행(Photogrammetry)을 통해 실내 3D 디지털 트윈을 즉각 생성하고 숨은 결함을 분석합니다."로 교체. 한 건의 사례 소개 톤에서 "도면 없는 현장도 해결" 포지션으로 메시지 확장.

#### ⏱ 2026-04-15 16:48 | FeaturesSection 카드 비주얼 도입 (코드 스트립 → 이미지 + 코드 오버레이)
- **피드백**: 핵심 기술 섹션 3개 카드가 회색 placeholder + 코드 라벨만 있어 비주얼이 빈약하다. MODELING 카드에 "건물 와이어프레임 3D 복원" 이미지를 우선 적용하고, AI/MAPPING도 같은 구조로 확장 가능한 틀을 잡아달라.
- **자산**: `frontend/src/assets/features/{modeling,ai,mapping}/` 3개 폴더 신설. MODELING 카드용 `01-wireframe-building.png`(268KB, 건물 와이어프레임 적·청 2톤) 배치. 파일명에 `.webp.png` 이중 확장자로 들어와 `.png`로 정리.
- **반영**: `FeaturesSection.jsx`에 `import.meta.glob`(eager + `?url`) 패턴을 추가해 각 카드 폴더의 이미지를 정렬된 URL 배열로 수집(`modelingImages`/`aiImages`/`mappingImages`). `TECH_CARDS` 각 엔트리에 `image: <firstImage>` 필드 주입. 상단 비주얼 영역을 `relative h-48 overflow-hidden`로 바꾸고, `card.image`가 있으면 `<img object-cover>` + 다크 반투명 배경의 `<span>` 코드 라벨 오버레이를, 없으면 기존 코드 스트립을 폴백으로 렌더. 호버 시 `scale-105 duration-500`로 약간의 줌 효과. AI/MAPPING 폴더에 이미지를 추가하면 즉시 동일 스타일로 반영됨(코드 수정 불필요).

#### ⏱ 2026-04-15 17:05 | AI / MAPPING 카드 이미지 추가
- **피드백**: MODELING 카드만 이미지가 있고 AI/MAPPING은 placeholder 상태. 각 카피와 어울리는 Unsplash 이미지 톤(다크/그레이/세피아) 추천 후 확정된 이미지 2장 배치.
- **반영**: `features/ai/01-concrete-crack.png`(콘크리트 균열 클로즈업 — "픽셀 단위 하자 식별" 카피 직결), `features/mapping/01-isometric-floor-plan.png`(아이소메트릭 실내 평면도 스케치 — "X, Y, Z 정밀 공간 매핑" 카피 직결) 배치. 기존 `import.meta.glob` 자동 수집 구조 덕분에 컴포넌트 코드 수정 없이 새로고침만으로 반영. 3개 카드가 "다크 네온 / 그레이 리얼 / 세피아 스케치"로 톤이 분기되어 "복원 → 분석 → 매핑" 프로세스 스토리라인 형성.

#### ⏱ 2026-04-15 17:15 | 코드 라벨 워터마크화 (중앙 pill → 우측 하단 은은한 태그)
- **피드백**: 이미지가 들어오면서 중앙의 코드 라벨(`// 3D_RECONSTRUCTION_ENGINE` 등)이 과하다. 삭제 대신 "은은한 워터마크" 스타일로 톤 다운.
- **반영**: `FeaturesSection.jsx`에서 코드 라벨 스타일을 `relative z-10 text-white/90 text-xs bg-slate-900/60` → `absolute bottom-2 right-2 z-10 text-white/60 text-[10px] tracking-wider bg-slate-900/30`으로 교체. 위치를 중앙에서 우측 하단 구석으로 이동해 이미지 주제를 가리지 않으면서 시스템 식별자(테크 아이덴티티)는 유지. 패딩도 `px-2 py-1 → px-1.5 py-0.5`로 축소, `tracking-wider`로 모노스페이스 가독성 확보.

#### ⏱ 2026-04-15 17:25 | 코드 라벨 `//` 프리픽스 제거 + 라이브 상태 점 도입
- **피드백**: `//` 주석 프리픽스가 과하다. 다른 방식으로 표현해달라. 3가지 대안(브래킷 / 꺽쇠 / 상태 점) 중 "상태 점 + accent 컬러 펄스"를 선택.
- **반영**: `TECH_CARDS[*].code`에서 `//` 프리픽스 제거(순수 시스템 식별자만 노출). `ACCENT_STYLES`에 `dot` 필드 추가 — slate 카드는 `bg-cyan-400`(와이어프레임 블루와 매칭), indigo는 `bg-indigo-400`, orange는 `bg-orange-400`. 워터마크 `<span>`을 `flex items-center gap-1.5`로 바꾸고 1.5px 크기 원형 점을 라벨 앞에 배치. `animate-ping`으로 펄스 잔상 레이어를 겹쳐 "시스템 LIVE" 느낌 구현. 폴백(이미지 없는 경우)에도 동일 점 적용해 시각 언어 통일.

#### ⏱ 2026-04-15 17:35 | Hero 첫 줄 "모델링," 홀로 줄바꿈 해소
- **피드백**: Hero `<h1>` 첫 줄 "도면이 없어도 완벽한 3D 모델링," 중 "모델링,"만 다음 줄로 밀려 어색하다. 한 줄로 붙여달라.
- **원인**: 뷰포트 md 구간에서 `text-6xl`(60px) × 한글 18자 ≈ 1080px가 컨테이너 `max-w-4xl`(896px)을 초과해 공백 기준으로 자동 줄바꿈.
- **반영**: `HeroSection.jsx`의 h1 폰트 스케일을 `text-4xl md:text-6xl` → `text-4xl md:text-5xl lg:text-6xl`로 단계화. md 구간은 `text-5xl`(48px)로 낮춰 한 줄에 수용. 컨테이너도 `max-w-4xl` → `max-w-4xl lg:max-w-5xl`로 lg 이상에서 폭 여유 확보. 추가 안전장치로 해당 문구를 `<span className="md:whitespace-nowrap">`로 감싸 md 이상에서는 강제 한 줄 유지(모바일은 기본 줄바꿈 허용).

#### ⏱ 2026-04-16 14:03 | 계정 찾기 페이지 신규 추가 (아이디/비밀번호 찾기)
- **피드백**: 백엔드(Node.js/Express)에서 `POST /api/find-id`(type/name/email/bizNumber) 와 `POST /api/find-pw`(type/userId/email/bizNumber) 를 Nodemailer 기반으로 구현 중. 이에 맞춰 프론트에 계정 찾기 UI를 추가하고, 사용자가 첨부한 HTML 목업(탭 2개 + 개인/사업자 토글 + 사업자번호 조건부 노출)을 프로젝트 톤에 맞춰 포팅해달라.
- **반영**:
  - `pages/FindAccount.jsx` 신규 생성. 상단 탭(`아이디 찾기` / `비밀번호 찾기`)은 Login/Signup 과 동일한 폰트·색 컨벤션을 따르되 목업의 "border-bottom 2px accent" 스타일을 유지. 탭 하부에 개인/사업자 세그먼트 컨트롤(선택 시 `bg-blue-50 border-blue-200 text-blue-700`) 배치, `isBusiness` 시에만 사업자등록번호 input 노출(숫자만 10자리, 자동 필터링).
  - 아이디 찾기 모드: `이름`(사업자 시 `담당자명`으로 라벨 변경) + 이메일. 비밀번호 찾기 모드: `아이디` + 이메일. 제출 버튼 컬러도 모드별로 분기(`slate-900` vs `blue-600`)해 시각적으로 모드 인지 가능.
  - 제출 payload 를 백엔드 스펙과 정렬: `{ type, email, bizNumber?, (name | userId) }`. 현재 단계에서는 실제 fetch 대신 `console.log` + 600ms 지연 mock 으로 남겨두고(주석 처리된 fetch 블록 포함), 상태(`idle / loading / success / error`)에 따라 상태 메시지 색상(slate/green/red) 표시.
  - URL 쿼리 `?tab=id|pw` 로 초기 탭 지정 + `handleModeChange` 시 `navigate('/find-account?tab=...', { replace: true })` 로 동기화해 북마크·뒤로가기 일관성 확보. `useEffect([location.search])` 로 외부에서 쿼리만 바뀌어도 탭이 따라오도록 처리.
  - `App.jsx` 에 `<Route path="/find-account" element={<FindAccount />} />` 추가(로그인/회원가입 그룹에 합침). `Login.jsx` 하단의 `<a href="#">아이디 찾기 | 비밀번호 찾기</a>` 를 `<Link to="/find-account?tab=id">`, `<Link to="/find-account?tab=pw">` 로 교체 — 클릭 시 해당 탭으로 바로 진입.
  - 타이틀 헤더는 Login 과 동일한 3분할 레이아웃(좌측 로고 / 중앙 제목 "계정 찾기" + 서브카피 "잃어버린 계정 정보를 안전하게 찾아드립니다." / 우측 "로그인으로..")로 통일. 하단에도 "로그인 화면으로 돌아가기" 언더라인 링크 유지.

#### ⏱ 2026-04-16 15:10 | 회원가입 사업자 진위 확인 — 국세청(odcloud.kr) API 실연동
- **피드백**: 사용자가 Node.js + axios 기반 공공데이터포털 "사업자등록정보 진위확인 및 상태조회" 샘플 코드를 제시하며, Signup.jsx 의 `verifyBusiness` 시뮬레이션(`setTimeout` mock)을 실제 API 연동으로 교체 요청. API 키는 `.env` 에 양식만 만들어두면 본인이 입력하겠다고 지정.
- **반영**:
  - `frontend/src/api/businessVerifyApi.js` 신규 생성. `checkBusinessStatus(b_no)` 함수가 `POST /api/nts-businessman/v1/status` 에 `{ b_no: [번호] }` 페이로드로 호출하고 `data[0]` 결과 객체 반환. `interpretStatus(result)` 헬퍼로 `b_stt_cd`(01 계속 / 02 휴업 / 03 폐업)에 따라 `{ ok, message }` 로 정규화 — 01 이면 과세유형을 포함한 성공 메시지, 02/03 은 상태별 한글 안내(폐업 시 `end_dt` 부착), 빈 응답이면 미등록 사업자 처리.
  - CORS 우회: `vite.config.js` `server.proxy` 에 `/odcloud → https://api.odcloud.kr`(rewrite 로 prefix 제거) 추가. dev 환경에서는 `import.meta.env.DEV` 체크해 `/odcloud/api/nts-businessman/v1` 경유, prod 는 직접 호출(필요 시 백엔드 프록시 전환 전제).
  - 키 관리: `.env.example` / `.env` 에 `VITE_ODCLOUD_SERVICE_KEY=` 항목 추가. 공공데이터포털 발급 "Decoding" 키를 그대로 붙여넣기. 키 미설정 시 API 함수가 즉시 Error throw 해 "환경변수 미설정" 메시지 노출. `VITE_` 접두사 env 는 번들에 노출됨을 주석에 경고로 기재.
  - `Signup.jsx` 상단에 `checkBusinessStatus, interpretStatus` import. 기존 `verifyBusiness`(1초 setTimeout mock → `bizNum === '0000000000'` 만 실패 처리하던 로직)를 async 함수로 교체. 유효성 체크(10자리 숫자 + 대표자명) 통과 시 `status: 'loading'` 세팅 → `checkBusinessStatus(bizNum)` 호출 → `interpretStatus(result).ok` 여부로 `success`/`error` 분기. catch 블록에서 `err.response.data.msg`/`message`/`err.message` 우선순위로 서버 오류 메시지 추출해 "조회 실패: ..." 포맷으로 표시.
  - 폼 필드는 그대로 유지(`bizNumber`/`bizCeoName`). status 엔드포인트 자체는 대표자명을 사용하지 않지만, 가입 레코드/회원 DB 저장용으로 계속 수집. (향후 `/validate` 엔드포인트로 전환 시 개업일자 입력 필드 추가 필요 — 현재는 사용자 UX 단순화를 위해 status 엔드포인트 유지.)

#### ⏱ 2026-04-16 15:22 | 사업자 진위확인 API — 랜딩 "도입 문의하기" 모달에도 확산 적용
- **피드백**: "현재 프로젝트에 관련된 사업자 진위여부 조회가 필요한 구간에 다 적용해줘" — 신규 구축한 `businessVerifyApi` 를 프로젝트 전반으로 확산 요청.
- **조사**: 프로젝트 내 `bizNumber`/`사업자`/`진위` 키워드 매치 5개 파일 전수 검토 — `Signup.jsx`(방금 연동 완료), `ContactModal.jsx`(진위 확인 버튼 + setTimeout mock 보유), `Login.jsx`(로그인 식별자로만 사용, 진위 확인 버튼 없음), `FindAccount.jsx`(계정 찾기 식별자로만 사용, 진위 확인 버튼 없음). 후자 2개는 이미 가입 단계에서 진위 검증이 끝난 사업자번호를 식별자로 쓰는 위치라 DB lookup 영역으로 판단 → 실제 진위확인 API 호출이 필요한 구간은 Signup + ContactModal 두 곳으로 확정.
- **반영**:
  - `components/landing/ContactModal.jsx` 상단에 `../../api/businessVerifyApi` 상대경로로 `checkBusinessStatus`, `interpretStatus` import.
  - `verifyBusiness` 를 async 로 전환. `setTimeout(1000) + bizNum === '0000000000'` 분기 mock 을 제거하고 `checkBusinessStatus(bizNum)` 호출 → `interpretStatus(result)` 로 `{ ok, message }` 정규화 → `ok ? '✅' : '❌'` 이모지 프리픽스 유지(기존 모달 UI 톤 보존)하며 상태 세팅. catch 블록에서 `err.response.data.msg`/`message`/`err.message` 순으로 서버 오류 추출해 "❌ 조회 실패: ..." 포맷으로 표시. 10자리 숫자 검증 로직은 유지(네트워크 호출 전 조기 실패).
  - Login/FindAccount 는 **의도적으로 제외** — 로그인·계정 찾기는 "이미 등록된 회원인지" 확인하는 단계지 "국세청에 존재하는지"를 확인하는 단계가 아님. 여기서 국세청 API 를 호출하면 DB 에 없는 사업자번호도 국세청 존재하면 통과시키는 의미 충돌이 생김. 포맷(10자리 숫자) 검증만 유지하고 실제 진위확인은 회원가입·도입문의 두 진입점에 한정.
  - 결과: 프로젝트 내 "사업자 진위 확인 버튼을 가진 모든 폼"이 단일 `businessVerifyApi` 모듈을 통해 odcloud.kr 에 직접 호출하는 구조로 통일. 키·엔드포인트·상태 코드 해석이 한 파일에 수렴해 향후 백엔드 프록시로 전환할 때 `BASE_URL` 한 곳만 바꾸면 됨.

#### ⏱ 2026-04-16 15:30 | 계정 찾기 헤더 서브카피 제거
- **피드백**: 계정 찾기 페이지 헤더의 "잃어버린 계정 정보를 안전하게 찾아드립니다." 서브카피를 빼달라 — 페이지 제목 "계정 찾기"만으로도 목적이 충분히 전달됨.
- **반영**: `FindAccount.jsx` 헤더 중앙 컬럼의 `<p className="text-gray-500 mt-1 text-xs">...</p>` 문단을 제거. h1 "계정 찾기"만 남기고 좌측 로고 / 중앙 타이틀 / 우측 "로그인으로.." 3분할 레이아웃은 유지 — Login/Signup 과의 헤더 구조 일관성은 그대로. 상단 여백이 소폭 줄어드는 대신 탭(아이디/비밀번호) 영역과의 시각적 거리가 자연스러워짐.

#### ⏱ 2026-04-16 16:10 | 도입 문의 모달 — 한 화면 수납 + 고객 유형 라벨 정합
- **피드백**: 사업자 탭에서 사업자등록번호 영역이 열리면 모달 하단 "상담 신청하기" 버튼이 뷰포트 밖으로 밀려 잘린다. 한 페이지에 모두 들어오도록 배치를 수정하고, 고객 유형 라벨도 로그인/회원가입에서 쓰는 `개인` / `사업자 (개인/법인)` 표기로 통일해달라.
- **반영**:
  - `components/landing/ContactModal.jsx` 레이아웃 밀도 상향. 컨테이너 `max-w-3xl max-h-[90vh]` → `max-w-2xl max-h-[92vh]`로 세로 여유 확보. 헤더 `py-10 px-8` → `py-5 px-6`, 제목 `text-3xl mb-2` → `text-2xl mb-1`, 서브카피 `text-sm` → `text-xs`로 상단 블록을 컴팩트하게 축소.
  - 폼 `p-8 md:p-10 space-y-8` → `p-6 md:p-7 space-y-4`. 라디오 카드 `p-4 gap-4` → `px-3 py-2.5 gap-3`, 라벨 폰트에 `text-sm` 추가. 사업자 섹션 `p-6 space-y-4` → `p-4 space-y-2`, 내부 인풋 `py-3` → `py-2`, "진위 확인" 버튼 `px-6 py-3` → `px-5 py-2 text-sm`.
  - 성함/연락처 그리드 `gap-6` → `gap-4`, 라벨 `mb-2` → `mb-1.5`, 인풋 `py-3` → `py-2`. 문의 내용 `rows={5}` → `rows={3}`로 축소(본문 입력은 유지). 제출 버튼 `py-5 text-xl` → `py-3 text-base`로 과한 히어로감 제거.
  - 고객 유형 옵션 배열의 라벨을 `개인 (입주민)` → `개인`, `사업자 / 법인` → `사업자 (개인/법인)`로 교체. Signup `SIGNUP_TABS`·Login 탭과 동일 표기 → 3개 진입점(로그인/회원가입/도입문의)의 고객 유형 언어가 완전히 정렬됨.
  - 결과: 사업자 섹션이 펼쳐진 상태에서도 헤더 + 고객유형 + 사업자등록번호 + 성함/연락처 + 문의 내용 + 제출 버튼이 92vh 안에 스크롤 없이 수납됨. `max-h-[92vh] overflow-y-auto`는 유지해 저해상도 뷰포트에서는 안전망 역할.

#### ⏱ 2026-04-16 16:55 | Notion 라운드별 스크린샷 보완
- **피드백**: `sync_notion_logs.py` 가 세션당 대표 스크린샷 1장만 찍어서, 하루에 라운드가 5개인데도 Notion에 이미지가 1장뿐이라 과소 표현됨. 라운드별로 해당 UI 상태를 캡쳐해서 덧붙여달라.
- **반영**:
  - `_capture_rounds_2026-04-16.py` 일회성 스크립트 작성 — `sync_notion_logs` 의 `upload_to_imgbb`/`find_daily_page`/`_notion_headers` 를 재사용하고 Playwright 로 5개 UI 상태를 순회 캡쳐.
  - 라운드 정의: R1 `/find-account?tab=id`, R1' `/find-account?tab=pw`, R2 `/signup` + 사업자 탭 클릭, R3+R5 `/` + "도입 문의하기" CTA 클릭 + 사업자 라디오 선택, R4 `/find-account`.
  - 첫 실행 시 ContactModal 사업자 라디오에서 `<input type="radio" class="opacity-0">` 가 pointer events 를 가로채 Playwright 클릭 30s 타임아웃 발생 → 로케이터를 `label:has-text("사업자 (개인/법인)")` 로 교체해 해당 라운드만 재캡쳐.
  - imgBB 업로드 후 오늘 페이지 하단에 `📸 라운드별 스크린샷 (2026-04-16)` H2 섹션으로 묶어 "라운드 라벨(H3) + 이미지 블록" 쌍으로 append. Notion API 의 `PATCH /v1/blocks/{id}/children` 를 2회 호출해 초기 5장 + 재캡쳐 1장 총 6장 첨부.

#### ⏱ 2026-04-16 15:19 | 랜딩 도입사례 배너에 "직원 전용 · DRONE INSPECT 진입" 임시 버튼 추가
- **피드백**: 이미 구축된 DRONE INSPECT UI(`/dashboard`)를 랜딩 페이지 "도입사례" 섹션 우측에 `직원 전용` 임시 버튼으로 연결해달라.
- **반영**:
  - `components/landing/CasesSection.jsx` 상단에 `react-router-dom`의 `Link` import 추가. 기존 다크 배너 `<div>` 에 `relative` 포지셔닝을 부여하고, 우측 상단(`absolute top-6 right-6`)에 `<Link to="/dashboard">` 버튼을 배치.
  - 스타일: 랜딩 전체 톤을 해치지 않도록 accent 컬러인 yellow-400 을 차용 — `border-yellow-400/60 bg-yellow-400/10 text-yellow-300` 기본 + hover 시 `bg-yellow-400 text-slate-900` 로 반전. 좌측에 1.5px LIVE 도트(`bg-yellow-300`)를 두고, 라벨은 "직원 전용 · DRONE INSPECT 진입"으로 목적(진입 경로)을 명시.
  - `title` 속성에 "임시 진입 버튼 — 실제 배포 시 인증 게이트 적용 예정" 을 넣어 마우스 호버 시 운영 의도를 남김. 추후 로그인/권한 체크가 붙으면 이 버튼 자체가 `Link` → 권한 가드 래퍼로 교체될 예정.
  - 기존 배너 카피(`DRONE INSPECT 현장 스케치` / 서브카피)는 `text-center` 그대로 유지 — 버튼은 절대 위치라 중앙 정렬을 흐트러뜨리지 않음.

#### ⏱ 2026-04-16 15:21 | "직원 전용" 버튼 — 로그인 우회 임시 모드 명시화
- **피드백**: 원래 직원 전용은 로그인 후에만 노출되어야 하지만, DB 미연결 단계이므로 임시로 로그인 없이 접근 가능하도록 해달라.
- **조사**: `App.jsx` `<Route path="/dashboard">`에는 이미 인증 가드가 없고, 방금 추가한 `<Link to="/dashboard">` 도 권한 체크 없이 직행 — 기능적으로는 이미 로그인 없이 접근 가능한 상태. 다만 이 "임시 우회" 의도가 UI 상 드러나지 않아, 추후 누가 보더라도 "인증 붙이기 전 임시 단계"임을 인지할 수 있도록 가시화 보완.
- **반영**:
  - `components/landing/CasesSection.jsx` 버튼 내부에 `TEMP` 뱃지(`rounded-sm bg-yellow-400/30 text-[10px] font-bold tracking-wider`) 삽입 — hover 시 반전 스타일과 맞물려 slate 톤으로 전환. 버튼 라벨 끝에 붙여 클릭 없이도 임시 상태가 보이게 처리.
  - 버튼 아래 `text-[10px] text-yellow-200/70` 서브 라벨로 **"DB 미연결 — 로그인 우회 중"** 문구 추가. `flex flex-col items-end gap-1` 컨테이너로 버튼 + 서브 라벨 수직 정렬.
  - `title` 툴팁을 "임시 진입 버튼 — 실제 배포 시 인증 게이트 적용 예정" → **"DB 미연결 단계 — 로그인 없이 임시 접근. 실제 배포 시 인증 가드 적용 예정"** 으로 교체. 사유(DB 미연결)와 해소 시점(배포 전 가드 추가)을 명시.
  - 컴포넌트 상단 주석에 NOTE 블록 추가 — AWS 프리티어 제약으로 DB 기동이 최종 단계인 점, 그 전까지는 로그인 우회 직행 링크로 운영한다는 팀 컨텍스트를 코드 근처에 남겨 이후 합류하는 개발자가 맥락 없이 이 링크를 "권한 누락 버그"로 오해하지 않도록 함.
  - 결과: 기능은 변함없이 `/` 랜딩 → 버튼 클릭 → 로그인 화면을 거치지 않고 `/dashboard` 직행. 시각적으로는 "직원 전용 · DRONE INSPECT 진입 [TEMP] / DB 미연결 — 로그인 우회 중" 조합이 노출돼 임시 모드임이 즉시 인지됨. 향후 인증 붙을 때는 이 블록 전체를 `<RequireAuth role="staff">` 래퍼로 교체하고 TEMP 뱃지 / 서브 라벨만 제거하면 됨.

#### ⏱ 2026-04-16 15:24 | "직원 전용" 버튼 위치 재조정 — 섹션 배너 → 상단 헤더 네비 우측
- **피드백**: "그렇다고 하기엔 아직 직원전용 버튼이 안보이는데?" — 사용자가 랜딩 최상단을 보는데 버튼이 안 보였음. 원래 지시 "도입사례 우측에" 를 CasesSection 다크 배너 우측으로 해석했으나, 사용자의 실제 의도는 **헤더 네비의 "도입 사례" 링크 우측(= 항상 보이는 위치)** 이었던 것으로 재해석됨.
- **반영**:
  - `components/landing/CasesSection.jsx` — 앞 라운드에 추가했던 다크 배너 내부 `<Link to="/dashboard">` 블록 + `react-router-dom` import 전부 롤백. 원래 중앙 정렬 배너로 원복.
  - `components/landing/LandingHeader.jsx` 우측 버튼 그룹 최좌측(= "도입 사례" 네비 바로 다음, 로그인 버튼 앞)에 `<Link to="/dashboard">` 신규 삽입.
  - 스타일: 헤더가 스크롤 상태에 따라 투명 ↔ 흰 배경으로 바뀌므로 `isAtTop` 분기. 투명 모드에서는 `border-yellow-300/60 bg-yellow-300/10 text-yellow-200` (어두운 히어로 위에서 yellow accent 유지), 스크롤 후 흰 헤더에서는 `border-yellow-500/70 bg-yellow-50 text-yellow-800` 로 대비 확보. hover 시 두 상태 모두 `bg-yellow-*` 솔리드 + `text-slate-900` 로 반전. 좌측 LIVE 도트 + 우측 `TEMP` 뱃지(`text-[10px] font-bold tracking-wider`) 유지.
  - 반응형: `hidden md:inline-flex` — 모바일(기존 네비 숨김 구간)에서는 함께 숨김. 로그인/도입 문의하기와 동일한 브레이크포인트 규칙.
  - `title` 툴팁 "DB 미연결 단계 — 로그인 없이 임시 접근. 실제 배포 시 인증 가드 적용 예정" 은 그대로 유지. 코드 주석에도 AWS 프리티어 제약으로 DB 기동 전까지 로그인 우회 운영 중임을 기록.
  - 결과: 랜딩 어느 스크롤 위치에서도 상단 고정 헤더에 `🟡 직원 전용 [TEMP]` 버튼이 보이며, 클릭 시 로그인 경유 없이 `/dashboard`(DRONE INSPECT UI) 로 직행. 사용자가 앞선 메시지에서 버튼을 못 봤던 이슈 해소.

#### ⏱ 2026-04-16 15:36 | Dashboard 풀 리디자인 — 카드 그리드 → 풀스크린 HUD 관제실 톤 + DRONE↔카메라 연동
- **피드백**: 사용자가 산업 플랜트 위성 맵 레퍼런스 이미지를 첨부하며 "UI가 너무 AI틱하다 — 이 레퍼런스처럼 맵이 풀스크린 배경이고 HUD 패널이 떠있는 관제실 톤으로 바꿔달라". 추가로 "현재 화면은 DRONE 01 = RGB 카메라, DRONE 02 클릭 시 열화상 카메라로 자동 전환" 규칙 요청.
- **사전 조사**: Explore 에이전트로 store/컴포넌트/스타일 토큰 전수 파악 — `droneStore` 에 선택 드론 state 없음, `cameraMode` 는 rgb/thermal/blend 3단, `BuildingScene` 은 부모 높이 의존, `DashboardLayout` 이 Sidebar+Header+p-4 padding 으로 카드 그리드 전제, index.css 에 `.card`/`.card-accent`/`.badge-*` 컴포넌트 클래스 + tailwind 커스텀 색(`accent-*`, `dashboard-bg/surface/panel/border`) 존재.
- **반영**:
  - `store/droneStore.js` — `selectedDroneId: 'drone-01'` state 추가, `DRONE_CAMERA_MAP = { 'drone-01': 'rgb', 'drone-02': 'thermal' }` 상수 export, `setSelectedDrone(id)` 액션이 selectedDroneId + cameraMode 를 원자적으로 set (drone ↔ 카메라 1:1 매핑 내재화). 초기 reset 에도 selectedDroneId 포함.
  - `App.jsx` — `DashboardLayout` 에서 `Header` import/렌더 제거, `main` 의 `p-4` 제거 + `relative overflow-hidden` 부여해 Dashboard 가 뷰포트 전체(Sidebar 제외)를 캔버스로 차지. Sidebar(w-14) 는 내비게이션 용도로 유지.
  - `components/dashboard/DashboardTopBar.jsx` 신규 — 맵 위 플로팅 상단 바. 좌측: 브랜드 로고 + Global Search, 중앙: `Satellite Map` 토글(현재 UI only, 추후 Mapbox 도입 예정 주석), 우측: `Flightpaths` 버튼 + WS 상태(LIVE/SYNC/OFFLINE/ERROR) + 알림 벨(HIGH 카운트 > 0 시 붉은 점) + 프로필 U 박스. 전체 `pointer-events-none` 바탕에 자식만 `pointer-events-auto` 로 맵 클릭 방해 방지. `backdrop-blur-md` + `bg-slate-900/70` + `border-slate-700/60` 조합으로 "HUD" 질감.
  - `components/dashboard/DronesPanel.jsx` 신규 — 좌하단(`absolute bottom-4 left-4`) 플로팅 카드. DRONE 01(RGB) / DRONE 02(THERMAL) 2열 그리드. 각 카드 클릭 시 `setSelectedDrone(id)` 호출 → cameraMode 자동 매핑. 선택된 카드는 accent(emerald) 글로우(`shadow-[0_0_12px_rgba(16,185,129,0.25)]`) + `ACTIVE` 뱃지, 비선택은 slate 톤 + `IDLE` 뱃지. 배터리 바는 DRONE 01 만 실 텔레메트리 연결, DRONE 02 는 데모값 83%(멀티 드론 API 도입 전).
  - `pages/Dashboard.jsx` 풀 리라이트 — 루트가 `relative h-full w-full overflow-hidden`, `<BuildingScene>` 를 `absolute inset-0` 배경으로 깔고 `radial-gradient` 비네팅 오버레이 추가(패널 가독성 확보). 기존 12-col 그리드(영상/온도/3D/하자/보고서) 해체하고 4개 플로팅 aside 로 재배치:
    - 상단: `<DashboardTopBar />`
    - 좌상단(`top-20 left-4 w-[320px]`): LIVE Feed(`<LiveVideoFeed>`) + Thermal Trend(`<ThermalGraph>`). Live Feed 헤더에 "D01 · RGB · 일반 카메라" 처럼 **선택 드론 + 카메라 모드** 실시간 라벨링. 빨간 LIVE 도트(`animate-pulse`).
    - 좌하단: `<DronesPanel />`
    - 우측(`top-20 right-4 bottom-4 w-[360px]`): AI Defect Analysis 플로팅 카드. 헤더에 `<Activity />` 아이콘 + 타이틀 + 녹색 LIVE 도트 + "Real-time detection" 서브 라벨(레퍼런스 문구 그대로). 본문은 기존 `<DefectPanel />` 재사용.
  - `components/map3d/BuildingScene.jsx` — 루트에 `relative` 부여(풀스크린 배경 시 범례 absolute 기준 필요). 범례를 `bottom-2 left-2` → `bottom-4 left-1/2 -translate-x-1/2` 로 이동(DronesPanel/AI 패널과 충돌 없는 bottom-center). `rounded-full` pill 형태에 `bg-slate-900/60 backdrop-blur-sm` 입혀 HUD 질감 통일. `pointer-events-none` 으로 맵 조작 방해 제거.
  - `components/layout/Sidebar.jsx` — `NAV_ITEMS` 의 대시보드 링크 `to: '/'` → `to: '/dashboard'` 수정(랜딩/대시보드 라우트 분리 후 경로 오류 고침).
- **제외 / 결정 사항**:
  - `components/layout/Header.jsx` 파일은 보존하되 참조 없음 상태로 남김 — 추후 다른 레이아웃(예: Reports 페이지)에서 재사용 가능성.
  - `DroneStatusCard.jsx` 도 보존하되 Dashboard 에서는 DronesPanel 로 대체. 두 컴포넌트의 책임이 겹치지만 DroneStatusCard 는 4칸 텔레메트리 상세(고도/속도/모드/배터리) 용, DronesPanel 은 드론 선택 + 카메라 매핑 용으로 목적이 다름.
  - `ReportPanel` 은 이번 HUD 레이아웃에서 일단 제외 — 레퍼런스에 대응물 없고, 풀스크린 캔버스 철학과 어긋남. 추후 "리포트" 별도 탭/페이지로 분리 예정.
  - **위성 이미지 베이스맵**(레퍼런스의 실제 아쉬워 보이는 요소)은 이번 라운드 제외 — 현재 R3F 기반 BuildingMesh 와 데이터 소스가 다르고 Mapbox/MapLibre 도입이 선행 필요. TopBar 의 "Satellite Map" 버튼은 자리만 잡아 둠.
- **검증**: `npm run dev` → Vite 6.4.2 231ms 부팅(port 5174). Dashboard.jsx / DashboardTopBar.jsx / DronesPanel.jsx 모두 HMR transform 성공, 컴파일 에러 0건. lucide-react@1.8.0(실제 번들은 최신 아이콘 export 포함) 에서 `Search/Satellite/Route/Bell/Video/Activity` named export 존재 확인 후 import.
- **결과**: 사용자가 "너무 AI틱"이라 한 "카드 카탈로그" 톤이 "풀스크린 위성 관제실" 톤으로 전환. DRONE 01/02 카드 클릭 → 좌상단 LIVE Feed 의 카메라 스트림(rgb/thermal MJPEG URL)이 즉시 전환되어 사용자가 제시한 "드론=카메라" 매핑 규칙이 UI 에 내재화됨.

#### ⏱ 2026-04-16 15:42 | 3D 맵 강등 + LIVE 피드 승격 — 메인 캔버스 재편
- **피드백**: 이전 라운드 결과 화면을 보고 "3D 맵이 주 화면처럼 나온다. 3D 맵(도면/평면도/시뮬레이션 모델링 용)은 우측 하단 미니맵이 맞고, 메인은 다른 것"이라 재정비 요청. 사용자가 일관되게 주장한 "DRONE 01 = 일반 카메라 / DRONE 02 = 열화상" 규칙과 맞물려, 메인 캔버스는 **선택 드론의 LIVE 카메라 피드**가 돼야 한다는 쪽으로 확정.
- **반영**:
  - `components/video/LiveVideoFeed.jsx` — `fill` prop 추가. fill=true 시 컨테이너 `w-full h-full`(16/9 강제 해제), `object-cover`(16/9 박스 꽉 채움). No-Signal 플레이스홀더도 fill 모드 전용으로 개편: `radial-gradient` 다크 배경 + 8% opacity 그린 그리드 오버레이(레이더 톤) + "Signal Standby" 모노스페이스 라벨 + 현재 카메라 모드 서브 라벨. 기존 top-2 모드 뱃지/LIVE 점멸 마커는 fill 모드에서 숨김(상위 Dashboard HUD 에서 처리).
  - `pages/Dashboard.jsx` 재배치 — 기존 `<BuildingScene>` 풀스크린 배경 구조 폐기. 메인 영역에 `<LiveVideoFeed fill />` 를 16/9 박스로 렌더링. 좌상단 Live Feed PIP 도 제거(메인으로 승격되어 중복).
  - 3D 맵은 우하단 300×200 카드 (`3D Mini Map` 타이틀 + "floor plan · sim" 서브 라벨)로 강등. `<BuildingScene>` 는 이 카드 안에 삽입.
  - AI Defect Analysis 패널은 미니맵과 수직 겹침 방지 위해 `bottom: MINIMAP_H + 24` offset 적용.
  - `components/map3d/BuildingScene.jsx` 의 범례 pill 은 그대로 유지(미니맵 bottom-center 안에 자연스럽게 앉음).
- **결과**: 메인 캔버스가 "선택된 드론의 시점 영상" 이 되고, 3D 시뮬레이션/평면도 모델링은 우하단 미니맵으로 내려가 "맵은 부가 정보" 의 위계 확립.

#### ⏱ 2026-04-16 15:45 | LIVE 피드 16:9 비율 유지 + 패널/미니맵 겹침 방지
- **피드백**: "16:9 카메라 비율 유지하면서 AI DEFECT ANALYSIS랑 3D MINIMAP 구간에 안 겹치게 해줄 수 있을까?"  — 앞 라운드에서 LiveVideoFeed `fill` 모드가 `object-cover + w-full h-full` 이어서 피드가 뷰포트 전체를 덮고 우측 HUD 패널들 뒤로 깔려 있었음. 원본 영상 비율(16:9) 유지하면서 패널·미니맵 바깥으로만 확장되게 해달라는 요청.
- **반영**:
  - `pages/Dashboard.jsx` 에 `SAFE = { top:100, bottom:150, left:316, right:400 }` 상수 정의. 각 값은 주변 HUD 패널 폭/높이 + margin + gap 기준:
    - `top: 100` → DashboardTopBar(56px) + 여백(44)
    - `bottom: 150` → DronesPanel(≈134) + gap. 우하단 Minimap(h=200) 은 horizontal 로 이미 오른쪽에 치우쳐 수평 분리되므로 vertical offset 은 DronesPanel 기준만 반영.
    - `left: 316` → Thermal Trend(w=280) + margin(4) + gap(32)
    - `right: 400` → AI Defect Analysis(w=360) + margin(4) + gap(36). 미니맵(w=300) 은 이미 이 범위 안에 들어오므로 별도 고려 불필요.
  - 기존 "absolute inset-0 + LiveVideoFeed fill" 구조를 `absolute { top, bottom, left, right } = SAFE` + `flex items-center justify-center` 래퍼로 교체. 내부 16/9 박스는 `{ aspectRatio: '16 / 9', width: '100%', maxHeight: '100%' }` 조합으로 safe zone 안에서 자동 피팅 — 화면 비율에 따라 가로/세로 기준 중 하나로 맞춰짐.
  - 피드 박스에 `bg-black rounded-xl border border-slate-700/60 shadow-2xl` 로 letterbox 영역을 자연스럽게 처리. 박스 바깥(safe zone 안의 여백)은 `bg-dashboard-bg` 가 비침.
  - 기존 상단 중앙에 따로 떠있던 "드론·카메라 컨텍스트 뱃지" 는 피드 박스 좌상단(`absolute top-3 left-3`) 으로 이동 — 피드 자체의 HUD 로 자리 잡음.
- **검증**: Vite dev 재기동 328ms, Dashboard.jsx / LiveVideoFeed.jsx transform 모두 성공. 컴파일 에러 0.
- **결과**: LIVE 피드가 16:9 letterbox 박스로 가운데 정렬되고, AI Defect Analysis(우상단) + 3D Mini Map(우하단) + Thermal Trend(좌상단) + Drones(좌하단) 네 개 HUD 카드와 어떤 화면 비율에서도 겹치지 않음. 사용자가 지목한 "사각지대" 영역이 해소됨.

#### ⏱ 2026-04-16 15:54 | Thermal Trend 를 피드 박스 내부 우하단 오버레이로 이관 — 메인 피드 확장
- **피드백**: "THERMAL TREND가 현재는 옆에 별도로 빠져있는데 카메라 화면 우측 하단에 오버레이 될 수 있도록 해줘. 그렇게 되면 메인 카메라 화면이 조금 더 커질 수 있을 것 같아."  — 좌상단 Thermal Trend 별도 aside 가 피드 좌측 safe zone 을 316px 나 잡아먹어 메인 피드가 과도하게 수평 압축되던 문제.
- **반영**:
  - `pages/Dashboard.jsx` 에서 좌상단 Thermal Trend `<aside>` 블록 삭제. 동일 섹션을 16:9 피드 박스 내부 `absolute bottom-3 right-3 w-[260px]` 로 이관 — `rounded-lg bg-slate-900/80 border border-slate-700/60 backdrop-blur-md shadow-lg` 조합으로 피드 위에 떠있는 HUD 오버레이 질감. 내부 그래프 높이 110px → 88px 로 축소해 오버레이가 피드를 과도하게 가리지 않도록 조정.
  - `SAFE.left` 를 **316 → 16** 로 축소. 좌상단에 Thermal Trend 가 사라졌고 DronesPanel 은 bottom 영역 전용이라 수평 safe 확보 불필요. 피드가 사이드바 직후부터 수평 확장됨(가용 폭이 약 300px 늘어남).
  - Dashboard.jsx 상단 JSDoc 레이아웃 스케치도 새 구조로 업데이트.
- **충돌 점검**: 피드 박스 내부 좌상단(드론/카메라 HUD 뱃지) + 우하단(Thermal Trend 오버레이) 는 대각선 반대쪽이라 시각적 간섭 없음. 피드 중앙의 "Signal Standby" / "No Signal" 플레이스홀더와도 분리됨.
- **검증**: 기존 Vite 서버가 HMR 로 Dashboard.jsx transform 수용. 컴파일 에러 0.
- **결과**: 메인 피드 박스가 수평으로 약 300px 더 넓어지면서, Thermal Trend 정보는 그대로 피드 컨텍스트 안에 유지됨(드론의 "실시간 온도 추이" 가 그 드론이 보는 장면 위에 overlay 되는 논리적 정합성도 향상).

#### ⏱ 2026-04-16 16:01 | Thermal Trend 오버레이 → 반대 드론 카메라 PIP 로 교체 (의도 재해석)
- **피드백**: "열화상 데이터(Thermal Trend)도 16:9 아니야?" 질문으로 사용자의 원 의도가 드러남 — **"Thermal Trend" 라 라벨된 오버레이를 사실은 DRONE 02 카메라 화면으로 알고 있었고, 두 드론 뷰를 동시에 보여주려던 것**. 앞 라운드까지 내가 recharts 꺾은선 그래프(max/avg/min 온도 시계열)를 거기 넣었던 게 의도 불일치였음. 정답은 "메인 = 선택 드론 카메라 / PIP = 반대 드론 카메라".
- **반영**:
  - `components/video/LiveVideoFeed.jsx` — `mode` prop 추가. 기존 `useDroneStore(s.cameraMode)` 단독 사용 구조를 `mode ?? storeCameraMode` 로 바꿔 props override 허용. 이렇게 해야 같은 화면에 메인(store 기반 rgb) + PIP(명시 thermal) 두 인스턴스를 독립적으로 렌더링 가능. 두 인스턴스 모두 `useState(hasError)` 가 컴포넌트 로컬이라 에러/로딩 상태도 독립.
  - `pages/Dashboard.jsx` —
    - `ThermalGraph` import 제거(Dashboard 에서 미사용). 파일 자체는 보존 — 추후 별도 리포트/분석 페이지에서 재사용 가능성.
    - `DRONE_CAMERA_MAP` 을 droneStore 에서 import. `otherDroneId(id)` 헬퍼 추가(두 드론 전제 → `id === 'drone-01' ? 'drone-02' : 'drone-01'`). 확장 시 drones[] 배열 순회로 교체 예정이라 주석 남김.
    - 컴포넌트에서 `pipDroneId = otherDroneId(selectedDroneId)`, `pipMode = DRONE_CAMERA_MAP[pipDroneId]` 유도.
    - 기존 우하단 Thermal Trend `<section>` 블록을 `<button>` 기반 PIP 로 교체. `w-[260px] aspect-video`(16:9 유지) + `<LiveVideoFeed fill mode={pipMode} />`. 상단 좌측에 `D02 · THERMAL` 등 라벨 뱃지, 상단 우측에 `<ArrowLeftRight />` 아이콘 + `SWAP` 텍스트로 상호작용 힌트. hover 시 border/뱃지 accent 컬러로 강조.
    - 클릭 시 `setSelectedDrone(pipDroneId)` 호출 → 기존 `DRONE_CAMERA_MAP` 규칙이 cameraMode 까지 원자적으로 갱신하므로 메인·PIP 이 즉시 스왑. 사용자 관점에서 "메인 / PIP 토글" 이 한 번의 클릭으로 완료.
    - Dashboard JSDoc 상단 스케치도 "D02 · THERMAL (반대 드론 PIP) SWAP" 구조로 업데이트.
- **부수 효과**: "Thermal Trend" 라벨이 혼동을 낳았던 부분 완전 제거. 사용자가 관제실 톤에서 기대하는 자연스러운 "메인 뷰 + PIP 뷰" 패턴으로 수렴. 두 드론 시점을 동시에 모니터링 가능해져 사용성도 상승.
- **검증**: 기존 Vite(5176) HMR transform 성공, Dashboard.jsx + LiveVideoFeed.jsx 컴파일 에러 0.
- **남은 한계**: 현재는 드론이 물리적으로 2대 고정 전제. 멀티 드론으로 확장되면 `otherDroneId` 헬퍼 + DronesPanel 의 2열 그리드 + DRONE_CAMERA_MAP 상수 모두 배열 기반으로 리팩토링 필요. 주석에 해당 전환 시점 힌트 남겨둠.

#### ⏱ 2026-04-16 16:03 | 3D Mini Map 과 AI Defect Analysis 가로 폭 정렬
- **피드백**: "3d mini map 과 AI DETECT ANALYSIS 가로 폭이 달라서 보기 불편해" — AI 패널은 `w-[360px]`, 미니맵은 `MINIMAP_W = 300` 이라 우측 세로 정렬이 어긋나 시각적으로 계단 형태가 됨.
- **반영**: `pages/Dashboard.jsx` 의 `MINIMAP_W` 300 → 360 으로 변경. AI 패널과 동일 폭 + 동일 `right-4` offset 이므로 두 카드의 좌·우 엣지가 완전 일치. `SAFE.right=400` 은 원래부터 AI 패널 기준(360+gap)이라 그대로 유효.
- **결과**: 우측 세로 라인이 깔끔하게 정렬됨. 미니맵 내부 3D 씬의 카메라 프레이밍에는 영향 없음(BuildingScene 은 부모 크기에 맞춰 리사이즈됨).

#### ⏱ 2026-04-16 16:40 | 세션 기반 워크플로우 도입 — Setup → Level → Modeling → Dashboard → Report
- **피드백**: 사용자가 전체 프로세스 재정의. 직원 전용 → 바로 대시보드가 아니라 **① 현장명/운용자/날짜 입력 → ② Level(CAD/평면도/자율비행) 선택 → ③ 모델링 시작 → ④ 대시보드 관제(검출 하자 기록 + 3D 미니맵에 모델·드론 위치·하자 마킹) → ⑤ 비행 종료 시 REPORT 자동 작성** 순서로 재설계 요청. Level 1/2/3 은 원래 정의(L1=CAD, L2=평면도, L3=자율비행)이며 이번 라운드는 **세 Level 모두 프로토타입으로 동작 완성**(백엔드 파싱은 전부 Mock), 시각적 폴리시는 L3 에 약간 더 비중.
- **설계 결정** (plan agent 및 사용자 확인 통해 확정):
  - 라우트: `/session/setup`, `/session/level`, `/session/modeling` 독립 nested route (SessionLayout + Outlet), `/dashboard/report` 도 nested overlay route (DashboardLayout 부모 유지로 WebSocket 끊김 방지)
  - 스토어 분리: `sessionStore`(세션 메타 + 모델링 상태) 신규, `droneStore` 에 `missionStatus`('idle'|'flying'|'ended') 추가. 책임 경계 명확화
  - persist: `zustand/middleware` persist + `partialize` 로 File 객체/런타임 러너 ref 제외. L2 이미지만 base64 저장(쿼터 5MB 내 가정)
  - Mock 모델링: `requestAnimationFrame` 기반 프로시저럴 러너 (`utils/mockModeling.js`). L1/L2 는 7초, L3 는 11초. 4단계 스테이지 텍스트(Level 별 다름)
  - 가드: `ProtectedSessionLayout` 레이아웃 최상위에서 조건부 `<Navigate replace />` 반환 (useEffect 기반 redirect 대신 사용 — Dashboard 가 잠깐 마운트되며 WebSocket 연결되는 현상 방지)
- **신규 파일** (12개):
  - `store/sessionStore.js` — persist Zustand, `startModeling/cancelModeling/finish/reset` 액션
  - `utils/mockModeling.js` — `runMockModeling({ level, onTick, onComplete })` + `STAGES_BY_LEVEL`, `DURATION_BY_LEVEL` export
  - `pages/session/SessionSetup.jsx` — 3 필드 폼(현장명/운용자/날짜) + 유효성 + 상위 단계 복원(이미 입력한 값 편집 가능)
  - `pages/session/SessionLevel.jsx` — `LevelCard` 3개, L3 `recommended` 뱃지 + 기본 포커스
  - `pages/session/SessionModeling.jsx` — Level 별 분기 UI(L1/L2 = FileDropzone, L3 = 시뮬레이션 안내 박스) + ModelingProgress 인라인. 완료 후 1.8s 뒤 자동 `/dashboard` 이동
  - `components/session/SessionLayout.jsx` — 상단 진척도 바(1/2/3 + Check 아이콘) + 간이 내부 가드(이전 단계 미완료 시 해당 단계로 redirect)
  - `components/session/ProtectedSessionLayout.jsx` — 대시보드 진입 게이트
  - `components/session/LevelCard.jsx` — L1/L2/L3 카드 UI (icon/title/subtitle/bullets/selected/recommended)
  - `components/session/FileDropzone.jsx` — 드래그&드롭 + 클릭 input + 썸네일(L2) + 파일 메타 표시
  - `components/session/ModelingProgress.jsx` — 프로그레스 바 + 스테이지 텍스트 + 완료 `onComplete` 콜백
  - `components/map3d/DroneMarker.jsx` — telemetry 기반 R3F 드론 아이콘 (cone + 4 props + 고도 라인 + Billboard ID 라벨)
  - `components/dashboard/MissionControl.jsx` — START/END 토글 (경과 시간 1초 틱)
  - `components/report/ReportModal.jsx` — `/dashboard/report` nested overlay, 세션 요약 + 심각도 카운트 + 기존 ReportPanel 재사용 + "새 점검 시작"
- **수정 파일**:
  - `store/droneStore.js` — `missionStatus`, `missionStartedAt`, `missionEndedAt` + `startMission/endMission` 액션, reset 에 포함
  - `App.jsx` — `/session/*` + `/dashboard/*` nested 라우트 구조, `<Outlet />` import, `ProtectedSessionLayout` 래핑
  - `components/landing/LandingHeader.jsx` — 직원 전용 `to="/dashboard"` → `to="/session/setup"` + title 문구 갱신
  - `components/map3d/BuildingMesh.jsx` — 단일 박스 메시에서 L1(4면 박스 벽 + Html 치수 라벨) / L2 텍스처(`useTexture`)·폴백 분리 / L3 5000점 point cloud / 폴백 4 분기. `WIDTH/DEPTH/HEIGHT` export 로 DroneMarker/DefectMarker 가 공유
  - `components/map3d/BuildingScene.jsx` — `useSessionStore` 로 level/imageUrl 구독, `<BuildingMesh level imageUrl />` 전달, `<DroneMarker />` 포함
  - `components/dashboard/DashboardTopBar.jsx` — 좌측 브랜드 옆 세션 컨텍스트 라벨("현장 · 운용자 · L?"), 중앙에 `<MissionControl onEnd={onMissionEnd} />` 삽입. `onMissionEnd` prop 으로 부모가 navigate 주입
  - `pages/Dashboard.jsx` — `useNavigate` + `handleMissionEnd` 콜백(`navigate('/dashboard/report')`) → TopBar 에 전달
- **Hooks 규칙 버그 잡음**: L2 `useTexture` 를 조건부 호출했다가 React 훅 규칙 위반 발견 → `LevelTwoMeshTextured` / `LevelTwoMeshFallback` 두 컴포넌트로 분리 후 상위에서 imageUrl 유무로 분기. 동일한 이유로 useTexture 는 항상 호출되는 컴포넌트에서만 사용.
- **검증**: 기존 Vite(port 5176) HMR 상에 전체 20개 파일 curl 스캔 → 모두 OK, Pre-transform error 없음. 수동 플로우 테스트 체크리스트는 `plans/delegated-popping-boole.md` 의 Verification 섹션 참조(Landing → 직원 전용 → Setup → Level(L3) → Modeling → Dashboard → MissionControl → Report → 새 점검 시작).
- **잔여 한계**:
  - L2 이미지 base64 persist 는 5MB 쿼터 주의(큰 평면도 업로드 시 터질 수 있음, 데모용 권장 크기 1MB 미만)
  - 드론 텔레메트리는 WebSocket 미연결 시 x=0,y=0,z=0 고정이라 DroneMarker 가 원점에 정적 표시 — 실제 WS 붙으면 자연스럽게 움직임
  - CAD 파싱(.dwg/.dxf/.ifc) · 평면도→3D · SLAM 은 전부 Mock. 실제 백엔드 연결 시 `runMockModeling` 호출부를 API 호출 + polling/streaming 으로 교체하면 됨(stateful 계약은 동일)
  - `useWebSocket` 은 여전히 Dashboard 마운트 시 즉시 연결 — `missionStatus === 'idle'` 동안도 텔레메트리 수신. 이 동작이 의도한 바인지는 추후 확인 필요(현재 사용자 의도 기본 채택)

#### ⏱ 2026-04-16 16:06 | Sidebar — 에메랄드 🚁 박스 → 실제 로고 + 내비 메뉴 확장
- **피드백**: 사용자가 사이드바 두 아이콘(에메랄드 🚁 로고 + 📊 대시보드)의 의미를 물음. 설명 후 "에메랄드 박스는 우리 로고로 변경 + 메뉴 몇 개 더 깔아줘" 요청.
- **반영**:
  - `components/layout/Sidebar.jsx` 상단 로고 박스를 `<div className="bg-accent-500"><span>🚁</span></div>` 에서 `<img src={logoWhite} className="w-11 h-11 object-contain" />` 로 교체. `logo_white.png` 를 이미 랜딩 헤더가 다크 배경에서 쓰고 있어 재사용 — 사이드바 `bg-dashboard-surface`(다크) 에도 자연스럽게 맞음. 상단 `h-14 border-b` 프레임은 그대로.
  - `NAV_ITEMS` 확장: **대시보드(활성)** / 하자 리포트 / 비행 경로 / 드론 관리 / 설정. placeholder 는 `disabled: true` 플래그로 분기. `📊` 이모지 → `LayoutDashboard` lucide 아이콘으로 교체해 나머지 아이콘과 시각 언어 통일(`FileText`, `Map`, `Plane`, `Settings`, `LogOut`).
  - 렌더 분기:
    - `disabled: true` → `<button>` + `title="... 준비 중"` + `opacity-60 cursor-not-allowed text-slate-600` — 클릭해도 무동작. `aria-disabled`.
    - 활성 항목 → 기존 `<NavLink>` + isActive emerald glow 유지.
  - 하단에 `border-t border-slate-700 pt-3` 로 구분된 로그아웃 섹션 추가. `LogOut` 아이콘 + `title="로그아웃 — 세션 연동 전 임시 버튼"`. 실제 세션 로직은 DB 연결 후 구현.
- **결정 사항**: placeholder 메뉴는 실제 라우트를 파지 않음(`to: '#'` + disabled). 방문 시 `<Routes>` 에 404 페이지가 없는 구조라 placeholder 를 클릭 가능한 링크로 만들면 화면이 빈 대시보드 레이아웃으로 남아 더 혼란스러울 수 있어 buttons 로 유지.
- **검증**: 기존 Vite(5176) HMR transform 성공. 로고 파일 경로(`assets/logo/logo_white.png`) 실존 확인.
- **결과**: 사이드바가 "로고 + 5개 내비 + 로그아웃" 3단 구조로 정돈됨. 대시보드만 활성이라 현재 기능은 변동 없고, 추후 페이지가 추가되면 `disabled: false` + `to: '/xxx'` 로 한 줄씩 풀면 됨.
  - 결과: 한 세션에 대표 스크린샷 1장 + 라운드별 세부 캡쳐 6장이 함께 보이는 구조. 향후 sync 스크립트 자체에 "세션 내 `#### ⏱` 라운드 스캐너 + prepare 훅" 을 정식 기능으로 편입할지는 별건으로 둠(현재는 일회성 보완).

---

## 6️⃣ 추가 피드백 & 반영 — 직원 전용 랜딩(Interior Inspection) 분리

#### ⏱ 2026-04-16 17:20 | 직원 전용 버튼 → Interior Inspection Dashboard 랜딩 신설
- **피드백**: 사용자가 Interior Inspection Dashboard 목업 JSX(SkyCheck Interior — 실내 평면도 + 핀 + Drone-Mini HUD + 결함 분석 패널)를 첨부하며 "직원 전용 버튼을 눌러 들어가면 직원 전용 랜딩페이지가 뜨도록 구현해줘. 이 목업을 업데이트 기준으로 써줘".
- **설계 결정**:
  - 기존 플로우(Landing → 직원 전용 → `/session/setup`) 를 **Landing → 직원 전용 → `/employee` → `/session/setup`** 으로 한 단계 전치. 세션 워크플로우(v5 라운드에서 도입)는 `/employee` 화면 내부의 "점검 세션 시작 →" 버튼으로 이어가 기존 기능 100% 보존.
  - 랜딩 자체는 **라우트만 공개**, 로그인/권한 가드는 DB 연결 단계에서 추가(AWS 프리티어 제약 — `project_aws_free_tier.md` 원칙 준수).
  - Floor Plan 네비는 현 페이지 자신을 가리키므로 활성 언더라인 표시만 유지. Defect List / AI Analysis / Inspection Log / Report 는 목업 버튼으로 둠(후속 라운드에서 라우팅 연결).
  - 원본 목업에는 없던 2개 실용 링크 추가: ① 우하단 "점검 세션 시작 →" → `/session/setup`, ② 우측 패널 "내부 전용 점검 리포트 생성" → `/dashboard/report` nested overlay(기존 ReportModal 재사용).
- **신규 파일**:
  - `src/pages/EmployeeLanding.jsx` — 상단 HUD 네비 + 실내 평면도 목업(하자 핀 2종: Critical/Medium 호버 툴팁) + Drone-Mini HUD(배터리 82%) + 우측 결함 분석 패널. 중복 JSX(창호·천장 결함 카드) 는 `DefectCard` 서브 컴포넌트로 1회 정의 후 props 로 재사용(DRY, Rule 6-1 자동 리팩토링).
- **수정 파일**:
  - `src/App.jsx` — `import EmployeeLanding` 추가 + `<Route path="/employee" element={<EmployeeLanding />} />` 공개 라우트 등록. 세션/대시보드 라우트 구조는 **그대로 유지**(Rule 3-6 보존 원칙).
  - `src/components/landing/LandingHeader.jsx` — "직원 전용" `<Link>` 의 `to` 를 `/session/setup` → `/employee` 로 교체. 기존 값은 `// //! [Original Code]` 로 주석 보존, 신규 값은 `// //* [Modified Code]` 선행 주석으로 명시(Rule 3-2).
- **아이콘 처리**: 원본 목업의 `Layout / Map as MapIcon / AlertTriangle / LayoutDashboard / Layers` 는 JSX 내 미사용 — 주석으로 흔적 남기고 import 에서 제외해 번들 사이즈/린트 경고 해소. 실제 사용 아이콘만 유지: `Search, Bell, Activity, ClipboardCheck, Drone`.
- **반응형 대응(Rule 7-2)**:
  - 모바일(`<640px`): 상단 네비 그룹을 `flex-col`로 세로 적층, 주 메뉴 숨김(`hidden md:flex`), 검색 입력 `w-44`, 본문 평면도/결함 패널은 lg 미만에서 세로 스택(`flex-col lg:flex-row`), 결함 패널이 아래로 밀림.
  - 태블릿(768~1023px): 네비 수평 전환(`md:flex-row`), 주 메뉴 노출, 검색 `md:w-64`. 본문은 여전히 세로(2열 레이아웃은 `lg:` 이상에서만).
  - 데스크탑(≥1024px): 중앙 평면도 + 우측 결함 패널(`w-96`) 2열 레이아웃.
- **잔여 한계**:
  - `/employee` 는 현재 **미가드 공개 라우트**. 운영 배포 전 `ProtectedEmployeeLayout`(세션 토큰 + 직원 role 체크) 필요.
  - 평면도/핀/Drone-Mini 는 **정적 목업 데이터**. 실시간 연동은 백엔드 WebSocket + 실내 SLAM 데이터 파이프라인이 갖춰진 뒤 진행.
  - 네비 항목(Defect List / AI Analysis / Inspection Log / Report) 은 라우트 미연결. 다음 라운드에서 각 화면의 목업/실구현 여부 결정 후 페이지 신설 예정.

#### ⏱ 2026-04-16 17:45 | UX 경계 재정의 — 직원 전용 랜딩을 "사무실 허브"로 전면 교체 (v1 → v2)
- **피드백**: 사용자 — *"지금 (v1)은 바로 현장 업무에 착수해야 될 느낌인데, 직원 전용 랜딩은 사무실에서 도면 업로드 및 사전 작업, 보고서 작성, 현장 관리 등을 해야 되는 화면이고, `/session/setup` 은 실제 현장에 나갔을 때 하자점검을 하기 위함"*. v1 에서 이식한 "Interior Inspection Dashboard" (실시간 드론 HUD + 평면도 핀 + 결함 사이드패널) 은 **현장 작업용 UI** 라 `/employee` 목적(사무실 허브)과 방향이 반대였음.
- **UX 경계선 확정** (메모리 저장 `project_ux_boundary_employee_vs_session.md`):
  - `/employee` = **사무실 허브** (pre/post 현장: 사전 작업·관리·보고서)
  - `/session/setup → … → /dashboard` = **현장 실무** (in-the-field: 실시간 드론 관제)
  - 두 영역 간 UI 요소는 섞지 않음. 얇은 링크(`점검 세션 시작 →`, `리포트 조회`) 로만 연결.
- **추가 요구**:
  - KPI 섹션 — "가진 데이터로 구성 가능한 수준" 으로. 이번 달 누적치는 목업 허용, 현재 세션 수치는 실데이터.
  - 알림/공지 섹션 · 팀원 현황 및 담당 현장 할당 섹션 신설.
  - 톤 — 랜딩(`/`) 과 **톤온톤**.
- **설계 결정**:
  - 랜딩 톤 분석: `bg-gray-50` 전체 + `bg-slate-900` 다크 배너(점무늬 `#fbbf24` 닷) + 흰 카드 `rounded-xl shadow-md` + 상단 `border-t-4` accent + blue-600/yellow-500/green-600 3색 악센트.
  - `EmployeeLanding` 구조 (상→하): `EmployeeHeader`(sticky 흰색) → `WelcomeBanner`(slate-900 점무늬 + 개인화 인사 + `SummaryPill` 2개) → `QuickActionsSection`(4 카드) → `KPISection`(4 카드) → 2열(`TodayScheduleSection` + `NotificationsSection`) → `TeamAssignmentsSection`(테이블) → `RecentActivitySection`(타임라인).
  - **데이터 이원화**: 실데이터 훅(`useSessionStore`/`useDefectStore`/`useDroneStore`) + 파일 상단 `MOCK_*` 상수. DB 연결 시 `MOCK_*` 를 API 훅 호출로 교체하도록 키·타입 고정.
  - **KPI 4종**: ① 이번 달 점검 완료(MOCK) ② 현재 세션 하자 검출(LIVE — `defects.length`) ③ 심각(HIGH) 하자(LIVE — `severityCounts.HIGH`) ④ 비행 시간(현재 세션 진행 중이면 LIVE `missionStartedAt~now`, 없으면 MOCK 이번 달 평균). 각 카드에 `LIVE`/`MOCK` 뱃지 명시 — 데이터 출처 혼동 방지.
  - **퀵 액션 4종**: "현장 점검 시작"(primary, RECOMMENDED) → `/session/setup` · "도면 업로드" → `/session/level` · "보고서 작성/조회" → `/dashboard/report` · "현장 관리"(disabled, SOON). disabled 카드는 `<div>` 로 렌더 + `cursor-not-allowed`.
  - **팀원 테이블** 상태 3종(office/field/standby) + 재배정 액션 placeholder + 모바일에선 `팀` 컬럼 숨김(`hidden md:table-cell`) + 모바일용 team 표기는 이름 아래 작은 글씨로.
  - **알림 타입 3종**(notice/alert/system) + `PINNED` 강조.
  - **로고 클릭 / "메인으로" 링크** 로 `/` 복귀 경로 확보.
- **신규 아이콘**: `lucide-react` 에서 `Building/CheckCircle/Clock/LogOut/MapPin/Megaphone/TrendingUp/UserCheck/Users` 추가 활용. 전부 v1.8 번들 내 존재 확인 후 import.
- **v1 원본 보존**: 파일 상단 Purpose 주석에 `// //! [Original Code]` 로 교체 사실 명시 + 원본 전체는 이 Vibe 로그 `⏱ 2026-04-16 17:20` 라운드 블록에 아카이브. 필요 시 `/dashboard/indoor` 같은 "실내 현장" 라우트 신설 시 재활용.
- **수정 파일**:
  - `src/pages/EmployeeLanding.jsx` — v1 Interior HUD(150줄) → v2 사무실 허브(약 600줄, 9개 서브 컴포넌트: `EmployeeHeader`/`WelcomeBanner`/`SummaryPill`/`QuickActionsSection`/`KPISection`/`KPICard`/`TodayScheduleSection`/`NotificationsSection`/`TeamAssignmentsSection`/`RecentActivitySection`/`SectionHeader`). 단일 파일 유지 — 외부 재사용 없는 로컬 컴포넌트.
  - `App.jsx` · `LandingHeader.jsx` — 변경 없음 (라우트 구조 유지).
- **반응형**:
  - Mobile(`<640px`): 헤더 프로필 이름 숨김(`hidden md:flex`), 배너 2단 수직, 퀵 액션 1열, KPI 1열, 일정/알림 1열 스택, 테이블 팀 컬럼 숨김.
  - Tablet(`md`): 퀵 액션 2열, KPI 2열, 팀 컬럼 노출, 일정/알림 여전히 1열(공간 확보).
  - Desktop(`lg+`): 퀵 액션 4열, KPI 4열, 일정/알림 2열.
- **잔여 한계**:
  - `MOCK_MONTHLY_KPI` · `MOCK_TODAY_SCHEDULE` · `MOCK_NOTIFICATIONS` · `MOCK_TEAM_MEMBERS` · `MOCK_RECENT_ACTIVITIES` 는 하드코딩 상수. 백엔드 API 연결 후 점진 교체(각 섹션이 독립적이라 부분 교체 가능).
  - `LIVE` KPI 는 persist 된 **현재 세션 단위 스냅샷** — 이번 달 누적은 BE 집계 필요.
  - 팀원 재배정 · 현장 관리는 권한 기반 API 가 필요해 SOON/placeholder 유지.

#### ⏱ 2026-04-16 17:22 | 프로세스 재정립 — 사전 작업(사무실) ↔ 세션(현장) 분리, Level 선택 → Load vs Scan
- **피드백**: 사용자가 "너 프로세스에 대한 이해와 순서 확립이 좀 필요하겠는걸?" 지적. 내가 L1/L2/L3 를 **세션 내부 선택지**로 오해하고 모두 `/session/level` 에서 선택하게 만들었던 부분을 교정. 실제 올바른 흐름:
  - **사무실 사전 작업 (`/employee/pre-work`)**: CAD(L1) 또는 평면도(L2) 를 **미리** 업로드해 Mock 3D 모델링까지 완료 → 결과물을 `preModelStore` 라이브러리에 저장
  - **현장 세션 (`/session/level`)**: 같은 현장 라벨로 진입하면 그 라벨에 매칭되는 **사전 모델 목록** 이 자동 노출되어 "Load" 선택 가능. 매칭이 없으면 **드론 자율비행 스캔(L3) 만** 가능 (fallback)
- **반영** (7 파일):
  - `store/preModelStore.js` (신규) — persist Zustand. `preModels: [{ id, siteName, level, fileName, fileSize, imageDataUrl, createdAt }]` 배열 + `addPreModel / removePreModel / listForSite / clear`. 세션과 완전 분리된 전역 자원
  - `store/sessionStore.js` (수정) — `modelSource: 'premodel' | 'drone' | null`, `loadedPreModelId` 필드 추가. `selectPreModel(preModel)` 액션: level + imageDataUrl + fileName 을 preModel 에서 복사 (BuildingMesh L2 텍스처 호환). `selectDroneScan()` 액션: level=3 + source='drone'. 기존 `setLevel` 이 두 필드도 함께 리셋하도록 갱신. persist partialize 에 새 필드 포함
  - `pages/employee/PreWork.jsx` (신규) — 사무실 톤(흰 배경 + blue accent) 유지. 3 단계: 현장 라벨 입력 → Level(L1 CAD / L2 평면도) 선택 → FileDropzone 업로드 → "모델링 시작" → 기존 `runMockModeling(level)` 7초 러너 재활용 → 완료 시 `preModelStore.addPreModel()` 호출. 하단에 **라이브러리 목록** 섹션 — 역순 정렬 + 삭제 버튼. "다른 도면 추가" 버튼으로 동일 페이지에서 연속 생성 가능
  - `pages/session/SessionLevel.jsx` (전면 재작성) — 기존 3-카드(L1/L2/L3) 구조 폐기. 신규 구조:
    - 상단 `사전 작업된 모델 — 매칭 N건` 섹션: `usePreModelStore.preModels.filter(siteName 매칭)` 결과를 카드 그리드로 노출. 매칭 없으면 "사전 모델이 없습니다 + `/employee/pre-work` 바로가기" 안내 박스
    - 하단 `실시간 스캔 (Fallback)` 섹션: 드론 자율비행 카드 항상 노출
    - `choice` 로컬 state 로 선택 추적(매칭 사전 모델 우선, 없으면 드론). "다음" 클릭 시 `selectPreModel(m)` 또는 `selectDroneScan()` 호출 후 `/session/modeling` 이동
  - `pages/session/SessionModeling.jsx` (재작성) — `modelSource` 기반 분기:
    - `premodel` 진입 시 `useEffect` 로 자동 로드 애니메이션 (2.5초, 4 스테이지: 메타 검증 → 메시 로드 → 텍스처 매핑 → 완료). `runMockModeling` 대신 로컬 `setTimeout` 으로 짧게 처리 — 이미 사무실에서 모델링 끝났으므로 "로드만" 연출
    - `drone` 진입 시 기존 "3D 시뮬레이션 시작" 버튼 + 11초 `runMockModeling(level=3)` 플로우 유지
    - 완료 후 1.8초 대기 → `/dashboard` 자동 이동 (기존과 동일)
  - `App.jsx` — `/employee/pre-work` 라우트 추가(`EmployeeLanding` 외 독립 페이지), `PreWork` import
  - `pages/EmployeeLanding.jsx` — `QUICK_ACTIONS` 의 `upload-drawing` 카드 `to: '/session/level'` → `to: '/employee/pre-work'` 수정 + 설명 문구 재작성
- **UX 경계 준수**: `project_ux_boundary_employee_vs_session` 메모리에 따라 `/employee/pre-work` 는 사무실 톤(흰 배경/blue accent/카드 레이아웃), 실시간 드론 HUD/현장 요소 미포함. `/session/*` 와 완전히 다른 레이어드 스타일 유지.
- **BuildingMesh 호환성**: 기존 L1/L2/L3 렌더 로직(치수 라벨 / 바닥 텍스처 / 포인트 클라우드)은 그대로 유지. `modelSource='premodel'` 경로는 sessionStore 가 preModel.level 을 복사하므로 BuildingMesh 에서 자연스럽게 L1/L2 분기가 돈다. L3 경로는 변함없이 point cloud.
- **검증**: 기존 Vite(port 5176) HMR 상에 7개 신규/수정 파일 curl 스캔 → 모두 OK, Pre-transform error 없음.
- **잔여 한계**:
  - `preModelStore` persist 쿼터: L2 이미지 base64 는 항목당 300KB~1MB 정도. 라이브러리에 10~15개 이상 쌓이면 localStorage 5MB 한계 위험 — 실제 운영에선 S3 업로드로 전환 필요
  - 현장 라벨 매칭이 **문자열 완전 일치 기반** — 오타 허용 X. 실제 운영에선 site_id 기반 FK 매칭으로 전환 필요 (현재는 DB 미연결 단계라 라벨을 식별자로 사용)
  - `/employee/pre-work` 에서 Mock 러너는 `sessionStore.startModeling` 이 아닌 로컬 `useRef` + `runMockModeling` 직접 호출 — 세션 state 오염 방지. 대신 progress state 는 컴포넌트 로컬(`useState`) 이므로 페이지 떠나면 날아감(진행 중 navigate 시 cancel 필요 — `useEffect` cleanup 으로 처리)
  - 드론 자율비행 경로는 `sessionStore.startModeling` 을 통해 기존 L3(11초) 그대로 — 변경 없음

#### ⏱ 2026-04-16 17:53 | 보고서 작성·조회 모듈 — 편집 테이블 + 공종 AI 제안 + Excel/PDF 내보내기 + 아카이브
- **피드백**: 사용자가 "보고서 작성·조회" 카드 구현 요청. 요구사항:
  1. 드론 탐지 하자 데이터를 **공종별**로 분류(이미지 + 장소 포함)
  2. Excel 파일로 출력, PDF 변환 가능
  3. 미리보기 + **편집**: false positive 삭제 / 드론 미탐 하자 수동 추가 / 재저장
  4. Claude AI 활용 가능?
  5. 직원 HUB(`/employee`) 와 현장(`/dashboard/report`) 양쪽에서 접근
- **사용자 확정 결정**:
  - Excel/PDF 는 **프론트엔드 생성** (부하 최소, 빠르고 정확)
  - 공종 분류는 **AI 자동 제안 + 수동 수정**
  - 아카이브는 **DB 저장이 이상적**이나 현재 미연결 → "나중에 교체만 하면 되는 구조" 로 작성
  - 편집 범위: 공종 / 심각도 / 조치 메모 / (장소는 area→label 일괄 매핑 편집)
- **Claude AI 적용 범위 판단**: 내레이션(요약·권장사항) 은 기존 `ReportPanel` + `POST /api/v1/report/generate` 재활용. 구조적 작업(Excel/PDF/편집 UI) 는 코드. 공종 자동 제안은 1차로 category_code 휴리스틱, 향후 Claude 엔드포인트로 교체 가능한 구조로 추상화.
- **구현** (의존성 2개 + 신규 14 파일 + 수정 4 파일):
  - **의존성**: `npm i xlsx @react-pdf/renderer` (MIT, 무료). `xlsx` 는 1 high-severity CVE 존재 보고되지만 데모용은 수용, 실제 운영 전 `@e965/xlsx` 등 대안 검토 권장.
  - **신규 상수**: `constants/trades.js` — TRADES 12종(골조/도배/도장/타일/목공/마루·바닥재/창호/방수/단열/설비/전기/기타) + `CATEGORY_TRADE_MAP` (A-01..E-02 → 공종 1차 매핑) + `DEFAULT_LOCATION_MAP` (A=거실 / B=공용주방 / C=방1 / D=방2 / E=방3) + `suggestTradeFromCode(code)` 휴리스틱 헬퍼
  - **신규 API 추상화**: `api/reportsApi.js` — `listReports / getReport / createReport / updateReport / deleteReport / clearAllReports`. 모두 async, `await simulateLatency()` 로 네트워크 지연 흉내. 내부는 localStorage(`drone-inspect-reports-archive` 키). **백엔드 연결 시 이 파일만 `fetch()` 호출로 교체하면 호출부 변경 0**. 파일 상단에 예상 백엔드 엔드포인트(`GET /api/v1/reports` 등) + 리포트 스키마(camelCase→snake_case 매핑 포함) 주석
  - **신규 store**: `store/reportsStore.js` — Zustand (persist 없음: SoT 는 reportsApi 가 관리). `fetchAll / fetchOne / create / update / remove / clear` 액션
  - **기존 API 확장**: `api/reportApi.js` 에 `suggestTrades(defects)` 추가 — 현재 `suggestTradeFromCode` 휴리스틱 + `confidence: 0.65` 반환. 주석에 향후 `POST /report/suggest-trades` Claude 호출로 교체 예정 기록
  - **신규 UI 컴포넌트** (`components/report/`):
    - `TradeSelect.jsx` — 공종 드롭다운. value === suggested 일 때 `<Sparkles />` + "AI" 뱃지 노출
    - `LocationMapEditor.jsx` — area(A~E) → 장소 라벨 일괄 편집 모달. 저장 시 onSave(newMap) → 부모가 모든 defect 의 location_label 재계산
    - `AddDefectDialog.jsx` — 수동 하자 추가 모달. 유형명/area/공종/심각도/조치메모/이미지(선택) + `is_manual: true` 플래그
    - `DefectEditRow.jsx` — 편집 테이블 행. 썸네일 / 유형명+수동뱃지 / 공종(TradeSelect) / 장소(read-only, 매핑 편집은 상단) / 심각도(셀 내부 select) / 조치메모(인라인 input) / 검증·삭제 버튼
    - `ExcelExportButton.jsx` — SheetJS 기반. 2 시트 (요약 + 하자목록), 컬럼 너비 힌트 `!cols`, 파일명 `YYYYMMDD_현장명_하자리포트.xlsx`
    - `PdfExportButton.jsx` — `@react-pdf/renderer`. Noto Sans KR 폰트 CDN 등록(한글 지원), 요약 헤더 + 공종별 그룹 + 하자별 썸네일(base64 Image) + 심각도 뱃지 + 조치메모 + 하단 고정 푸터. A4 세로
    - `ReportEditor.jsx` — 메인 편집기. 툴바(카운터/AI 뱃지 + 장소 매핑 편집 + 하자 추가 + Excel/PDF) + 공종별 접이식 그룹 테이블. 진입 시 미할당 하자에 AI 공종 제안 배치 주입. `variant: 'modal' | 'page'` 로 스크롤 처리 분기
  - **신규 페이지** (`pages/employee/`):
    - `ReportsList.jsx` (`/employee/reports`) — 아카이브 테이블(현장/운용자/일자/하자 요약/상태/열기·삭제). 빈 상태 UI + 하단 DB 연결 안내 블록
    - `ReportDetail.jsx` (`/employee/reports/:id`) — 메타 요약 + ReportEditor(page variant). 편집 시 **500ms debounce** 후 `reportsStore.update` 자동 저장. "초안 ↔ 발행" 토글 버튼. 헤더에 저장 인디케이터
  - **기존 수정**: `ReportModal.jsx` v2 전면 재작성. 기존 "세션 요약 + ReportPanel" → **탭 전환 UI** (편집 탭 / AI 내레이션 탭). 편집 탭에 ReportEditor 삽입. 하단에 **아카이브 저장** 버튼 추가 → `reportsStore.create` 호출 → 저장 후 "사무실에서 열기" 버튼으로 전환되어 `/employee/reports/:id` 이동 가능. defectStore 변경 시 draft.defects 에 id 기준 merge(편집된 건은 유지, 새 수신은 AI 제안 공종으로 자동 추가)
  - **라우트 + 링크**: `App.jsx` 에 `/employee/reports` + `/employee/reports/:id` 추가. `EmployeeLanding.jsx` 의 `write-report` 카드 `to: '/dashboard/report'` → `to: '/employee/reports'` 수정
- **검증**: 기존 Vite(5176) HMR 상에 16개 신규/수정 파일 curl 스캔 → 모두 OK, `xlsx`·`@react-pdf/renderer` deps 도 Vite 최적화 경로 200 응답
- **두 진입점 동작**:
  - **현장 즉석**: 비행 종료 → ReportModal 편집 탭에서 공종 AI 제안 확인 → 수정/추가 → Excel/PDF 내보내기 + 아카이브 저장 → "사무실에서 열기" 로 `/employee/reports/:id` 진입
  - **사무실**: `/employee` → "보고서 작성·조회" 카드 → `/employee/reports` 목록 → 행 클릭 → `/employee/reports/:id` 에서 재편집 + 재발행
- **백엔드 연결 시 리팩토링 포인트**:
  1. `api/reportsApi.js` 각 함수 body → `fetch()` 호출로 교체 (지연 시뮬레이션 `simulateLatency` 제거)
  2. `api/reportApi.js` 의 `suggestTrades` → `POST /api/v1/report/suggest-trades` 배치 호출로 교체 (현재 휴리스틱은 백엔드 실패 시 fallback 으로 보존 가능)
  3. localStorage 키(`drone-inspect-reports-archive`) 는 마이그레이션 스크립트로 DB 로 1회 업로드 후 제거
  4. 이미지 base64 → S3 URL 참조로 전환 (쿼터 문제 해결 + PDF 생성 속도 향상)
- **잔여 한계**:
  - 공종 AI 제안은 현재 **카테고리 코드 매핑 휴리스틱** — 실제 이미지 기반 추론 아님. Claude 엔드포인트 붙이면 `image + defect_type + area` 종합 분석 가능
  - PDF 한글 폰트는 CDN(`jsdelivr`) 의존 — 오프라인 환경에선 Helvetica fallback 으로 한글 깨짐. 향후 `public/fonts/` 에 NotoSansKR .ttf 번들 권장
  - xlsx 패키지에 alleged CVE(prototype pollution) — 데모용은 허용하나 운영 배포 전 `@e965/xlsx` 또는 `exceljs` 로 교체 검토
  - 리포트 편집 중 브라우저 새로고침 시 **저장되지 않은 draft 는 유실** (ReportModal) — ReportDetail 은 debounce 자동 저장이라 안전. 필요 시 ReportModal 도 같은 패턴 적용 가능
  - `/dashboard/report` ReportModal 에서 defectStore 가 실시간 업데이트 → draft.defects merge 로직 있지만, 복잡한 편집 중 새 하자 도착 시 사용자 혼란 가능 — 향후 "미션 종료 시점에 스냅샷 고정" 옵션 추가 고려

#### ⏱ 2026-04-16 18:06 | 리포트 편집기 — area/location 개념 분리 + 공종 직접 입력 + 시각 폴리시
- **피드백** (3가지):
  1. UI 가 너무 "AI 로 만든 듯한" 톤 — 편집 모달이 일반 폼 느낌이라 브랜드 정체성 약함
  2. 영역 드롭다운에 `A · 구조·기하학 (거실)` 처럼 **기술 영역 + 방 이름** 이 한꺼번에 나오는 게 맞는지? (= 버그 지적)
  3. 공종 드롭다운에 **"직접 입력"** 옵션 추가해 애매한 케이스 자유 입력 허용
- **판단 및 설명**:
  - 2번은 명백한 **데이터 모델 버그**. `area`(A~E, 기술 분류 = 구조·기하학/단열·방수/마감재/바닥/창호)와 `location`(거실/방1/공용주방 등 물리 공간)은 완전히 다른 개념인데 `DEFAULT_LOCATION_MAP` 으로 1:1 매핑해두어 한 드롭다운에 혼용됐음. 같은 area 에도 거실일 수도 방1일 수도 있는데 매핑이 강제되어 부정확했음.
- **반영** (9 파일 리팩토링):
  - `constants/trades.js` — `DEFAULT_LOCATION_MAP` 삭제. 대체:
    - `LOCATION_PRESETS = ['거실','공용주방','방1','방2','방3','욕실','발코니','현관']` (datalist 제안용)
    - `inferInitialLocation(area)` — 신규 수신 하자에 대한 초기 추정값만 반환(area 와 무관한 독립 필드로 이후 자유 편집). 향후 3D 좌표 + room segmentation 으로 교체 가능
  - `components/report/TradeSelect.jsx` — "직접 입력" 옵션 추가. 고정 목록 외 값이면 자동으로 text input 모드 전환, ↶ 버튼으로 목록 모드 복귀. 기존 AI 뱃지 로직 유지
  - `components/report/AddDefectDialog.jsx` v2 전면 재작성:
    - **영역(area)** 과 **장소(location)** 를 완전히 분리된 필드로 노출. 영역 드롭다운은 `A · 구조·기하학` (부연 없음), 장소는 text input + datalist(LOCATION_PRESETS) 자유 입력
    - 공종 드롭다운에 "직접 입력" 옵션 추가 (TradeSelect 와 동일 패턴)
    - 시각 폴리시: 헤더 `bg-gradient-to-br from-blue-50 to-white` + 아이콘 박스 `shadow-md shadow-blue-600/30`, 각 필드를 `FieldBlock` 컴포넌트로 감싸 아이콘 + 레이블 + 힌트 일관 적용, 심각도 버튼 `activeCls` 에 컬러별 glow shadow, 이미지 dropzone 은 `border-dashed` hover 시 blue-50 배경, 전체 radius `rounded-2xl` + `border-t-4 border-blue-600` 악센트
  - `components/report/LocationMapEditor.jsx` v2 — 기존 "area → 방 매핑" 구조 완전 폐기. 새 역할: **현재 리포트에 실제 사용된 고유 `location` 값을 나열하고 bulk rename**. 각 행 `[기존 값] → [변경 input] [건수]`, 저장 시 `{oldLabel: newLabel}` 맵을 부모에 전달하고 부모가 모든 defect 의 location 일괄 갱신. 사용자 원 요청("방3 → 방1 전체 일괄 변경")에 정확히 매칭
  - `components/report/DefectEditRow.jsx` — location 을 **read-only 라벨에서 editable text input 으로 변경**(datalist 프리셋 연결), area 는 작은 색상 chip 으로 축약 표시(읽기 전용)
  - `components/report/ReportEditor.jsx` — `locationMap` 관련 로직 제거. `LOCATION_PRESETS` + 현재 사용 중인 고유 location 값을 합친 배열을 `<datalist id="report-editor-location-presets">` 로 테이블 상단에 1회 렌더, 모든 하자 행의 location input 이 이 id 공유. `applyLocationRename(mapping)` 액션으로 bulk rename 수행. 공종 그룹 헤더에 `bg-gradient-to-r from-blue-50/80` + hover 전이 폴리시
  - `components/report/ReportModal.jsx` — `toEditableDefects` 에서 `location_label` → `location` 필드 사용, `location_map` 저장 제거, `inferInitialLocation` import 로 교체
  - `components/report/ExcelExportButton.jsx` — Excel 컬럼 헤더 `장소` 는 이제 `d.location` 우선 참조(v1 호환 위해 `location_label` 폴백), area 컬럼은 `영역코드` 로 명확화
  - `components/report/PdfExportButton.jsx` — PDF 메타 pill 에 `장소: ...` 와 `영역 A` 를 별도 표시(기존엔 area 가 location fallback 이었음)
- **시각 폴리시 차이점 (before → after)**:
  - 모달 헤더: 단색 → 그라데이션 배경 + 악센트 border-top
  - 드롭다운: 기본 select → FieldBlock(아이콘+레이블+힌트) 래퍼
  - 심각도 버튼: 플랫 컬러 → 선택 시 glow shadow + 톤 강조
  - 공종 그룹 헤더: 단색 파스텔 → 좌측에서 우측으로 fading gradient + hover 짙어짐
- **검증**: Vite(5176) HMR transform — 9개 수정 파일 모두 OK, 컴파일 에러 0
- **잔여 한계 / 향후**:
  - 기존 아카이브에 저장된 리포트(v1, `location_label`/`location_map` 필드) 는 backward-compat 으로 읽기 시 자동 마이그레이션됨(`d.location ?? d.location_label`). 실제 운영 전 migration 스크립트로 1회 정리 권장
  - 시각 폴리시는 편집 모달·편집기 테이블까지만 적용. 대시보드 HUD(어두운 톤)는 별도 디자인 정체성이라 건드리지 않음 — 추후 사용자 피드백에 따라 폴리시 범위 확장 가능

#### ⏱ 2026-04-16 18:16 | 대시보드 HUD 폴리시 — "AI-스럽다" 재지적 반영
- **피드백**: `/dashboard` UI 가 여전히 AI-제너릭 느낌이 강하다. 특히 거대한 camera-off 아이콘이 메인 공간을 허전하게 채우고, 모든 패널이 동일 카드 스타일(`bg-slate-900/80 + border-slate-700/60`)로 찍혀나온 듯한 인상.
- **분석**: 대시보드 HUD 가 "기본 Tailwind 스켈레톤" 수준에 머물러 있어 브랜드/디자인 정체성 부재. 특히 **빈 상태** (No Signal / 탐지된 하자 없음) 가 제네릭 플레이스홀더라 전체 화면이 비어있어 보임.
- **반영** (5 파일 폴리시):
  - `components/video/LiveVideoFeed.jsx` — fill 모드 No-Signal 전면 재디자인:
    - 거대한 📷 이모지 삭제 → **레이더 UI** (동심원 3개 + crosshair + 회전 스캔 라인 + 중앙 펄스 점)
    - 상태 텍스트 계층화: "Awaiting Signal"(accent mono + 도트) → "RGB 스트림 대기 중"(한글 메인) → "CAM · RGB · /api/v1/stream/rgb"(경로 mono)
    - 하단에 "ENCODER IDLE · WS PENDING" tier 추가 → 시스템 상태감 부여
    - 재연결 버튼 `border-b border-accent-500/30` underline-only 스타일로 교체 (기존 "text-brand-500 hover:underline" 은 hover 전 밋밋했음)
    - PIP 용 컴팩트 No-Signal 도 분리 (작은 📷 + 소형 텍스트)
  - `pages/Dashboard.jsx`:
    - **도트 그리드 배경** (radial-gradient dot pattern 24px) 전역 `inset-0` 으로 추가 → 검은 공백 해소
    - **상단 accent 글로우** (`bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(16,185,129,0.06),...)`) → HUD 상단에 은은한 emerald 발광
    - **HUD 코너 브래킷** — LIVE 피드 16:9 박스 네 모서리에 L자 브래킷(5x5, `border-accent-400/60`) 배치. 신규 `<CornerBracket position="tl|tr|bl|br" />` 컴포넌트
    - 피드 박스에 `ring-1 ring-accent-500/5` 추가 → 외곽선 깊이
  - `components/defects/DefectPanel.jsx` — 빈 상태 업그레이드:
    - 기존 "✅ + 탐지된 하자 없음" → **펄스 링 3겹(animate-ping) + 중앙 accent 점** + "Scanning · Idle" mono 레이블 + "드론 스트림에서 수신 대기 중" 서브
    - 필터 미스매치 시 "Filter Mismatch · 전체 N건 중 0건" 로 구분 메시지
  - `components/dashboard/DronesPanel.jsx` — 전면 리디자인:
    - 📷 🌡️ 이모지 → `Camera` / `Thermometer` lucide 아이콘 (헤더에도 `Radio` 아이콘)
    - 신규 `<SignalBars strength={1..4} active />` — 4-segment 신호 세기 바(데모용 각 드론에 fixed strength)
    - 선택된 카드 상단에 발광 gradient 라인 (`bg-gradient-to-r from-transparent via-accent-400 to-transparent`)
    - 헤더 `LINK · OK` 에 pulse 도트 + 상태 색상 분기(connected/disconnected)
    - 배터리 섹션을 "BATTERY 라벨 + 퍼센트" 2행 구조로 분리, low 시 붉은색 경고 + 선택 시 accent glow
    - 헤더 카운터 `2` → `bg-slate-800/60 border rounded` pill
  - `components/map3d/BuildingScene.jsx` — 범례 pill 리디자인:
    - 크기 축소 (`text-[10px] → text-[9px]`, `gap-3 → gap-2`, padding 압축)
    - HIGH/MED/LOW 사이에 `w-px h-2` divider 삽입 → HUD 장식
    - 마커 수 표시 앞에도 divider — "3-segment + count" 시각적 리듬 생성
    - `shadow-md` 추가
  - `pages/Dashboard.jsx` 미니맵 카드 헤더 폴리시:
    - 헤더 배경 `bg-gradient-to-r from-accent-500/5 to-transparent`
    - 좌측에 `w-0.5 h-4 bg-accent-400` 세로 바(accent rail)
    - "3D Mini Map" 다음에 `FLOOR · SIM` pill
    - 우측에 `● LIVE` 상태 도트 + pulse
- **시각 비교**:
  - Before: 거대한 camera-off 아이콘이 중앙을 채움, 모든 패널이 동일 grey card, 빈 상태는 이모지 단발
  - After: 레이더 스캔 + crosshair + context tiers, 선택된 드론에 발광, 미니맵 accent rail, 배경에 도트 그리드 + 상단 glow, 피드 박스에 HUD 코너 브래킷 → "관제실 콘솔" 톤
- **검증**: Vite(5176) HMR — 5개 폴리시 파일 전부 transform 성공, 컴파일 에러 0. lucide 신규 아이콘(Camera / Thermometer / Radio) 번들 존재 확인
- **잔여**: 실제 드론 스트림/텔레메트리 연결 전엔 여전히 "대기 상태" 가 주로 보일 것 — 그래도 그 대기 상태 자체가 폴리시 됨. WS 연결 후 실제 데이터 흐르면 더 "live" 해 보임

---

### 5️⃣ UI "AI틱한 느낌" 제거 리팩토링

#### ⏱ 2026-04-17 — 전체 서비스 페이지 디자인 톤 전면 개편

- **피드백**: 랜딩페이지는 깔끔한데, 서비스 진입 후(세션 셋업, 레벨 선택, 모델링, 대시보드) UI가 "AI가 만들어준 게 너무 티난다." 네이비 배경 + 네온그린 액센트 + HUD 장식 + 모노스페이스 남발이 주요 원인.

#### ⏱ 2026-04-17 — Phase 1: AI 패턴 제거 (장식/타이포 정리)
- **반영** (11파일):
  - `tailwind.config.js` — `pulse-fast` 커스텀 애니메이션 삭제
  - `index.css` — `.badge-active/.badge-idle`에서 `uppercase tracking-wider` 제거, `.card-accent` `shadow-2xl` → `shadow-lg`
  - `SessionSetup.jsx` — `SectionLabel` 컴포넌트 좌우 장식선 삭제 → 단순 텍스트, `Field` 라벨 `uppercase tracking-wider` 제거, 입력 `bg-slate-950/60` → `bg-slate-800/80`, 컨테이너 `backdrop-blur-md` 삭제
  - `SessionLevel.jsx` — 선택 카드 네온 글로우 `shadow-[0_0_18px_rgba(...)]` → `ring-2 ring-accent-500/30`, 섹션 헤더 `uppercase tracking-[0.15em]` 삭제, 레벨 뱃지 `font-mono` 삭제
  - `SessionModeling.jsx` — 컨테이너 `backdrop-blur-md` 삭제, 영문 라벨 한글화
  - `ModelingProgress.jsx` — 프로그레스 바 글로우 삭제, 하단 상태 `font-mono uppercase tracking-wider` 삭제
  - `Dashboard.jsx` — **도트 그리드 배경 삭제**, **비네팅 글로우 삭제**, **CornerBracket(HUD L자 모서리) 컴포넌트 및 4개 호출 삭제**, 피드 뱃지 `tracking-wider` 삭제 + "LIVE" 통합, 미니맵 헤더 단순화 (`tracking-[0.2em]` 삭제, "FLOOR·SIM" pill 삭제), AI 패널 `uppercase` 삭제 + "Real-time detection" → "실시간 하자 탐지"
  - `DashboardTopBar.jsx` — 모든 pill `backdrop-blur-md` → `backdrop-blur-sm`, `shadow-lg` → `shadow-md`, 세션 라벨 `font-mono uppercase tracking-wider` 삭제
  - `DronesPanel.jsx` — 패널 `shadow-2xl` → `shadow-lg`, `ring-1` 삭제, 헤더 `tracking-[0.25em] uppercase` 삭제, 선택 카드 글로우 삭제 → `ring-2`, 상단 그라디언트 라인 → 솔리드, ACTIVE/IDLE 대소문자 정상화, 배터리 바 글로우 삭제
  - `DefectPanel.jsx` — 3중 동심원 펄스 링 삭제 → `Search` 아이콘 + 회색 원 교체, `uppercase tracking-wider` 삭제
  - `Sidebar.jsx`, `DroneStatusCard.jsx`, `LevelCard.jsx` — 하드코딩 에메랄드 `rgba(16,185,129,...)` 글로우 3곳 삭제

#### ⏱ 2026-04-17 — Phase 2: 컬러 팔레트 전면 교체
- **피드백**: "네이비 배경 + 네온그린 조합이 AI 대시보드의 상징"
- **반영**:
  - `tailwind.config.js` — 배경 네이비(`#0b1120`) → 중성 다크 그레이(`#121212`), surface(`#111827` → `#1a1a1a`), panel(`#1f2937` → `#262626`), border(`#334155` → `#333333`)
  - `tailwind.config.js` — 액센트 에메랄드 → sky blue → **최종 indigo(`#6366f1`)** (사용자 피드백 3라운드: 에메랄드→sky blue→indigo)
  - 16개 서비스 파일 — `bg-slate-*` / `border-slate-*`(파란 틴트) → `bg-neutral-*` / `border-neutral-*`(순수 회색) 일괄 교체
  - 8개 파일 — 버튼 텍스트 `text-slate-900` → `text-white` (블루/인디고 배경 가독성)
  - `LiveVideoFeed.jsx` — No Signal 격자 하드코딩 rgba 에메랄드 → 인디고로 동기화
  - `backend/app/services/camera.py` — 더미 프레임 "No Signal" 텍스트 초록(`0,255,0`) → 차분한 회색(`80,80,80`)

#### ⏱ 2026-04-17 — Phase 3: 세션 페이지 라이트 테마 전환
- **피드백**: "배경을 흰색으로 바꿀까 ... 로그인/회원가입처럼" → 세션 페이지만 라이트
- **반영** (5파일):
  - `SessionLayout.jsx` — `bg-dashboard-bg text-white` → `bg-gray-50 text-gray-800`, 헤더 `bg-white border-gray-200 shadow-sm`, 로고 `logoWhite` → `logoDark`, 진척도 바 다크→라이트 색상 전환
  - `SessionSetup.jsx` — 폼 `bg-white border-gray-200`, 입력 `bg-gray-50 border-gray-300 text-gray-800`, 라벨 `text-gray-600`, 에러 `bg-red-50 text-red-600`
  - `SessionLevel.jsx` — 카드 `bg-white border-gray-200`, 선택 시 `bg-accent-50 border-accent-500`, 빈 상태 `bg-gray-50`, 이전 버튼 `border-gray-300 text-gray-600`
  - `SessionModeling.jsx` — 동일 라이트 톤, 안내 박스 `bg-gray-50`, 프로그레스 `lightMode` prop 전달
  - `ModelingProgress.jsx` — `lightMode` prop 추가: 프로그레스 바 `bg-gray-200`, 텍스트 `text-gray-600`

#### ⏱ 2026-04-17 — Phase 4: Start Mission 버튼 컬러 분리
- **피드백**: Start Mission이 액센트와 같은 색이면 구분이 안 됨
- **반영**: `MissionControl.jsx` — Start Mission `bg-accent-500` → `bg-emerald-500` (초록=시작, 빨강=종료)

- **검증**: `vite build` 성공 (에러 0). 세션 플로우 3단계 + 대시보드 전체 브라우저 확인
- **시각 비교**:
  - Before: 네이비 배경 + 네온그린 + HUD 코너 + 도트그리드 + 모노스페이스/트래킹 남발 → "AI 해커 터미널"
  - After: 세션=흰 배경 클린 폼, 대시보드=중성 다크그레이 + 인디고 + 초록 Start Mission → 일반 SaaS 제품 톤

---

### 7️⃣ 직원 허브 기능 확장 — 현장 관리 + 분석·보고서 모듈 (2026-04-20)

#### ⏱ 2026-04-20 09:37 | 현장 관리 모듈 신규 구축 (`/employee/sites`)
- **피드백**: `EmployeeLanding` 퀵 액션 "현장 관리" 카드가 `disabled: true` 상태로 SOON 처리되어 있었음. 현장 CRUD + 상세 탭 UI 를 완성해달라는 요청.
- **설계 결정**:
  - 저장소 SoT: `api/sitesApi.js` 내 localStorage(`drone-inspect-sites-v2` 키). 백엔드 연결 시 이 파일 body 만 `fetch()` 로 교체하면 호출부 변경 없음.
  - 시드 데이터 3건(B2B 진행 중 / B2B 예정 / B2C 완료)을 `sitesApi.js` 에 내장 — 첫 진입 시 localStorage 가 빈 경우 자동 주입.
  - 현장 상태 4종(`active / pending / completed / cancelled`) + 건물 유형 7종 + 점검 구분 4종 + 의뢰 유형(`B2B / B2C`) 를 `constants/siteTypes.js` 에 중앙화.
- **신규 파일** (7개):
  - `constants/siteTypes.js` — `BUILDING_TYPES / SITE_STATUS / INSPECTION_TYPES / CLIENT_TYPES` 배열 + `STATUS_MAP / CLIENT_TYPE_MAP` 룩업 객체
  - `api/sitesApi.js` — `listSites / getSite / createSite / updateSite / deleteSite` (async, simulateLatency 포함). 예상 백엔드 엔드포인트(`GET /api/v1/sites` 등) 주석으로 명시
  - `store/sitesStore.js` — Zustand (persist 없음, SoT 는 sitesApi). `fetchAll / fetchOne / create / update / remove / clear` 액션
  - `pages/employee/SiteManagement.jsx` — `/employee/sites`. 히어로 배너 + KPI 요약(전체/진행중/예정/완료) + 검색 + 상태 필터 + 현장 테이블. 행 클릭 → 상세, 편집/삭제 액션 인라인. 상태별 컬러 뱃지(`STATUS_CONFIG`) + 건물유형 아이콘 뱃지(`BUILDING_BADGE`).
  - `pages/employee/SiteDetail.jsx` — `/employee/sites/:id`. 히어로 배너 + 기본 정보 그리드(주소/의뢰사/연락처/점검구분/기간) + 미니 KPI(점검건수/면적/세대수) + 탭 3개(보고서/도면·3D모델/촬영영상). 상단 "점검 세션 시작" 버튼 → `/session/setup` 이동.
  - `components/site/SiteFormModal.jsx` — 현장 등록/수정 모달. 현장명/건물유형/주소/점검구분/의뢰유형/의뢰사명/연락처/계약기간 필드. 신규: `createSite`, 수정: `updateSite` 분기.
  - `components/site/SiteReportsTab.jsx` — 현장 연결 보고서 목록. `useReportsStore.fetchAll()` 후 `siteName 매칭` 필터. 아카이브 없는 경우 빈 상태 안내.
  - `components/site/SiteModelsTab.jsx` — 이 현장에서 사전 작업된 모델 목록(`usePreModelStore.listForSite(siteName)`). 삭제 + "세션 로드" 버튼으로 `/session/level` 이동 시 현장 컨텍스트 연동.
  - `components/site/SiteRecordingsTab.jsx` — 현장 촬영영상 목록(현재 seed 기준 recordings[] 배열). 업로드 placeholder + 영상 메타(파일명/크기/날짜) 표시.
- **수정 파일**:
  - `App.jsx` — `/employee/sites` + `/employee/sites/:id` 라우트 추가, `SiteManagement` / `SiteDetail` import
  - `pages/EmployeeLanding.jsx` — `QUICK_ACTIONS` 의 `manage-sites` 카드 `disabled: true` 제거 + `to: '/employee/sites'` 활성화
- **잔여 한계**:
  - 현장-세션 연결은 **현장명 문자열 매칭** 기반 — 오타 허용 X. 운영 시 `site_id` FK 기반으로 전환 필요
  - `recordings[]` 는 seed 빈 배열이므로 촬영영상 탭은 항상 빈 상태. 실제 업로드 기능은 백엔드(S3) 연결 후 구현 예정

#### ⏱ 2026-04-20 09:37 | 인증 스토어 신규 (`authStore.js`)
- **피드백**: 백엔드 JWT 연동 준비. 지금 당장 사용하진 않지만 향후 로그인 처리를 위해 빈 껍데기라도 마련해달라.
- **반영**:
  - `store/authStore.js` 신규. `token / user / isAuthenticated` 상태. `setAuth(token, user)` — localStorage(`access_token` / `user` 키) 동기 저장 + 스토어 업데이트. `clearAuth()` — 두 키 제거 + 초기화. 토큰은 store 생성 시 localStorage 에서 즉시 복원 → 새로고침 후 인증 유지.
  - 현재 컴포넌트에서는 미사용 — `Login.jsx`/`OAuthCallback.jsx` 에서 추후 연결 예정.

#### ⏱ 2026-04-20 10:18 | 분석·보고서 허브 신규 (`/employee/analytics`)
- **피드백**: `EmployeeLanding` 퀵 액션에 "분석·보고서" 카드가 있었으나 페이지 없음. 경향보고서 + 주간업무보고서 두 탭 형태로 구현해달라.
- **설계 결정**:
  - 두 보고서 모두 **인쇄/납품 품질** 기준 — PT용 레이아웃, 체계적 섹션 구성.
  - 데이터는 `data/mockTrendData.js` 상수 기반. 백엔드 연결 시 데이터 소스만 교체.
  - Recharts(`BarChart / LineChart / PieChart`) 재사용 — 이미 `package.json` 에 포함.
- **신규 파일** (3개):
  - `pages/employee/Analytics.jsx` — `/employee/analytics`. 상단 헤더(← 직원 허브 / 타이틀 / 인쇄 버튼) + 탭 UI(경향보고서 / 주간업무보고서). `window.print()` 로 브라우저 인쇄 지원.
  - `components/analytics/TrendReport.jsx` — 경향보고서. 7개 섹션: ① 보고서 개요 + 핵심 KPI ② 월별 하자 발생 추이(꺾은선) ③ 하자 유형별 분류(수평 막대 — 파레토) ④ 심각도 분포(도넛) + 조치 현황(도넛) ⑤ 시행사별 하자 패턴(스택 막대) ⑥ 대표 하자 사례 ⑦ AI 종합 분석 및 권고사항.
  - `components/analytics/WeeklyReport.jsx` — 주간업무보고서. 6개 섹션: ① 보고서 헤더(주차/일자/보고자) ② 금주 핵심 요약(AI 3줄 요약) ③ 주간 KPI ④ 전주 실적(계획 vs 실적 대비표) ⑤ 금주 계획(업무항목/담당자/기한/우선순위) ⑥ 현안 및 리스크(신호등 체계).
  - `data/mockTrendData.js` — `MONTHLY_TREND / DEFECT_BY_CATEGORY / SEVERITY_DIST / ACTION_STATUS / BUILDER_PATTERN / SAMPLE_DEFECTS / AI_TREND_COMMENTARY / AREA_LABELS / AREA_COLORS` + 주간보고 관련 상수(`getWeekRange / getLastWeekRange` 등). 백엔드 연결 시 이 파일 상수를 API 훅으로 교체.
- **수정 파일**:
  - `App.jsx` — `/employee/analytics` 라우트 추가, `Analytics` import
  - `pages/EmployeeLanding.jsx` — `analytics` 카드 `to: '/employee/analytics'` 활성화 (기존 disabled 상태에서 전환)

---

### 8️⃣ 랜딩페이지 섹션 추가 — 도입 사례 슬라이드쇼 + Dual CTA (2026-04-18, @youminsu0523)

#### ⏱ 2026-04-18 | 도입 사례 카드 이미지 슬라이드쇼 도입
- **피드백**: CasesSection 3개 카드(B2B 건설사 / 정밀진단 / B2C 세대주)의 상단 이미지 영역이 정적이었음. 실제 이미지 자산(b2b/diagnosis/b2c 폴더)을 받아 카드별로 자동 크로스페이드 슬라이드쇼로 교체 요청.
- **자산 추가**: `src/assets/cta/b2b/b2b_01~05.png` (5장), `src/assets/cta/b2c/b2c_01~04.png` (4장). diagnosis 카드도 b2b 폴더 자산 공유.
- **신규 파일**:
  - `components/landing/CaseSlideshow.jsx` — `images[]` prop 을 받아 `interval`(ms) 간격으로 크로스페이드 슬라이드쇼 재생. 이미지가 1장 이하면 정적 렌더. `startDelay` prop 으로 카드별 시작 타이밍을 어긋나게 해 여러 카드가 동시에 페이드되지 않도록 스태거링. 하단 미니 점 인디케이터 포함. `opacity` + `transition duration-1000` CSS로 부드러운 크로스페이드. `useEffect` cleanup 에서 `clearTimeout + clearInterval` 처리해 메모리 누수 방지.
- **수정 파일**:
  - `components/landing/CasesSection.jsx` — `import.meta.glob`(b2b/b2c 폴더 이미지 자동 수집) + `CaseSlideshow` import. `CASE_CARDS` 각 항목에 `images / interval / startDelay` 필드 추가. 카드 상단 기존 static placeholder 를 `<CaseSlideshow ... />` 로 교체. 스태거 타이밍: B2B(0ms) / 정밀진단(1300ms) / B2C(2600ms).

#### ⏱ 2026-04-18 | B2B·B2C 가치 제안 Dual CTA 섹션 신설
- **피드백**: 랜딩 최하단에 B2B(건설사·점검업체) / B2C(세대주) 두 타겟에게 각각 서비스 가치를 어필하는 분할 CTA 섹션 추가 요청. 이미지 배경 + 체크리스트 형태.
- **신규 파일**:
  - `components/landing/DualCTASection.jsx` — 가로 2분할(모바일은 세로 스택). **좌측(B2B)**: `b2b_03.png` 배경 + 다크 오버레이(`bg-slate-900/60`), 체크리스트 3항목(단지 전체 이력 DB화 / 소규모 업체 대단지 관리 / 멀티 테넌시). **우측(B2C)**: `b2c_04.png` 배경 + 라이트 오버레이, 체크리스트 3항목(웹 기반 3D 뷰어 / 외벽 상태 직관 확인 / 좌표 기반 보수 트래킹). 배경 이미지에 `scale-110 blur-[1.5px] opacity-40` 적용해 텍스트 가독성 확보. `CheckList` 서브 컴포넌트로 DRY화.
- **수정 파일**:
  - `pages/Landing.jsx` — `DualCTASection` import + `<CasesSection />` 아래에 삽입. TODO Footer 주석은 유지.

---

### 9️⃣ 버튼 클릭 포커스 외곽선 제거 (2026-04-20, @unknownname-15)

#### ⏱ 2026-04-20 | 전역 버튼 focus ring 제거

- **피드백**: 모든 JSX 페이지에서 버튼을 클릭하면 외곽선(focus ring)이 표시됨. 제거 요청.
- **1차 조치**: `src/index.css`에 전역 스타일 추가.
  ```css
  button:focus,
  button:focus-visible {
    outline: none;
  }
  ```
- **추가 피드백**: Landing 페이지의 '직원 전용', '로그인', '도입 문의하기', '3D 리포트 샘플 보기', '서비스 도입 문의' 버튼은 여전히 외곽선 표시됨.
- **원인**: 해당 컴포넌트에 Tailwind 클래스 `focus:ring-2 focus:ring-*`가 인라인으로 명시돼 전역 CSS보다 우선 적용됨.
- **2차 조치**: 각 컴포넌트에서 `focus:ring-2 focus:ring-*` 클래스를 직접 제거.
- **수정 파일**:
  - `src/index.css` — `button:focus, button:focus-visible { outline: none; }` 전역 규칙 추가
  - `components/landing/LandingHeader.jsx` — 로고 링크, 네비 앵커, 직원 전용 링크, 로그인 링크, 도입 문의하기 버튼, 햄버거 버튼 총 6개소 `focus:ring-2 focus:ring-*` 제거
  - `components/landing/HeroSection.jsx` — '3D 리포트 샘플 보기', '서비스 도입 문의' 버튼 2개소 `focus:ring-2 focus:ring-*` 제거
- **유지 항목**: `ContactModal.jsx` input/textarea의 `focus:ring`은 폼 입력 UX용이므로 제거하지 않음.
- **스크린샷**: (focus ring 제거 전 상태 — 섹션 1️⃣2️⃣ 에서 접근성 이유로 복원)

---

### 🔟 모바일 햄버거 메뉴 추가 (2026-04-20, @unknownname-15)

#### ⏱ 2026-04-20 | LandingHeader 모바일 반응형 햄버거 메뉴

- **피드백**: 모바일 사이즈에서 '직원 전용', '로그인' 버튼이 보이지 않음. 햄버거 메뉴로 노출 요청.
- **프롬프트**:
  ```text
  "LandingHeader 페이지에서 모바일 최적화 사이즈로 들어가면 '직원 전용', '로그인' 버튼이 보이지 않게 돼.
  모바일 최적화 사이즈로 진입했을 때 우측 상단에 햄버거 라인을 만들고,
  그 안에 '직원 전용, 로그인, 도입 문의하기 메뉴를 넣어 줘.
  지금 디자인과 어울리게 하면서 아이콘은 remix icon에서 가져와 줘."
  ```
- **조치**:
  - `frontend/index.html` — Remix Icons CDN 링크 추가 (`remixicon@4.5.0`)
  - `components/landing/LandingHeader.jsx` — 햄버거 메뉴 구현
    - `md` 미만(모바일)에서만 보이는 햄버거 버튼 (`ri-menu-line` / `ri-close-line` 토글)
    - 드롭다운 3개 메뉴: `ri-shield-user-line` 직원 전용, `ri-login-box-line` 로그인, `ri-mail-send-line` 도입 문의하기
    - `isAtTop` 상태에 따라 슬레이트 다크 / 흰색 두 테마 대응
    - `mousedown` 이벤트로 외부 클릭 시 자동 닫힘 (`useRef` 활용)
    - 기존 데스크탑 버튼은 `hidden md:block` 유지
- **스크린샷**:
  - 모바일 히어로 + 햄버거 닫힌 상태:
    ![모바일 헤더 닫힌 상태](/screenshots/02_mobile_header_closed.png)
  - 모바일 햄버거 메뉴 열린 상태 (다크 테마):
    ![모바일 햄버거 열림 — 다크](/screenshots/03_mobile_hamburger_open.png)
  - 스크롤 후 흰 배경 + 햄버거 닫힌 상태:
    ![스크롤 후 모바일 헤더](/screenshots/08_mobile_scrolled_header.png)
  - 스크롤 후 햄버거 메뉴 열린 상태 (라이트 테마):
    ![스크롤 후 햄버거 열림 — 라이트](/screenshots/09_mobile_scrolled_menu_open.png)

---

### 1️⃣1️⃣ 뒤로가기 아이콘 통일 — Login / Signup / FindAccount (2026-04-20, @unknownname-15)

#### ⏱ 2026-04-20 | '메인화면으로..' / '로그인으로..' 텍스트 → Remix Icon 아이콘 교체

- **피드백**:
  - Login·Signup 우측 상단 '메인화면으로..' 텍스트를 `ri-corner-up-left-line` 아이콘으로 교체 요청
  - FindAccount '로그인으로..' 텍스트도 동일 아이콘으로 교체하되, 이전 화면으로 돌아가도록 변경 요청
- **조치**:
  - `pages/Login.jsx` — `메인화면으로..` Link → `ri-corner-up-left-line` 아이콘 Link (`to="/"`)
  - `pages/Signup.jsx` — 동일 교체 (`to="/"`)
  - `pages/FindAccount.jsx` — `로그인으로..` Link(`to="/login"`) → `button + navigate(-1)` 으로 변경
    - 고정 경로 대신 실제 히스토리 뒤로 이동 (진입 경로가 다양하므로 UX상 자연스러움)

```jsx
// //! [Original Code] 텍스트 링크 (Login, Signup 공통)
<Link to="/" className="... text-xs font-semibold text-gray-500 ...">메인화면으로..</Link>

// //* [Modified Code] Remix Icon 아이콘으로 통일
<Link to="/" aria-label="메인화면으로 이동" className="... text-gray-400 hover:text-blue-600 ...">
  <i className="ri-corner-up-left-line text-2xl" />
</Link>

// //! [Original Code] FindAccount — 로그인으로 고정 이동
<Link to="/login" className="...">로그인으로..</Link>

// //* [Modified Code] FindAccount — 이전 화면으로 히스토리 이동
<button type="button" onClick={() => navigate(-1)} aria-label="이전 화면으로 이동"
  className="... text-gray-400 hover:text-blue-600 ...">
  <i className="ri-corner-up-left-line text-2xl" />
</button>
```

- **스크린샷**:
  - 로그인 페이지 — 우측 상단 `↩` 뒤로가기 아이콘:
    ![로그인 뒤로가기 아이콘](/screenshots/04_login_back_icon.png)
  - 회원가입 페이지 — 우측 상단 `↩` 뒤로가기 아이콘:
    ![회원가입 뒤로가기 아이콘](/screenshots/05_signup_back_icon.png)
  - 계정 찾기 페이지 — 우측 상단 `↩` 뒤로가기 아이콘:
    ![계정찾기 뒤로가기 아이콘](/screenshots/06_find_account_back_icon.png)

---

### 1️⃣2️⃣ 삭제된 주석 · [Modified Code] 어노테이션 · focus:ring 접근성 복원 (2026-04-20, @youminsu0523)

#### ⏱ 2026-04-20 12:38 | SH 머지(#18)에서 유실된 코드 주석·어노테이션·접근성 클래스 복원

- **배경**: SH 브랜치 머지(PR #18, 커밋 `c95358c`) 과정에서 `LandingHeader.jsx`에 있던
  한글 주석, `[Original Code]`/`[Modified Code]` 변경이력 어노테이션,
  `focus:ring-2 focus:ring-*` 접근성 클래스가 일괄 삭제됨.
  `index.css`에 전역 `button:focus { outline: none }` 규칙이 추가되어
  키보드 포커스 링이 완전히 비활성화됨.
- **프롬프트**:
  ```text
  "기존에 팀원이 임의로 지운 주석이나 Modified Code 내용 다시 살려주면 좋겠어"
  ```
- **조치**:
  1. **`LandingHeader.jsx` 주석 복원 (12개소)**:
     - `// 네이비 원본(스크롤 후 흰 헤더용) + 흰색(최상단 어두운 히어로용)`
     - `// 네비 메뉴 항목`, `// 스크롤 전환 기준 (px)` 등 상수 설명
     - `// 최상단 여부`, `// 도입 문의 모달 open 여부` 상태 설명
     - `// 로고 클릭: 이미 "/" 경로면 ...` 함수 동작 설명
     - `// 초기 렌더 시 ...`, `// passive: true → ...` useEffect 설명
     - `// //* [Modified Code] C 전략: ...` 스타일 전략 어노테이션
     - `// 네비 링크 텍스트 색: ...`
  2. **`LandingHeader.jsx` [Modified Code]/[Original Code] 어노테이션 복원 (3개소)**:
     - `{/* //* [Modified Code] 상태에 따라 흰/네이비 로고 스왑 */}`
     - `{/* //! [Original Code] 직원 전용 버튼이 세션 셋업으로 직행하던 기존 동작 ... */}`
     - `{/* //* [Modified Code] 직원 전용 진입 랜딩(/employee)을 거치도록 변경 ... */}`
     - `{/* CTA: 최상단에서는 살짝 투명 처리, 스크롤 후엔 솔리드 */}`
  3. **`LandingHeader.jsx` `focus:ring` 클래스 복원 (5개소)**:
     - 로고 Link: `focus:ring-2 focus:ring-blue-400`
     - 네비 앵커: `focus:ring-2 focus:ring-blue-400`
     - 직원 전용 Link: `focus:ring-2 focus:ring-yellow-400`
     - 로그인 Link: `focus:ring-2 focus:ring-blue-400`
     - 도입 문의하기 CTA: `focus:ring-2 focus:ring-blue-400`
  4. **`HeroSection.jsx` `focus:ring` 클래스 복원 (2개소)**:
     - 3D 리포트 샘플 보기: `focus:ring-2 focus:ring-yellow-300`
     - 서비스 도입 문의: `focus:ring-2 focus:ring-white`
  5. **`index.css` 전역 포커스 제거 CSS 삭제**:
     - `button:focus, button:focus-visible { outline: none }` 삭제
     - 이유: 키보드 네비게이션 접근성(WCAG 2.1 — 2.4.7 Focus Visible) 위반
- **수정 파일**:
  - `components/landing/LandingHeader.jsx` — 주석 12개소 + 어노테이션 3개소 + focus:ring 5개소 복원
  - `components/landing/HeroSection.jsx` — focus:ring 2개소 복원
  - `src/index.css` — 전역 `button:focus { outline: none }` 규칙 제거
- **스크린샷**:
  - 데스크탑 헤더 — 키보드 Tab 포커스 시 focus ring 표시:
    ![데스크탑 헤더 focus ring](/screenshots/01_desktop_header_focus_ring.png)
  - 히어로 CTA 버튼 — focus ring 복원:
    ![히어로 CTA focus ring](/screenshots/07_hero_cta_focus_ring.png)
- **상태**: 반영 완료 — 팀원 추가 모바일 햄버거 메뉴 코드는 유지하면서 주석·접근성만 복원

### 1️⃣3️⃣ 도입 사례 슬라이드쇼 불규칙 전환 + 인디케이터 클릭 네비게이션 (2026-04-20, @youminsu0523)

#### ⏱ 2026-04-20 | 슬라이드쇼 전환 리듬 불규칙화 + 도트 클릭 이동

- **피드백**: CasesSection 3개 카드(B2B 8장 / 정밀진단 8장 / B2C 14장)의 이미지 슬라이드가 `setInterval` 고정 간격이라 기계적으로 규칙적임. 사진 수량이 서로 다르므로 불규칙적으로 넘어가게 해달라. 추가로 하단 도트 인디케이터를 클릭하면 해당 이미지로 즉시 이동할 수 있게 해달라.
- **분석**:
  - 기존 구현: `setInterval(interval)` — B2B/진단 4000ms 고정, B2C 3000ms 고정. `startDelay`(0/1300/2600ms)로 카드 간 시작만 스태거링.
  - git 이력 확인: `CaseSlideshow.jsx`와 `CasesSection.jsx` 모두 `ffa566b` 커밋 이후 수정 이력 없음. unknownName-15는 이 파일 미수정.
  - 노션 로그(04-18)에 기록된 초기 자산(`cta/b2b` 5장, `cta/b2c` 4장)과 실제 커밋 코드(`cases/` 폴더 8+8+14장)는 경로·수량 차이 존재 — 노션은 설계 단계 기록, 커밋은 최종 구현.
- **수정 파일**:
  - `components/landing/CaseSlideshow.jsx`:
    1. **불규칙 전환**: `setInterval` → 재귀 `setTimeout` 방식으로 교체. 매 전환마다 `interval × (0.7 ~ 1.3)` 범위의 랜덤 딜레이(jitter) 적용. 예: B2B(interval=4000)는 2800~5200ms 사이에서 매번 다른 간격으로 전환.
    2. **도트 클릭 네비게이션**: 하단 인디케이터를 `<span>` → `<button>`으로 교체. `goTo(i)` 핸들러가 현재 타이머를 `clearTimeout` 후 해당 인덱스로 즉시 이동, 이후 자동 전환 타이머 재시작.
    3. **타이머 관리**: `useRef`(`timerRef`, `cancelledRef`)로 타이머 ID와 취소 상태를 관리하여 `goTo` 클릭 시 기존 예약된 전환과 충돌 방지. `useCallback`으로 `scheduleNext`/`goTo` 메모이제이션.
- **상태**: 반영 완료

---

### 1️⃣4️⃣ 멀티테넌트 조직 권한 체계 — 프론트엔드 (2026-04-20, @youminsu0523)

> **착수 시각**: 2026-04-20 14:30  
> **목표**: 조직 기반 데이터 격리에 대응하는 프론트엔드 인증 플로우, 온보딩, 라우트 가드, 관리자 UI 구축

#### ⏱ 14:30 | authStore 조직 정보 확장
- **수정 파일**: `store/authStore.js`
- `organizations`, `currentOrg`, `switchOrg()` 추가. 다중 조직 전환 + localStorage 연동

#### ⏱ 14:40 | OrgRequired 라우트 가드 + 온보딩 페이지
- **신규**: `components/auth/OrgRequired.jsx` — 미소속 → `/employee/onboarding` 리다이렉트. `adminOnly` prop 지원
- **신규**: `pages/employee/Onboarding.jsx` — Slack/Notion/Jira 패턴. 새 조직 만들기 / 초대 코드 가입 / 배정 대기 3가지 선택지

#### ⏱ 15:00 | 관리자 멤버 관리 페이지
- **신규**: `pages/employee/AdminMembers.jsx` — 조직 멤버 테이블 + 미소속 사용자 탭 + 초대코드 표시. 멤버 행 클릭 → 상세/수정 모달 (역할/소속/부서(드롭다운)/직위/입사일/퇴사일/상태)

#### ⏱ 15:20 | EmployeeLanding 프로필 드롭다운 + 내 정보 수정
- **수정**: `pages/EmployeeLanding.jsx` — 프로필 아이콘 클릭 시 드롭다운 (사용자 정보 + 역할 뱃지 + 내 정보 수정 + 멤버 관리(관리자) + 로그아웃). EditProfileModal 추가. QuickActions에 관리자 전용 "멤버 관리" 카드

#### ⏱ 15:30 | API 헤더 + 라우팅
- **수정**: `api/authApi.js` — `X-Organization-Id` 헤더 자동 첨부
- **수정**: `App.jsx` — `<OrgRequired>` 래핑 + 온보딩/관리자 라우트 추가
- **수정**: `Login.jsx`, `OAuthCallback.jsx` — 로그인 후 조직 유무 분기 리다이렉트
- **상태**: 반영 완료

---

### 1️⃣5️⃣ 프로필 이미지 업로드 + 채팅 아바타 연동 (2026-04-20, @youminsu0523)

> **착수 시각**: 2026-04-20 16:00  
> **목표**: 내 정보 수정에서 프로필 이미지 업로드/삭제 UI 추가. 헤더와 채팅 컴포넌트에서 이니셜 대신 프로필 사진 표시. 채팅에서도 메시지 송신 시 프로필 이미지 URL 전달.

#### ⏱ 16:00 | EditProfileModal 프로필 이미지 업로드 UI

- **피드백**: "내 정보 수정에서 프로필 이미지를 변경할 수 있게 해줘. 현재는 이름의 앞 두글자를 띄우지만, 회사 특성상 얼굴을 알아야 하는 경우가 있기 때문에 프로필 사진을 넣을 수 있게 해줘. 프로필 사진은 채팅에서도 표현되어야 해."
- **수정 파일**: `pages/EmployeeLanding.jsx`
  - `EditProfileModal` 전면 개편:
    - 상단에 원형 프로필 영역 (24x24, 이미지 or 이니셜 폴백)
    - hover 시 카메라 아이콘(`Camera` from lucide-react) 오버레이 → 클릭 시 `<input type="file">` 트리거
    - "사진 변경" / "삭제" 링크 버튼 (이미지 존재 시에만 삭제 표시)
    - 업로드 중 로딩 스피너 (반투명 검정 오버레이 + 회전 border 애니메이션)
    - 제한사항 안내 텍스트: "JPEG, PNG, WebP, GIF / 최대 5MB"
  - 이미지 업로드: `PUT /api/v1/auth/me/profile-image` (FormData, 즉시 반영 — 별도 저장 버튼 불필요)
  - 이미지 삭제: `DELETE /api/v1/auth/me/profile-image`
  - 업로드/삭제 성공 시 `setAuth(token, updatedUser)`로 authStore 즉시 갱신 → 헤더 아바타 실시간 반영
- **스크린샷**:
  - 프로필 이미지 업로드 모달 (이니셜 상태):
    ![프로필 이미지 모달](/screenshots/profile_modal_initials.png)

#### ⏱ 16:20 | EmployeeHeader 아바타 프로필 이미지 표시

- **수정 파일**: `pages/EmployeeLanding.jsx`
  - 헤더 우측 프로필 아바타: `user.profile_image_url` 존재 시 `<img>` 렌더링, 없으면 기존 이니셜 `<div>` 폴백
  - 이미지 URL: `${VITE_API_BASE_URL}${user.profile_image_url}` 패턴으로 백엔드 StaticFiles 서빙 경로 참조

#### ⏱ 16:30 | 채팅 컴포넌트 4종 프로필 이미지 지원

- **수정 파일**:
  - `components/chat/MessageBubble.jsx` — `message.sender_profile_image_url` 존재 시 `<img>` 아바타, 없으면 이니셜 폴백. 내 메시지(노란 말풍선)는 아바타 미표시 유지
  - `components/chat/ChatHeader.jsx` — DM 상대방 헤더 아바타에 `otherMember.profile_image_url` 지원. 온라인 상태 도트는 이미지 위에도 동일하게 표시
  - `components/chat/ConversationItem.jsx` — 대화 목록 DM 아바타에 프로필 이미지 지원
  - `components/chat/ParticipantPanel.jsx` — 우측 참여자 패널 멤버 목록 아바타에 프로필 이미지 지원
  - `api/chatApi.js` — `sendMessage()` 함수에 `sender_profile_image_url` 파라미터 추가
  - `store/chatStore.js` — 메시지 전송 시 `localStorage.user.profile_image_url`에서 프로필 이미지 URL 읽어 전달

- **아바타 렌더링 패턴** (4개 컴포넌트 공통):
  ```jsx
  {member?.profile_image_url ? (
    <img src={`${API_BASE}${member.profile_image_url}`} alt={member.name}
         className="w-9 h-9 rounded-full object-cover" />
  ) : (
    <div className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold">
      {member?.initials || '??'}
    </div>
  )}
  ```

- **상태**: 반영 완료

---

## 🔧 2026-04-21 | 의존성 재설치로 package-lock.json 동기화

### ⏱ 배경
- `git pull` 직후 dev 서버 기동 시 Vite 에러: `Failed to resolve import "@react-pdf/renderer" from "src/components/report/ExcelPreviewModal.jsx"`
- 원인: 최근 PR에서 `@react-pdf/renderer` 의존성이 `package.json`에 추가됐으나 로컬 `node_modules` 미반영

### ⏱ 조치
- `frontend/` 경로에서 `npm install` 실행
- `package-lock.json` 갱신 (lockfileVersion/해시 변경)
- Vite dev 서버 재기동 → ExcelPreviewModal 정상 import

### ⏱ 영향 파일
- [package-lock.json](package-lock.json) — 자동 갱신 (직접 수정 X)

### ⏱ 비고
- 앞으로 `git pull` 후에는 `npm install` 한 번 돌려주는 흐름 유지 권장
- 백엔드도 동일하게 `pip install -r requirements.txt` 확인

---

## 🎮 2026-04-23~24 | TEST MODE 대시보드 인프라 구축

> **작업자**: @youminsu0523  
> **작업 브랜치**: `MS`  
> **목표**: 드론 없이 로컬 이미지/영상으로 AI 하자 검출을 시험할 수 있는 TEST MODE 프론트엔드 구축

### ⏱ 신규 컴포넌트

- **`components/dashboard/TestModeBar.jsx`** (319줄 신규)
  - 시작(Play) / 일시중지(Pause) / 정지(Stop) 재생 제어 버튼
  - 프로젝트 내장 데이터 ↔ 직접 업로드 소스 전환 토글
  - 직접 업로드: 이미지/영상 드래그&드롭 대량 첨부 + 파일 목록 관리
  - bbox / detection 시각화 모드 전환
  - 백엔드 `/api/v1/stream/test/*` 엔드포인트와 연동

### ⏱ 기존 파일 수정

- **`store/sessionStore.js`** (59줄+)
  - `enterTestMode()` — 테스트 모드 진입 액션. `modelSource='test'`, `isTestMode=true` 설정
  - `testSource` — `'project'` | `'upload'` 소스 선택 상태
  - `testPlayState` — `'idle'` | `'playing'` | `'paused'` 재생 상태
  - `testDetectionMode` — `'bbox'` | `'detection'` 시각화 모드
  - `setTestSource()`, `setTestPlayState()`, `setTestDetectionMode()` 액션

- **`pages/Dashboard.jsx`** (8줄+)
  - 테스트 모드 감지 시 `TestModeBar` 렌더링
  - 스트림 URL을 `/stream/test/rgb`, `/stream/test/thermal`로 분기

- **`components/video/LiveVideoFeed.jsx`** (69줄+)
  - 테스트 모드 스트림 URL 분기 처리
  - bbox 오버레이 표시를 위한 `<img>` src 동적 전환

- **`App.jsx`** (18줄+)
  - `DashboardLayout`에서 테스트 모드 진입 시 `POST /stream/test/init` 자동 호출 (이미지 스캔 + 모델 로드)
  - 컴포넌트 퇴장(unmount) 시 `POST /stream/test/stop` cleanup

- **`pages/EmployeeLanding.jsx`** — QuickActions에 TEST MODE 카드 추가 (FlaskConical 아이콘, 빨간 accent). 클릭 시 `enterTestMode()` → `/dashboard` 이동

### ⏱ 동작 흐름
1. `/employee` 에서 "TEST MODE" 카드 클릭
2. `sessionStore.enterTestMode()` → `modelSource='test'`, `isTestMode=true`
3. `/dashboard` 이동 → `DashboardLayout` 마운트 → `POST /test/init` 호출 (이미지 스캔)
4. `TestModeBar` 에서 ▶ 시작 → `POST /test/start` → MJPEG 스트림 시작
5. `LiveVideoFeed` 가 `/stream/test/rgb`, `/stream/test/thermal` 구독하여 실시간 표시
6. AI 추론 결과 → WebSocket `defect.new` → DefectPanel에 실시간 카드 생성
7. ■ 정지 → `POST /test/stop` → 스트림 중단

---

## 🔗 2026-04-24 | Frontend↔Backend 미연결 모듈 일괄 연동 + 슈퍼어드민 UX

> **작업자**: @youminsu0523  
> **작업 브랜치**: `MS`  
> **목표**: localStorage Mock으로만 동작하던 5개 API 모듈을 백엔드 실제 REST API로 전환. Refresh Token 자동 재발급. 슈퍼어드민 라우팅/권한 가드. 랜딩 헤더 로그인 상태 반영.

### ⏱ 09:30 | Mock → Real API 전환 (5개 파일)

localStorage 시드 데이터 + `simulateLatency()` 기반 Mock을 axios + JWT 인증 백엔드 호출로 전면 교체:

| 파일 | 변경 전 | 변경 후 |
|------|--------|--------|
| `api/chatApi.js` | localStorage CRUD + 시드 15개 메시지 | `axios.get/post/patch` + JWT. `listConversations(userId)` → `listConversations()` (서버가 JWT로 사용자 식별) |
| `api/notificationApi.js` | localStorage + 14개 시드 알림 | 동일 패턴. `simulateLatency()` 제거 |
| `api/sitesApi.js` | localStorage + 5개 시드 현장 | 필터 쿼리스트링(`status`, `building_type`, `client_type`, `search`) 지원 추가 |
| `api/reportsApi.js` | localStorage + updateReport | `POST /report/save` + `downloadReport()` 마크다운 다운로드 추가. updateReport 제거 (백엔드에 PATCH 없음) |
| `api/organizationApi.js` | localStorage + 7명 시드 멤버 | `removeMember(userId)` 함수 추가 |

### ⏱ 09:40 | Store 호출부 수정

- **`chatStore.js`** — `CURRENT_USER` 하드코딩 제거 → `localStorage.user`에서 읽도록 변경. `sendMessage`에서 sender 정보 불필요 (백엔드 JWT 자동 식별). `createConversation` 키: `participants` → `participant_ids`. 응답 키: `perConversation` → `per_conversation`
- **`reportsStore.js`** — `updateReport` import 제거. `update` 메서드를 로컬 캐시 전용으로 변경 (async → sync)

### ⏱ 09:45 | Refresh Token 프론트 연동

- **`authApi.js`** — 401 응답 인터셉터 추가:
  - `isRefreshing` 플래그 + `failedQueue` 큐잉 패턴 → 동시 요청 401 시 refresh 1회만 실행
  - Refresh 실패 → localStorage 정리 + `/login` 리다이렉트
  - `uploadProfileImage()`, `deleteProfileImage()`, `updateMe()` 함수 추가
- **`authStore.js`** — `setAuth(token, user, refreshToken)` 3번째 파라미터 추가. `logout()`에 `refresh_token` localStorage 삭제 추가
- **`Login.jsx`** / **`OAuthCallback.jsx`** — 로그인 응답에서 `refresh_token` 추출하여 `setAuth`에 전달

### ⏱ 09:50 | 보고서 다운로드 버튼

- **`pages/employee/ReportDetail.jsx`** — 헤더에 `Download` 아이콘 버튼 추가. `reportsApi.downloadReport(id)` 호출 → 브라우저 마크다운 파일 다운로드 (Content-Disposition 파싱)

### ⏱ 10:20 | 슈퍼어드민 라우팅 + 권한 가드 수정

조직 미소속 슈퍼어드민이 모든 기능에 접근 가능하도록 전면 수정:

- **`Login.jsx`** / **`OAuthCallback.jsx`** — `is_superadmin`이면 조직 없어도 `/employee`로 직행 (온보딩 건너뜀)
- **`components/auth/OrgRequired.jsx`** — `user.is_superadmin === true` 시 `currentOrg` 체크 건너뜀. `adminOnly` 페이지도 접근 허용
- **`pages/EmployeeLanding.jsx`**:
  - `isAdmin` 판정에 `user?.is_superadmin` 조건 추가 (EmployeeHeader + QuickActionsSection 2곳)
  - `QuickActionsSection`에서 `user` 미선언 크래시 수정 (`useAuthStore` import 누락)
  - 프로필 드롭다운에 슈퍼어드민 뱃지 표시
- **`pages/employee/AdminMembers.jsx`**:
  - `fetchData` 분기: 슈퍼어드민은 `admin/all-users` 우선 호출, 조직 API는 try-catch 감싸서 미소속 시 빈 배열 fallback
  - 전체 사용자 행 클릭 → 소속 있으면 편집 모달, 미소속이면 배정 모달 연결

### ⏱ 10:30 | 랜딩 헤더 로그인 상태 반영

- **`components/landing/LandingHeader.jsx`** — `useAuthStore` 연동:
  - **비로그인**: `로그인` + `도입 문의하기` 표시 (직원전용 숨김)
  - **로그인 상태**: `직원 전용` + `로그아웃` + `도입 문의하기` 표시
  - 데스크탑/모바일 메뉴 모두 동일 적용

### ⏱ 10:35 | EmployeeLanding 개인화 + 권한 분기

- **WelcomeBanner** — 하드코딩 `과장님` 제거. `authStore.user.name` + `currentOrg.position` 동적 표시. 직급 미설정 시 이름만
- **QuickActionsSection** — `멤버 관리` + `TEST MODE` 카드를 `isAdmin` (admin/owner/superadmin) 조건으로 묶어 일반 멤버에게 비노출

### 🔗 변경 파일 목록 (17개)

| 파일 | 변경 유형 |
|------|----------|
| `api/chatApi.js` | Mock → Real API 전면 교체 |
| `api/notificationApi.js` | 동일 |
| `api/sitesApi.js` | 동일 |
| `api/reportsApi.js` | 동일 + downloadReport 추가 |
| `api/organizationApi.js` | 동일 + removeMember 추가 |
| `api/authApi.js` | 401 인터셉터 + 프로필 이미지 API |
| `store/chatStore.js` | API 시그니처 변경 대응 |
| `store/reportsStore.js` | updateReport 제거 |
| `store/authStore.js` | refresh_token 지원 |
| `pages/Login.jsx` | refresh_token + 슈퍼어드민 라우팅 |
| `pages/OAuthCallback.jsx` | 동일 |
| `components/auth/OrgRequired.jsx` | 슈퍼어드민 bypass |
| `pages/EmployeeLanding.jsx` | isAdmin + 배너 개인화 + 권한 분기 |
| `pages/employee/AdminMembers.jsx` | 슈퍼어드민 분기 + 행 클릭 편집 |
| `pages/employee/ReportDetail.jsx` | 다운로드 버튼 |
| `components/landing/LandingHeader.jsx` | 로그인/로그아웃 상태 분기 |
| `components/dashboard/TestModeBar.jsx` | 신규 (TEST MODE 제어바) |

### 📐 설계 결정 사항
- **Mock → Real 전환 전략**: API 파일의 함수 시그니처 유지 → Store/컴포넌트 호출부 최소 변경. 각 API 파일에 독립 axios 인스턴스 (JWT + X-Organization-Id 헤더 자동 첨부)
- **Refresh Token 큐잉**: 동시 다발 401 시 refresh 1회만 실행, 나머지 큐 대기 후 새 토큰으로 재시도
- **슈퍼어드민 권한 모델**: 조직 소속 없이도 모든 페이지/기능 접근 가능. `is_superadmin`이 `currentOrg` 체크보다 우선
- **TEST MODE 접근 제한**: admin/owner/superadmin만 카드 노출 (일반 멤버 비노출)

---

## 세션 7 — 조직·멤버 관리 + 채팅 실사용자 전환

- 작성자 (Who): @youminsu0523
- 작성 일자 (When): 2026-04-24
- 작업 브랜치: `MS`

### 1️⃣ 프롬프트 / 목표
> 채팅 컴포넌트의 하드코딩된 CURRENT_USER/CHAT_TEAM_MEMBERS를 실제 로그인 사용자 + API 데이터로 교체하고, 슈퍼어드민의 다중 조직 멤버 배정 기능을 구현한다.

### 2️⃣ 수행된 작업 요약

#### 채팅 시스템 — 하드코딩 → 실사용자 전환
- **ChatHeader / ConversationItem / ConversationList / MessageBubble / NewChatModal**: `CURRENT_USER`, `CHAT_TEAM_MEMBERS` import 전부 제거. `localStorage.getItem('user')` 기반 `getCurrentUserId()` 헬퍼로 교체
- **participants 데이터 구조 변경**: 단순 ID 배열 → `{user_id, name, initials}` 객체 배열로 변경 대응. DM 상대방 매칭 로직 수정
- **findDMConversation 버그 수정**: `||` 조건 → `&&` 조건으로 수정 (두 사용자 **모두** 참여해야 매칭)
- **ConversationItem 시간 포맷**: `Date.now() - ts` → `Date.now() - new Date(ts).getTime()` (ISO 문자열 대응)
- **온라인 상태 키**: `otherMember.status` → `otherMember.online_status`로 변경

#### 대화방 나가기 기능
- **chatApi.js**: `leaveConversation(conversationId)` — `DELETE /api/v1/chat/conversations/{id}/leave` 추가
- **chatStore.js**: `leaveConversation` 액션 추가 (API 호출 → 대화 목록 새로고침 → activeConversation 초기화)
- **ParticipantPanel.jsx**: 하단에 "대화 나가기" 버튼 + `window.confirm` 확인 다이얼로그

#### 슈퍼어드민 다중 조직 멤버 배정
- **AdminMembers.jsx**: 슈퍼어드민일 때 전체 조직 목록(`/admin/all-orgs`) 로드
- 배정 모달에 **조직 선택 드롭다운** 추가 → 선택 시 해당 조직의 부서 목록(`/admin/orgs/{id}/departments`) 동적 로드
- 조직 미선택 시 역할/부서/직위 필드 비활성화 (`opacity-40 + pointer-events-none`)
- 일반 어드민은 기존 동작 유지 (자기 조직 고정 표시)

#### 글로벌 CSS 수정
- **index.css**: `body`의 `text-white` 상속으로 `<input>/<textarea>/<select>` 텍스트가 보이지 않던 문제 해결. `color: #111827`, `placeholder: #9ca3af` 명시

### 🔗 변경 파일 목록 (10개)

| 파일 | 변경 유형 |
|------|----------|
| `api/chatApi.js` | `leaveConversation` 추가 + `findDMConversation` 매칭 로직 버그 수정 |
| `components/chat/ChatHeader.jsx` | CURRENT_USER → localStorage, participants 객체 배열 대응 |
| `components/chat/ConversationItem.jsx` | 동일 + 시간 포맷 수정 |
| `components/chat/ConversationList.jsx` | 동일 + 검색 로직 수정 |
| `components/chat/MessageBubble.jsx` | CURRENT_USER → localStorage |
| `components/chat/NewChatModal.jsx` | CURRENT_USER → localStorage, 조직 멤버 API 연동 유지 |
| `components/chat/ParticipantPanel.jsx` | participants 객체 배열 대응 + 대화 나가기 버튼 |
| `store/chatStore.js` | `leaveConversation` 액션 추가 |
| `pages/employee/AdminMembers.jsx` | 슈퍼어드민 다중 조직 배정 (조직 선택 → 부서 동적 로드) |
| `index.css` | 폼 요소 텍스트 가시성 수정 |

### 📐 설계 결정 사항
- **getCurrentUserId 헬퍼 패턴**: 각 컴포넌트에 인라인 정의 (store 순환 import 방지). authStore를 직접 import하지 않고 localStorage에서 직접 읽음
- **participants 구조 변경 대응**: 백엔드가 `{user_id, name, initials}` 객체 배열을 반환하도록 변경됨에 따라, 프론트 전체 채팅 컴포넌트를 일괄 수정
- **조직 배정 UX**: 슈퍼어드민은 조직 선택이 첫 단계이며, 선택 전에는 하위 필드를 시각적으로 비활성화하여 순서를 유도

---

## 세션 8 — 온보딩 인증 수정 + 초대코드 만료 UI + 실시간 채팅 + 첨부파일·이모지·읽음 표시

- 작성자 (Who): @youminsu0523
- 작성 일자 (When): 2026-04-25 ~ 2026-04-27
- 작업 브랜치: `MS`

### 1️⃣ 프롬프트 / 목표
> 1. 온보딩 페이지 401 에러 수정 (토큰 갱신 미지원)
> 2. 초대코드 만료일 표시 + 재생성 버튼 추가
> 3. 실시간 채팅 WebSocket 연결 (새로고침 없이 메시지 수신)
> 4. 채팅 첨부파일 전송 (이미지/문서, 최대 10개·200MB/개)
> 5. 이모지 피커 구현
> 6. 카카오톡 스타일 읽음 표시

### 2️⃣ 수행된 작업 요약

#### 온보딩 페이지 인증 수정 (`Onboarding.jsx`)
- raw `axios` → 401 자동 토큰 갱신 인터셉터 포함 axios 인스턴스로 교체
- `token` 없으면 `/login`으로 리다이렉트하는 인증 가드 추가
- `getMe()` 호출 시 `authApi`의 API 인스턴스 재사용

#### 초대코드 만료 UI (`AdminMembers.jsx`)
- 초대코드 옆에 만료일 표시: 7일 이하 주황색, 만료 시 빨간색
- "코드 재생성" 버튼 → `POST /invite-code/regenerate` → 즉시 새 코드 발급 + 30일 연장
- `confirm()` 확인 다이얼로그

#### 실시간 채팅 WebSocket (`Chat.jsx`)
- **대화방 채널** (`chat:{conversationId}`): 현재 보고 있는 대화의 실시간 메시지
- **개인 채널** (`user:{userId}`): 다른 대화방/페이지 밖에서의 새 메시지 알림
- **백업 폴링**: 30초 간격 미읽음 갱신 (WS 끊김 대비)
- `chatStore.receiveMessage()` 액션: 중복 방지 + 읽음 처리 + 대화 목록 갱신

#### 채팅 첨부파일 전송 (`MessageInput.jsx`)
- Paperclip 버튼 활성화 → `<input type="file" multiple>` → 최대 10개 선택
- 200MB 초과 파일 자동 필터 + 경고 메시지
- 선택 파일 미리보기 리스트 (이미지: 썸네일, 문서: 파일명 뱃지) + 개별 X 제거
- `sendMessage({ text, files })` → 각 파일 순차 `sendFileMessage()` 호출 (첫 파일에만 텍스트 포함)

#### 이모지 피커 (`MessageInput.jsx`)
- `emoji-picker-react` 패키지 설치 (`npm install emoji-picker-react`)
- Smile 버튼 클릭 → 피커 팝업 토글 → 이모지 선택 시 textarea 커서 위치에 삽입
- 외부 클릭 시 자동 닫기 (`mousedown` 이벤트 리스너)
- 백엔드 변경 없음 (유니코드 그대로 저장)

#### 첨부파일 렌더링 (`MessageBubble.jsx`)
- 이미지 파일: 말풍선 내 인라인 미리보기 (max-w-240px, 클릭 시 원본 새 탭)
- 비이미지 파일: FileText 아이콘 + 파일명 + Download 아이콘 (클릭 시 다운로드)
- 텍스트 + 파일 동시: 파일 위, 텍스트 아래 배치

#### 읽음 표시 (`MessageBubble.jsx`)
- 내 메시지 시간 위에 "읽음" 텍스트 (노란색, 카카오톡 스타일)
- DM: `read_by_count >= 1`이면 "읽음"
- 그룹: `read_by_count >= 1`이면 "읽음 N" (읽은 사람 수 표시)
- `chat.read` WebSocket 이벤트 수신 시 실시간 갱신 (`selectConversation` 재호출)

#### 대화 목록 파일 메시지 미리보기 (`ConversationItem.jsx`)
- `last_message.text`가 null이고 `file_name`이 있으면 `📎 파일명`으로 표시

### 🔗 변경 파일 목록 (8개)

| 파일 | 변경 유형 |
|------|----------|
| `pages/employee/Onboarding.jsx` | raw axios → 토큰 갱신 인터셉터 + 인증 가드 |
| `pages/employee/AdminMembers.jsx` | 초대코드 만료일 표시 + 재생성 버튼 |
| `pages/employee/Chat.jsx` | 2채널 WebSocket + 읽음 이벤트 + 30초 폴링 |
| `store/chatStore.js` | receiveMessage 액션 + sendMessage 파일 지원 |
| `api/chatApi.js` | sendFileMessage 추가 |
| `components/chat/MessageInput.jsx` | 파일 첨부(10개/200MB) + 이모지 피커 전면 재작성 |
| `components/chat/MessageBubble.jsx` | 파일 렌더링 + 읽음 표시 전면 재작성 |
| `components/chat/ConversationItem.jsx` | 📎 파일 미리보기 텍스트 |

### 📐 설계 결정 사항
- **이모지 피커 라이브러리**: `emoji-picker-react` 선택 (React 18 호환, 설정 간단, lazy load 지원)
- **파일 전송 전략**: 10개 파일 동시 선택 → 각각 별도 API 호출로 순차 전송 (첫 파일에만 텍스트 포함). 서버 메모리 부담 분산
- **읽음 표시 방식**: 개별 메시지 읽음 테이블 없이 `ConversationMember.last_read_at` timestamp 비교로 계산 → DB 스키마 추가 없이 효율적 구현
- **이중 WebSocket 채널**: 활성 대화방 채널 + 개인 채널. 페이지 밖에서도 알림 수신 가능. 30초 폴링은 WS 끊김 대비 백업

---

## 세션 9 — 채팅 사이드바 UI 개선 (2026-04-27)

- 작성자 (Who): @unknownName-15
- 작성 일자 (When): 2026-04-27
- 작업 브랜치: `SH`

### 1️⃣ 프롬프트 / 목표
> 채팅 사이드바(ConversationList)의 검색창·필터 탭 좌측 패딩 보완, 대화 목록의 가로 스크롤 및 하단 검은색 여백 제거

### 2️⃣ 수행된 작업 요약

#### 검색창·필터 탭 좌측 패딩 추가 (`ConversationList.jsx`)
- 검색 컨테이너: `p-3` → `px-4 py-3` (좌측 패딩 12px → 16px)
- 필터 탭 컨테이너: `px-3 pt-2 pb-2` → `px-4 pt-2 pb-2` (좌측 패딩 12px → 16px)
- 대화 목록 컨테이너: `overflow-y-auto py-1` → `overflow-y-auto overflow-x-hidden py-1 px-1` (항목 간격 확보 + 가로 스크롤 차단)

#### 가로 스크롤 및 하단 검은 여백 제거 (`ConversationItem.jsx`)
- 원인: 버튼에 `w-full` + `mx-1`이 동시 적용되어 부모 너비를 8px 초과하는 오버플로우 발생 → 가로 스크롤바 + 하단 검은 공간 표시
- 수정: 버튼에서 `mx-1` 제거. 대신 `ConversationList`의 목록 컨테이너에 `px-1` 추가하여 동일한 좌우 여백 유지

### 🔗 변경 파일 목록 (2개)

| 파일 | 변경 유형 |
|------|----------|
| `components/chat/ConversationList.jsx` | 검색·필터 패딩 증가 + 목록 컨테이너 `px-1 overflow-x-hidden` 추가 |
| `components/chat/ConversationItem.jsx` | 버튼에서 `mx-1` 제거 (오버플로우 원인 해소) |

---

#### ⏱ 2026-04-27 | 채팅 사이드바 검색 기능 버그 수정 (`ConversationList.jsx`)

- **피드백**: 검색창에 '확인' 등 단어를 입력해도 결과가 나오지 않음. 대화 목록에 해당 단어가 포함된 항목이 다수 보임에도 검색이 전혀 동작하지 않는 증상.
- **원인 1 — TypeError 크래시**: `c.name?.toLowerCase().includes(q)` 구문에서 DM 대화방의 `c.name`이 `null`인 경우, `c.name?.toLowerCase()`가 `undefined`를 반환하고 이어서 `.includes(q)`를 호출하면 `TypeError` 발생 → `.filter()` 전체가 throw되어 검색 결과가 빈 배열로 떨어짐.
- **원인 2 — 검색 범위 누락**: 마지막 메시지 텍스트(`c.last_message?.text`)가 검색 대상에 포함되지 않아, 목록에 미리보기로 보이는 메시지 내용으로는 검색 불가.
- **반영**:
  - `c.name?.toLowerCase().includes(q)` → `c.name?.toLowerCase()?.includes(q)` (옵셔널 체이닝 추가로 TypeError 방지)
  - `other?.name?.toLowerCase().includes(q)` → `other?.name?.toLowerCase()?.includes(q) ?? false` (동일 패턴 통일)
  - `c.last_message?.text?.toLowerCase()?.includes(q)` 조건 추가 (마지막 메시지 내용 검색 지원)

#### ⏱ 2026-04-27 | 채팅 검색 범위 확대 — 탭 필터 무시 + 파일명·그룹 참여자 검색 추가 (`ConversationList.jsx`)

- **피드백**: '완료' 같은 단어를 검색하면 1개만 나옴. 1:1·그룹·채널 전체를 통틀어 검색되어야 함.
- **원인**: 검색어가 있어도 탭 필터(`filterType`)가 먼저 적용되어, 예를 들어 '1:1' 탭이 활성 상태면 DM 대화방만 뒤지고 그룹·채널은 검색 대상에서 제외됨. 결과적으로 이름에 검색어가 있는 채널 1개만 통과되던 상황.
- **반영**:
  - `isSearching` 플래그 도입. 검색어가 있으면 탭 필터를 건너뛰고 `conversations` 전체를 대상으로 검색.
  - 검색어가 없을 때는 기존 탭 필터 동작 유지.
  - `c.last_message?.file_name` 검색 추가 (파일 메시지 미리보기에 보이는 파일명도 검색 가능).
  - 그룹·채널의 참여자 이름 검색 추가 (`c.participants?.some(...)`). DM 외 대화방도 멤버 이름으로 찾을 수 있음.

#### ⏱ 2026-04-27 | 채팅 레이아웃 수평 정렬 수정 — 헤더 border 기준선 불일치 + 입력 아이콘 수직 정렬

- **피드백 1 — border 기준선 불일치**: 대화 목록 검색창 컨테이너 하단 border와 ChatHeader 하단 border가 서로 평행하지 않아 시각적으로 어긋나 보임.
- **원인**: 검색창 컨테이너(`px-4 py-3`)에서 `<input>`(border-box 포함 38px) + 수직 패딩(12+12=24px) = 62px 렌더 높이. ChatHeader(`px-5 py-3`)에서 텍스트 div(약 36px) + 수직 패딩(24px) = 60px. 2px 차이로 border 위치가 엇갈림.
- **반영**:
  - `ConversationList.jsx` 검색 컨테이너: `px-4 py-3 border-b border-gray-100` → `h-[60px] flex items-center px-4 border-b border-gray-100` (고정 높이로 콘텐츠 차이 흡수)
  - `ChatHeader.jsx` 루트 div: `flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200` → `h-[60px] flex items-center justify-between px-5 bg-white border-b border-gray-200` (동일한 60px 고정 높이 적용)

- **피드백 2 — 메시지 입력 아이콘 수직 정렬**: 첨부파일·이모지·전송 아이콘이 서로 평행하지 않음. 전송 버튼이 아래로 쏠려 보이는 현상.
- **원인**: 입력 행 컨테이너에 `items-end` 적용 → 모든 자식 요소가 flex 컨테이너 하단 기준 정렬. textarea(`min-height: 40px`)와 버튼들(34–36px)의 높이가 달라 각 아이콘 중심점이 서로 다른 높이에 위치.
- **반영**: `MessageInput.jsx` 입력 행 div: `flex items-end gap-2` → `flex items-center gap-2` (수직 중앙 정렬로 통일)

### 🔗 변경 파일 목록 (3개)

| 파일 | 변경 유형 |
|------|----------|
| `components/chat/ConversationList.jsx` | 검색 컨테이너 `py-3` 제거 → `h-[60px] flex items-center` 적용 |
| `components/chat/ChatHeader.jsx` | 루트 div `py-3` 제거 → `h-[60px]` 고정 높이 적용 |
| `components/chat/MessageInput.jsx` | 입력 행 `items-end` → `items-center` 변경 |

---

#### ⏱ 2026-04-27 | 검색창 X 버튼 + 필터 탭 중앙 정렬 + 이미지 수신 버그 수정

- **피드백 1 — 검색창 X 버튼**: 검색어가 있을 때 오른쪽 끝에 X 버튼을 눌러 한 번에 지우고 전체 목록으로 돌아갈 수 있도록 요청.
- **반영**: `ConversationList.jsx` 검색 입력 내부에 `{searchQuery && <button onClick={() => setSearch('')}><X size={14}/></button>}` 추가. 검색어 없으면 숨김, 있을 때만 노출. `pr-3` → `pr-8`로 우측 패딩 확보. `X` 아이콘을 `lucide-react`에서 추가 임포트.

- **피드백 2 — 필터 탭 중앙 정렬**: 전체/1:1/그룹/채널 탭이 좌측 정렬되어 있어 중앙으로 변경 요청.
- **반영**: `ConversationList.jsx` 필터 탭 컨테이너에 `justify-center` 추가.

- **피드백 3 — 이미지 수신 시 파일명만 표시되는 버그**:
  - **원인 A — 백엔드 WS 채널 차단**: `backend/app/api/websocket.py`의 `VALID_CHANNELS`에 `chat:*`, `user:*`가 없어 채팅 WS 연결이 모두 "defects" 채널로 리다이렉트됨. 채팅 실시간 메시지가 수신자에게 전달되지 않는 근본 버그.
  - **원인 B — `file_content_type` null 처리 누락**: `file.content_type`이 브라우저에 따라 `null` 또는 빈 문자열로 올 경우 DB에도 `null`로 저장됨. `isImage = message.file_content_type?.startsWith('image/')` → `false`로 평가돼 이미지 대신 파일 다운로드 링크가 렌더링됨.
  - **반영**:
    - `backend/app/api/websocket.py`: `VALID_CHANNELS` 고정 집합 검사를 `_is_valid_channel()` 함수로 교체. `chat:` 또는 `user:` 접두어 채널을 명시적으로 허용. 드론 모니터링 기존 채널은 그대로 유지.
    - `frontend/components/chat/MessageBubble.jsx`: `FileAttachment` 내 `isImage` 판정에 파일 확장자 fallback 추가. `file_content_type`이 null이어도 `IMAGE_EXT` 정규식(`.jpg/.png/.gif/.webp` 등)으로 파일명에서 이미지 여부를 판별.

### 🔗 변경 파일 목록 (4개)

| 파일 | 변경 유형 |
|------|----------|
| `frontend/components/chat/ConversationList.jsx` | 검색창 X 버튼 추가 + 필터 탭 `justify-center` |
| `frontend/components/chat/MessageBubble.jsx` | `isImage` 확장자 fallback 추가 |
| `backend/app/api/websocket.py` | `chat:*` / `user:*` 채널 WS 허용 (`_is_valid_channel` 함수) |

---

#### ⏱ 2026-04-27 | 채팅 WS 수정 후 메시지 무한 로딩 루프 버그 수정

- **증상**: WS 채널 수정 이후 어떤 대화방을 선택해도 로딩 스피너가 멈추지 않고 계속 돌아감.
- **원인**: `mark_read` 백엔드가 `chat:{convId}` 채널에도 `chat.read` 이벤트를 브로드캐스트 → 읽음 처리를 요청한 본인도 이벤트를 수신 → `Chat.jsx` 핸들러가 `selectConversation` 호출 → `selectConversation` 내부에서 `markConversationRead` 재호출 → 다시 `chat.read` 이벤트 → 무한반복. WS가 broken이던 동안에는 이 루프가 이벤트를 수신하지 못해 잠복해 있었음.
- **반영**:
  - `store/chatStore.js`: `refreshMessages(convId)` 액션 추가. `getMessages`만 호출하고 `markConversationRead`는 호출하지 않음. 다른 대화방으로 이동한 경우 store 오염 방지를 위해 `activeConversationId === convId` 확인 후에만 반영.
  - `pages/employee/Chat.jsx`: `chat.read` 핸들러에서 `selectConversation` → `refreshMessages` 교체. 루프의 진입점 제거.

### 🔗 변경 파일 목록 (2개)

| 파일 | 변경 유형 |
|------|----------|
| `frontend/src/store/chatStore.js` | `refreshMessages` 액션 추가 |
| `frontend/src/pages/employee/Chat.jsx` | `chat.read` 핸들러 `selectConversation` → `refreshMessages` |

---

#### ⏱ 2026-04-27 | 메신저 헤더 미읽음 뱃지 + 브라우저 탭 제목 카운트 표시

- **피드백**: 메신저 목록(`ConversationList`) 누군가 메시지를 보냈을 때 메신저 페이지 상단(`Chat.jsx` 헤더의 "메신저" 패널)에도 미읽음 뱃지가 보이게 하고, 브라우저 탭 제목(`AeroInspect`) 옆에도 `(N)` 카운트가 노출되길 원함. 기존에는 좌측 사이드바·FAB·EmployeeLanding 헤더에만 뱃지가 있어 채팅 페이지 진입 직후나 다른 탭에서는 새 메시지 인지가 어려웠음.
- **반영**:
  - `pages/employee/Chat.jsx`: `useChatStore`에서 `unreadTotal` 구독. 헤더의 "메신저" 텍스트 옆에 `bg-red-500` 빨간 알약 뱃지 렌더(`unreadTotal > 0`일 때만, 99 초과 시 `99+`). 페이지에 진입한 상태에서도 다른 대화방의 미읽음 합계를 즉시 인지 가능.
  - `App.jsx`: `DocumentTitleBadge` 컴포넌트 신설. `useChatStore.unreadTotal` 변경 시 `document.title`을 `"(N) AeroInspect"` 또는 `"AeroInspect"`로 갱신. Slack/Gmail 스타일 탭 제목 컨벤션 적용. `BrowserRouter` 직속에 마운트하여 라우트 변경과 무관하게 항상 동작.
- **참고**: 채팅 WebSocket(`user:{userId}`)이 `/employee/chat` 페이지에서만 연결되므로, 다른 페이지에서는 마지막 fetch 시점의 카운트만 반영됨. 이는 기존 `FloatingChatButton`/사이드바 뱃지와 동일한 한계로, 본 작업 범위 외.

### 🔗 변경 파일 목록 (2개)

| 파일 | 변경 유형 |
|------|----------|
| `frontend/src/pages/employee/Chat.jsx` | 헤더 "메신저" 옆 `unreadTotal` 빨간 알약 뱃지 추가 |
| `frontend/src/App.jsx` | `DocumentTitleBadge` 추가 — `document.title`에 `(N)` 미읽음 카운트 표시 |

---

#### ⏱ 2026-04-27 | 알림 벨 안에 채팅 실시간 알림 통합 + 전역 user-WS 리스너로 이관

- **피드백**: 메신저에 새 메시지가 도착하면 알림 벨 아이콘에도 "(보낸 사람)님께서 메시지를 보냈습니다." 형태의 알림이 실시간으로 추가되고, 항목 클릭 시 해당 메시지함으로 이동하길 원함. 기존에는 채팅 미읽음이 사이드바·FAB·메신저 헤더에만 표시되었고 알림 벨에는 백엔드 알림만 노출되었음.
- **설계 결정**:
  - 채팅 알림은 백엔드에 영속화하지 않고 프론트 인메모리(`notificationStore.chatNotifications`)에만 보관. 새 알림 카테고리/엔드포인트를 추가하지 않고도 즉시 동작 가능. (트레이드오프: 새로고침 시 채팅 알림 휘발 — 백엔드 미읽음 카운트는 그대로 보존되므로 사용자 인지에는 문제 없음.)
  - 알림 push 트리거를 글로벌하게 만들기 위해 `Chat.jsx`의 `user:{userId}` WS 핸들러를 신규 `ChatRealtimeListener` 컴포넌트로 이관. `App.jsx` `BrowserRouter` 직속에 단 하나의 인스턴스만 마운트(로그인 안 했으면 내부 `if (!userId) return`로 no-op) → 어느 페이지에 있든 동일하게 새 메시지를 수신. Chat.jsx 는 활성 대화방의 `chat:{convId}` 채널만 유지.
- **반영**:
  - `constants/notificationCategories.js`: `chat` 카테고리 추가 (cyan 톤, `MessageSquare` 아이콘). 다른 카테고리와 동일하게 light/dark 양 테마 정의.
  - `store/notificationStore.js`: `chatNotifications: []`, `chatUnreadCount: 0` 상태 추가. 50건 캡(`CHAT_NOTIF_CAP`)으로 FIFO 보존. 액션 추가:
    - `pushChatNotification(payload)` — 동일 id 중복 방지 후 prepend.
    - `markChatNotificationRead(id)` — 단건 읽음, 미읽음 카운트 차감.
    - `markChatNotificationsReadByConversation(convId)` — 대화방 진입 시 일괄 읽음.
    - 기존 `markAllRead`도 `chatNotifications`/`chatUnreadCount` 함께 초기화하도록 확장.
  - `store/chatStore.js`: `selectConversation`에서 `useNotificationStore.getState().markChatNotificationsReadByConversation(convId)` 호출 — 메시지 직접 클릭으로 진입한 경우에도 해당 대화의 채팅 알림이 자동 읽음 처리되어 UX 일관성 확보.
  - `components/chat/ChatRealtimeListener.jsx` (신규): 전역 user-채널 WS. `chat.new_message` 수신 시 `chatStore.receiveMessage` + (활성 대화방이 아닌 경우에 한해) `notificationStore.pushChatNotification` 호출. `chat.read`도 동일하게 핸들링하여 활성 대화의 read receipts 갱신.
  - `App.jsx`: `ChatRealtimeListener`를 `BrowserRouter` 직속에 직접 마운트(전역). 내부에서 `userId` 없을 때 자동 no-op이라 비로그인 페이지(Landing/Login 등)에서는 WS 연결을 시도하지 않음.
  - `pages/employee/Chat.jsx`: `userWsRef`/user-채널 effect 제거. 활성 대화방 WS만 유지. 핸들러 주석 업데이트.
  - `components/notification/NotificationDropdown.jsx`:
    - `useChatStore.selectConversation` 구독 + `useMemo`로 `mergedNotifications` 계산 (chat 항목을 표준 모양으로 정규화 후 백엔드 알림과 합쳐 `created_at` 내림차순 정렬).
    - 채팅 항목 title: `"{sender_name}님께서 메시지를 보냈습니다."`, message: 텍스트 40자 미리보기 또는 `📎 파일명` 폴백.
    - `handleItemClick` 분기: `_isChat` 플래그면 `markChatNotificationRead` → `selectConversation` (activeConversationId 동기 set + 메시지 fetch + 백엔드 read) → `navigate('/employee/chat')`. 일반 알림은 기존 동작 유지.
    - 헤더 뱃지/「모두 읽음」 버튼은 `totalUnread = unreadCount + chatUnreadCount` 기준으로 노출.
  - `pages/EmployeeLanding.jsx`, `components/dashboard/DashboardTopBar.jsx`, `components/layout/Header.jsx`: 벨 뱃지가 `unreadCount` 단독 → `totalUnreadCount = unreadCount + chatUnreadCount`로 변경. 채팅 알림 1건만 와도 벨에 1이 즉시 표시됨.
- **검증 흐름**:
  1. 다른 사람이 메시지 발송 → user-WS push → `chatStore.receiveMessage`로 좌측 목록/사이드바 뱃지 갱신 + `pushChatNotification`으로 벨 뱃지/알림 리스트 즉시 추가.
  2. 사용자가 벨 클릭 → 드롭다운 오픈 → `mergedNotifications` 노출 (채팅 + 백엔드 알림 시간순).
  3. 채팅 알림 클릭 → `selectConversation(convId)` 동기 set → `navigate('/employee/chat')` → Chat.jsx 마운트 시 activeConversationId 이미 세팅되어 해당 대화방 자동 활성화.
- **알려진 제약**:
  - 채팅 인메모리 알림은 휘발성이므로 새로고침 시 사라짐(백엔드 미읽음 카운트는 보존되어 사이드바·메신저 헤더 뱃지로 인지 가능).
  - 청취 리스너는 로그인 직후/페이지 전환 직후 약 1초 미만의 reconnect 윈도우 동안 메시지를 놓칠 수 있음 — 이때는 다음 `fetchConversations`로 chatStore 미읽음 카운트만 갱신되고 알림 항목은 누락. 영속화가 필요하면 백엔드 알림 카테고리로 승격 검토.

### 🔗 변경 파일 목록 (8개)

| 파일 | 변경 유형 |
|------|----------|
| `frontend/src/constants/notificationCategories.js` | `chat` 카테고리 추가 (cyan, `MessageSquare`) |
| `frontend/src/store/notificationStore.js` | `chatNotifications`/`chatUnreadCount` 상태 + `pushChatNotification`/`markChatNotificationRead`/`markChatNotificationsReadByConversation` 액션 + `markAllRead` 확장 |
| `frontend/src/store/chatStore.js` | `selectConversation`에서 해당 대화방 채팅 알림 일괄 읽음 처리 |
| `frontend/src/components/chat/ChatRealtimeListener.jsx` | 신규 — 전역 user-채널 WS 리스너 (chatStore.receiveMessage + pushChatNotification) |
| `frontend/src/App.jsx` | `ChatRealtimeListener`를 BrowserRouter 직속에 전역 마운트 (userId 없으면 내부에서 no-op) |
| `frontend/src/pages/employee/Chat.jsx` | user-채널 WS 제거 (전역 리스너로 이관). 활성 대화방 WS만 유지 |
| `frontend/src/components/notification/NotificationDropdown.jsx` | `mergedNotifications` 계산 + 채팅 항목 클릭 시 `selectConversation`+`navigate` 분기 + 헤더/뱃지를 `totalUnread`로 |
| `frontend/src/pages/EmployeeLanding.jsx`, `components/dashboard/DashboardTopBar.jsx`, `components/layout/Header.jsx` | 벨 뱃지 카운트를 `unreadCount`+`chatUnreadCount` 합으로 변경 |

---

#### ⏱ 2026-04-27 | 알림 드롭다운/대시보드 알림·공지 — 전체 읽음·전체 삭제 액션 + 채팅 종류 라벨

- **피드백**:
  1. 알림 벨 드롭다운 헤더 우측에 「전체 읽음」(체크 아이콘)과 「전체 삭제」(쓰레기통 아이콘) 추가. 아이콘은 이모지 대신 Remix Icon CDN(`ri-*` 클래스)을 사용.
  2. EmployeeLanding 의 「알림 · 공지」 섹션에서 항목 하단의 "N개월 전" 상대 시간 텍스트를 제거하고, 알림 종류로 대체. 채팅: "메시지 발송" / "사진 발송" / "파일 발송".
  3. 같은 섹션 우측 하단에도 「전체 읽음」/「전체 삭제」 액션 추가 (Remix 아이콘).
- **반영**:
  - `backend/app/api/notifications.py`: `DELETE /api/v1/notifications` 엔드포인트 신설. 현재 사용자의 알림을 단일 SQL `DELETE` 한 번으로 일괄 제거 → 프런트 N회 호출 회피.
  - `frontend/src/api/notificationApi.js`: `deleteAllNotifications()` 래퍼 추가.
  - `frontend/src/store/notificationStore.js`: `removeAll()` 액션 추가. 백엔드 일괄 삭제 호출 + `chatNotifications`/`chatUnreadCount`도 동시 비움.
  - `frontend/src/components/notification/NotificationDropdown.jsx`:
    - `lucide-react`의 `CheckCheck` 제거 → Remix `<i className="ri-check-double-line">` 사용.
    - 헤더 우측에 「전체 읽음」(`markAllBtn` 테마, totalUnread > 0 일 때만 노출) + 「전체 삭제」(`deleteAllBtn` 테마, 빨간색, 머지된 알림이 1건 이상일 때만 노출) 두 버튼 배치. 「전체 삭제」는 `window.confirm` 으로 안전장치.
    - light/dark 테마에 `deleteAllBtn` 색상 추가 (light: `red-600`, dark: `red-400`).
  - `frontend/src/pages/EmployeeLanding.jsx`:
    - `formatRelativeTime` 함수 제거(섹션 내 유일 사용처였음).
    - `NotificationsSection` prop 시그니처 폐지 → 내부에서 `useNotificationStore` 직접 구독. 채팅 + 백엔드 알림을 `useMemo`로 머지(시간 내림차순, 최대 6건). 부모 EmployeeLanding 의 dead 변수 `notifications` 제거.
    - 항목 하단 텍스트: 채팅이면 `getChatKindLabel(n)` ("메시지 발송"/"사진 발송"/"파일 발송"), 비채팅이면 카테고리 라벨로 폴백.
    - 종류 판별: `CHAT_IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp|avif|svg)$/i` (MessageBubble 과 동일 패턴) — `file_name` 없으면 "메시지 발송", 있고 이미지 확장자면 "사진 발송", 그 외 파일이면 "파일 발송".
    - 섹션 footer 추가: `border-t` + `flex justify-end gap-2`로 우측 정렬, 「전체 읽음」(blue)/「전체 삭제」(red, confirm) 버튼. 액션 가능 상태가 아니면 `disabled:opacity-40` 으로 시각적 잠금.
- **설계 결정**:
  - 백엔드 bulk delete 엔드포인트를 추가한 이유: 프런트 루프(N개 DELETE)는 라운드트립이 누적되고 부분 실패 처리가 복잡해짐. `read-all`이 이미 단일 PATCH인 것과 대칭으로 `DELETE /notifications` 를 추가해 일관성 유지.
  - 「전체 삭제」 confirm: 「모두 읽음」은 비파괴라 무confirm, 삭제는 복구 불가하므로 confirm 한 단계 추가. 메신저 인메모리 알림 + 백엔드 알림 한꺼번에 사라짐을 사용자에게 명확히 알림.
  - Remix Icon CDN: `index.html` 에서 이미 로드 중(`remixicon@4.5.0`). 추가 설치 없이 `<i className="ri-*">` 사용 가능.

### 🔗 변경 파일 목록 (5개)

| 파일 | 변경 유형 |
|------|----------|
| `backend/app/api/notifications.py` | `DELETE /notifications` 일괄 삭제 엔드포인트 추가 |
| `frontend/src/api/notificationApi.js` | `deleteAllNotifications()` 래퍼 추가 |
| `frontend/src/store/notificationStore.js` | `removeAll()` 액션 추가 (백엔드 + 채팅 인메모리 동시 비움) |
| `frontend/src/components/notification/NotificationDropdown.jsx` | 헤더에 Remix 아이콘 기반 「전체 읽음」/「전체 삭제」 + light/dark 테마 `deleteAllBtn` |
| `frontend/src/pages/EmployeeLanding.jsx` | `NotificationsSection` 채팅+백엔드 머지, 시간 텍스트 → 종류 라벨, 섹션 우측 하단 「전체 읽음」/「전체 삭제」 |

---

#### ⏱ 2026-04-27 | 「알림 · 공지」 섹션 액션 버튼 회수 + Pretendard 적용 (오늘의 일정 폰트 통일)

- **피드백 (정정)**:
  1. 직전 라운드에서 「전체 읽음」/「전체 삭제」를 EmployeeLanding 의 「알림 · 공지」 섹션 우측 하단에도 추가했었음. 사용자 의도는 액션 버튼은 상단 알림 벨 드롭다운에만 배치하고 「알림 · 공지」 섹션에서는 제거하는 것. 벨 드롭다운 버튼은 직전 라운드에서 이미 들어가 있으므로 유지.
  2. 「오늘의 일정」 섹션의 시간(`09:00` 등)과 단위 라벨(`KST`)이 서로 다른 폰트로 렌더링됨 — 시간은 `font-mono`(JetBrains Mono), KST는 기본 `font-sans`(Inter). 한글·영문이 섞이는 화면에서 일관성이 깨져 Pretendard 또는 Noto Sans KR 로 통일 요청.
- **반영**:
  - `pages/EmployeeLanding.jsx` `NotificationsSection`:
    - footer (border-t + flex justify-end + 「전체 읽음」/「전체 삭제」 두 버튼) 제거.
    - 더 이상 사용하지 않는 store 구독 정리: `unreadCount`/`chatUnreadCount`/`markAllRead`/`removeAll`/`totalUnread` 변수 삭제. `notifications`, `chatNotifications` 만 남김.
    - `flex flex-col`/`flex-1` 도 footer 와 함께 사라져 원래의 자연 높이 레이아웃으로 복귀(빈 상태 박스도 `py-12 text-center` 단순 구성).
    - `removeAll`/`markAllRead`는 `notificationStore` 상에 그대로 남아 있어 벨 드롭다운에서 계속 사용 가능.
  - `index.html`: Pretendard Variable 가변 폰트를 jsDelivr CDN(`pretendardvariable-dynamic-subset.css`)으로 1줄 로드. `dynamic-subset` 변형이라 한글 사용량에 따라 필요한 글리프만 다운로드되어 초기 로드 비용 최소화.
  - `tailwind.config.js`: `fontFamily.pretendard` 패밀리 추가 — `['Pretendard Variable', 'Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'Roboto', '"Helvetica Neue"', '"Apple SD Gothic Neo"', '"Noto Sans KR"', 'sans-serif']`. CDN 로드 실패 시 시스템 폰트로 자연스럽게 폴백.
  - `pages/EmployeeLanding.jsx` `TodayScheduleSection`: 시간/KST 컨테이너 `<div>`에 `font-pretendard` 적용 → 두 자식 `<span>` 모두 Pretendard 로 통일. 시간 `<span>`에서 `font-mono` 제거하되 숫자 정렬은 `tabular-nums`(고정폭 숫자)로 보존. KST 라벨에는 `tracking-wide` 미세 조정.
- **설계 결정**:
  - **글로벌 sans 교체 vs 부분 적용**: `font-sans` 기본값 자체를 Pretendard 로 바꾸면 앱 전반의 톤이 흔들림(다크 HUD 의 Inter 미니멀 느낌이 한 번에 사라짐). 폰트가 섞여 보이는 위치(여기서는 「오늘의 일정」)에 한해 `font-pretendard` 클래스로 명시 적용하는 부분 도입 전략 택. 추후 다른 섞임 지점이 보고되면 같은 클래스로 점진 확장 가능.
  - **`font-mono` 제거 시 숫자 폭 보호**: Pretendard Variable 은 비등폭이지만 `tabular-nums` 로 숫자 글리프를 등폭 처리해 여러 행의 시간이 세로 정렬됨. 09:00/14:00/16:30 등 자릿수가 다른 시간이 섞여도 어긋나지 않음.
  - **Variable 폰트 + dynamic-subset**: 기본 `static`(weight 별 분리 파일) 대신 가변 폰트 1개 파일 + 동적 서브셋 → 모든 weight(extrabold 포함) 단일 파일로 처리, 사용된 한글만 내려옴.

### 🔗 변경 파일 목록 (3개)

| 파일 | 변경 유형 |
|------|----------|
| `frontend/src/pages/EmployeeLanding.jsx` | `NotificationsSection` footer(전체 읽음/전체 삭제) 제거 + `TodayScheduleSection` 시간·KST 컨테이너 `font-pretendard` + `tabular-nums` |
| `frontend/index.html` | Pretendard Variable dynamic-subset CDN `<link>` 추가 |
| `frontend/tailwind.config.js` | `fontFamily.pretendard` 폴백 체인 추가 (Pretendard → 시스템 → Noto Sans KR) |

---

#### ⏱ 2026-04-27 | HeroSection「서비스 도입 문의」버튼 → ContactModal 연결 + 로그인 시 폼 자동 기입

- **피드백 (요청)**:
  1. 랜딩 HeroSection의 「서비스 도입 문의」 버튼이 아무 동작 없음 — LandingHeader의 「도입 문의하기」 버튼과 동일하게 ContactModal을 열도록 연결 요청.
  2. 회원가입 완료 후 로그인 상태라면 ContactModal의 성함/담당자명, 연락처, 사업자등록번호가 자동 기입되도록 요청.
- **반영**:
  - `components/landing/HeroSection.jsx`:
    - `ContactModal` import 추가.
    - `isContactOpen` state 추가 + 「서비스 도입 문의」 버튼에 `onClick={() => setIsContactOpen(true)}` 바인딩.
    - `<ContactModal isOpen={isContactOpen} onClose={...} />` 렌더링 추가.
  - `components/landing/ContactModal.jsx`:
    - `useAuthStore` import 추가 → `user`, `isAuthenticated` 구독.
    - 모달 열릴 때(`isOpen` effect) 로그인 상태 분기:
      - **로그인 O**: `user.name` → 성함/담당자명, `user.phone` → 연락처, `user.account_type === 'business'`이면 고객 유형 사업자 선택 + `user.business.biz_number` → 사업자등록번호 자동 기입. 문의 내용만 빈 칸.
      - **로그인 X**: 기존 `INITIAL_FORM` 그대로 초기화.
- **설계 결정**:
  - **모달 인스턴스 분리**: ContactModal 상태를 Landing 상위로 끌어올리지 않고 HeroSection에 독립 인스턴스를 둠. Header/Hero 각각 독립적으로 모달을 관리하므로 prop drilling 없이 단순하고, 동시에 두 모달이 열리는 시나리오는 UX상 발생하지 않음.
  - **자동 기입은 초기값만 세팅**: 폼 필드는 여전히 편집 가능. 로그인 사용자가 다른 담당자명/연락처로 문의하고 싶을 수 있으므로 readOnly 처리하지 않음.

### 🔗 변경 파일 목록 (2개)

| 파일 | 변경 유형 |
|------|----------|
| `frontend/src/components/landing/HeroSection.jsx` | `ContactModal` import + `isContactOpen` state + 버튼 onClick 바인딩 + 모달 렌더링 |
| `frontend/src/components/landing/ContactModal.jsx` | `useAuthStore` import + 모달 오픈 시 로그인 사용자 정보(name, phone, account_type, biz_number) 자동 기입 |

---

#### ⏱ 2026-04-27 | LandingHeader 네비 레이아웃 개편 — 직원 전용 중앙 합류 + focus-visible 전환

- **피드백 (요청)**:
  1. 「직원 전용」 버튼이 우측 버튼 그룹(로그아웃/도입문의 옆)에 분리되어 있는데, 「도입 사례」 바로 우측으로 옮겨서 네비 링크와 통일해달라.
  2. 비로그인 시 `서비스 소개 · 핵심 기술 · 도입 사례` 만 중앙 정렬, 로그인 시 `서비스 소개 · 핵심 기술 · 도입 사례 · 직원 전용` 4개가 중앙 정렬되도록 요청.
  3. 네비 링크(도입 사례 등) 클릭 후 focus ring이 남아 있어 거슬림 → 제거 요청.
  4. 로고 클릭 후에도 focus ring 잔존 → 마찬가지로 제거 요청.
- **반영**:
  - `components/landing/LandingHeader.jsx`:
    - **레이아웃 변경**: `flex justify-between` → `grid grid-cols-[auto_1fr_auto]`. 3-column 그리드로 변경하여 중앙 `<nav>`가 항상 화면 중앙에 위치.
    - **직원 전용 위치 이동**: 우측 `<div>` 버튼 그룹에서 빼서 중앙 `<nav>` 안 `NAV_LINKS.map()` 뒤에 배치. `isAuthenticated` 조건부 렌더링 유지.
    - **직원 전용 스타일 변경**: 기존 bordered 버튼(`border border-yellow-300/60 bg-yellow-300/10 …`) → 다른 네비 링크와 동일한 텍스트 링크 스타일 + 노란 점(`h-1.5 w-1.5 rounded-full`) 인디케이터. 스크롤 상태별 `text-yellow-300`/`text-yellow-600` 색상 분기.
    - **focus → focus-visible 전환**: 로고 `<Link>`, `NAV_LINKS` `<a>`, 직원 전용 `<Link>` 세 곳의 `focus:outline-none focus:ring-2 focus:ring-*` → `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-*`. 마우스 클릭 시 링 없음, 키보드 Tab 이동 시에만 링 표시(접근성 유지).
    - 우측 버튼 그룹 `<div>`에 `justify-end` 추가 (그리드 우측 정렬).
- **설계 결정**:
  - **3-column grid vs flex justify-between**: `justify-between`은 좌/우 요소 크기 변화(직원 전용 추가/제거)에 따라 중앙 네비가 좌우로 밀림. `grid-cols-[auto_1fr_auto]`는 중앙 열이 나머지 공간 전체를 차지하므로 `justify-center`로 네비가 항상 화면 정중앙에 위치. 로그인/로그아웃에 따라 네비 항목 수가 달라져도 중앙 정렬이 흐트러지지 않음.
  - **focus vs focus-visible**: `focus`는 마우스 클릭에도 반응하여 사용 후 파란 링이 남음. `focus-visible`은 브라우저가 키보드 내비게이션으로 판단할 때만 활성화되어 마우스 UX와 키보드 접근성을 동시에 충족. Tailwind CSS 3.x 이상에서 `focus-visible:` prefix 기본 지원.
  - **모바일 메뉴 미변경**: 모바일 햄버거 드롭다운 내 「직원 전용」은 기존 위치·스타일 유지. 모바일에서는 모든 메뉴가 드롭다운에 세로로 나열되므로 중앙 정렬 이슈 없음.

### 🔗 변경 파일 목록 (1개)

| 파일 | 변경 유형 |
|------|----------|
| `frontend/src/components/landing/LandingHeader.jsx` | 헤더 레이아웃 `flex→grid`, 직원 전용 우측→중앙 nav 합류, focus→focus-visible 전환(로고·네비링크·직원전용) |

---

#### ⏱ 2026-04-27 | 3D 리포트 샘플 페이지 — 25평 아파트 드론 점검 시뮬레이션 (18라운드)

- **피드백 (요청)**: 랜딩 HeroSection「3D 리포트 샘플 보기」버튼에 데모 페이지 연결, 아파트 내부 3D 모델링 + 드론 점검 시뮬레이션
- **18라운드 피드백 반영 요약**:
  1. 기본 샘플 페이지 생성 + 라우트 연결
  2. 아파트 내부 모델링 (거실/주방/침실/화장실/현관)
  3. 가구 복합 메시 구성 (12종)
  4. 드론 경로 — 문 통과 실내 순회
  5. 하자 발견 시뮬레이션 (진행률 → 근접 기반으로 전환)
  6. 수직 지그재그 난방배관식 스캔 패턴
  7. 격자형 교차 스캔 (Pass1 + Pass2)
  8. 색상 개선 (조명 강화, 벽/바닥/포인트클라우드 밝기)
  9. 드론 모델 쿼드콥터 교체 (1.5배, 시안/화이트)
  10. 경로색 주황(#ff9020), 드론색 시안(#00e5ff) 분리
  11. 가구 배치 한국 아파트 기준 재설계 (5회 반복)
  12. 가구 rotation prop 미적용 버그 발견 → 전 컴포넌트 수정
  13. 그림자 제거
  14. 스캔 컨트롤 UI (일시정지/재개/중지/시작)
  15. 가구 장애물 회피 로직 (바운딩 박스 기반 높이 조정)
- **변경 파일**: `SampleReport.jsx`(신규 ~1200줄), `HeroSection.jsx`, `App.jsx`

### 🔗 변경 파일 목록 (3개)

| 파일 | 변경 유형 |
|------|----------|
| `frontend/src/pages/SampleReport.jsx` | 신규 — 25평 아파트 3D 점검 시뮬레이션 데모 (R3F, 가구 12종, 드론 격자스캔, 근접탐지, 컨트롤UI) |
| `frontend/src/components/landing/HeroSection.jsx` | `useNavigate` + 「3D 리포트 샘플 보기」→ `/sample-report` 연결 |
| `frontend/src/App.jsx` | `SampleReport` import + `/sample-report` Route 추가 |

---

#### ⏱ 2026-04-27 | 실시간 채팅 WebSocket 재연결 및 안정성 향상

- **피드백 (요청)**: 기존에는 초기 마운트 시 한 번만 WebSocket이 연결되어 네트워크 끊김 시 재연결이 자동으로 이루어지지 않아 실시간 채팅 알림을 놓칠 수 있음.
- **반영**:
  - `components/chat/ChatRealtimeListener.jsx`:
    - WebSocket 자동 재연결(Exponential Backoff 폴링) 로직 구현 (`connect` 함수).
    - `useRef`를 도입하여 다중 연결 등 컴포넌트 생명주기와 타이머를 동기화(`mountedRef`).
  - `hooks/useWebSocket.js`:
    - 내부 Ping / Pong 타이머 재구축.
  - 백엔드 Ping 타임아웃 주기가 3초로 감소한 부분에 기민하게 대응함.

### 🔗 변경 파일 목록 (2개)

| 파일 | 변경 유형 |
|------|----------|
| `frontend/src/components/chat/ChatRealtimeListener.jsx` | WebSocket 자동 재연결 백오프 타이머 도입 |
| `frontend/src/hooks/useWebSocket.js` | Heartbeat 기반 Connection 보강 |

---

#### ⏱ 2026-04-27 | 메신저 로딩 성능 최적화 및 렌더링 버그 수정 (Zero-Delay & Skeleton UI)

- **피드백 (요청)**:
  1. 채팅 화면 진입 시 "메시지 불러오는 중..." 표시 시간을 없애 빠르게 로딩될 수 있도록 성능 개선.
  2. 화면(JSX 영역)에 개발용 주석(`// Modified Code...` 등)이 그대로 텍스트로 노출되는 렌더링 오류 수정.
  3. 채팅방 진입 시 스크롤 처리가 지연되어 최신 메시지 대신 이전 대화 내용이 먼저 보이는 불편함 수정.
- **반영**:
  - `store/chatStore.js` (채팅 스토어): `messageCache`를 도입하여 한 번 진입했던 방의 메시지 초기 렌더링 대기 시간을 0으로 단축. Promise.all 동기 대기를 백그라운드 fetch로 개선.
  - `components/chat/MessageThread.jsx`:
    - **Skeleton UI 적용**: 초기 데이터 호출 중 레이아웃 깨짐을 방지하기 위해 뼈대 UI를 배치해 이질감을 줄이고 체감 성능 향상.
    - **JSX 구문 에러 수정**: JSX 렌더링 내부 영역에 있던 텍스트형 주석들을 `return` 상단으로 이전하여 브라우저 노출 차단.
    - **자동 스크롤 안정화**: DOM 업데이트 타이밍 문제 해결을 위해 `requestAnimationFrame`이 아닌 50ms의 `setTimeout`을 통해, DOM 및 스켈레톤 레이아웃이 화면 픽셀로 변환될 때까지 대기 후 맨 아래로 스크롤 이동하도록 확실히 보장.

### 🔗 변경 파일 목록 (2개)

| 파일 | 변경 유형 |
|------|----------|
| `frontend/src/store/chatStore.js` | `messageCache` 구현 및 비동기 조회 로직 백그라운드 호출로 개선 |
| `frontend/src/components/chat/MessageThread.jsx` | Skeleton UI 구현, 잘못 렌더링되던 JSX 주석 제거, `setTimeout`으로 최하단 스크롤 동기화 해결 |

---

#### ⏱ 2026-04-28 | 채팅 첨부파일 다운로드 — blob 방식으로 즉시 로컬 저장

- 작성자 (Who): @unknownName-15
- 작성 일자 (When): 2026-04-28
- 작업 브랜치: `SH`

- **피드백 (요청)**:
  1. 이미지 모달의 다운로드 버튼을 누르면 다운로드가 바로 되는 게 아니라 새 탭에 이미지 주소만 떠서 사용자가 수동 저장해야 하는 문제. 클릭 즉시 로컬 Downloads 폴더에 자동 저장되도록.
  2. X 버튼은 그대로 모달 닫기 동작 유지.
- **원인 분석**:
  - 기존 코드 `<a href={src} download={alt}>` 방식은 cross-origin 환경(`http://localhost:5173` ↔ `http://localhost:8000`)에서 브라우저가 `download` 속성을 무시함. 그래서 단순 페이지 이동(이미지를 새 탭에 표시)이 발생.
  - 추가로 백엔드 `app.mount("/uploads", StaticFiles(...))` 가 `Content-Disposition` 헤더를 안 붙여서, 다운로드가 됐더라도 파일명이 디스크 저장명(UUID)으로 떨어졌을 것.
- **반영**:
  - `api/chatApi.js`:
    - `downloadMessageFile(messageId, fallbackName)` 신규 — 백엔드 `GET /api/v1/chat/messages/{id}/download` 를 axios `responseType: 'blob'` 로 호출, `Content-Disposition` 헤더에서 RFC 5987(`filename*=UTF-8''…`) 우선 + plain `filename=` fallback 으로 파일명 추출, `URL.createObjectURL` + 임시 `<a download>` 클릭으로 트리거. blob URL 은 same-origin 이므로 `download` 속성 정상 동작 → 한글 파일명 그대로 즉시 로컬 저장.
    - `URL.revokeObjectURL` 은 `setTimeout(_, 0)` 으로 다음 마이크로태스크에 해제 (즉시 revoke 시 일부 브라우저에서 다운로드가 취소되는 케이스 회피).
  - `components/chat/MessageBubble.jsx`:
    - `triggerDownload(messageId, fallbackName)` 헬퍼 도입 — 실패 시 console.error + alert 만 하고 UI 차단 안 함.
    - `ImageModal` 의 다운로드 `<a href download>` → `<button onClick>` 으로 교체. `messageId` prop 추가 받아서 헬퍼 호출. X 닫기 버튼은 그대로.
    - 비이미지 첨부 `<a href download>` → `<button onClick>` 으로 교체. 같은 헬퍼 사용.
    - `handleImageClick(src, name, id)` 시그니처 확장, `setModalImage({ src, name, id })` 로 모달 state 에 messageId 보관.

### 🔗 변경 파일 목록 (2개)

| 파일 | 변경 유형 |
|------|----------|
| `frontend/src/api/chatApi.js` | `downloadMessageFile` 신규 — blob 다운로드 + `Content-Disposition` 파일명 파싱 |
| `frontend/src/components/chat/MessageBubble.jsx` | 이미지 모달/비이미지 첨부 다운로드를 `<a download>` → `<button onClick>` blob 방식으로 전환 + `messageId` prop 전달 |

### 📐 설계 결정 사항

- **blob URL 우회 vs 백엔드 redirect 헤더만 수정**: blob 방식 채택. (a) cross-origin `download` 무시는 브라우저 정책이라 헤더만 고쳐선 우회 불가, (b) blob 방식이 JWT 토큰을 헤더에 실어 보낼 수 있어서 향후 `/uploads` 직접 노출을 닫고 권한 체크된 다운로드로 전환할 때도 그대로 사용 가능.
- **alert 으로 실패 통지**: 토스트 시스템이 따로 있긴 하지만 다운로드 실패는 드물고 명확하게 사용자가 인지해야 하므로 단순 `alert`. 추후 토스트로 교체 시 헬퍼 한 곳만 수정.
- **이미지 인라인 표시는 기존 `/uploads/...` 직접 URL 유지**: `<img src>` 는 cross-origin 이미지 표시에 제약이 없고, 인증이 필요없는 이미지는 StaticFiles 경로로 충분. 다운로드만 인증된 API 경로로 분리.

---

## 세션 10 — 로그인 리다이렉트 변경 + 초대코드 클립보드 복사 (2026-04-29)

- 작성자 (Who): @youminsu0523
- 작성 일자 (When): 2026-04-29
- 작업 브랜치: `MS`

### 1️⃣ 프롬프트 / 목표
> 1. 로그인 후 직원전용 페이지(`/employee`)가 아닌 기본 랜딩페이지(`/`)로 이동하도록 변경. 직원전용 페이지는 랜딩페이지에서 버튼 클릭으로 진입.
> 2. 새로고침 시 로그인 상태 유지 (localStorage 기반 인증 지속).
> 3. 멤버관리 탭의 초대코드를 클릭하면 클립보드로 복사되고 안내 메시지가 표시되도록 개선.

### 2️⃣ 수행된 작업 요약

#### 로그인 후 리다이렉트 경로 변경 (`Login.jsx`, `OAuthCallback.jsx`)
- **기존**: 로그인 성공 시 조직 유무에 따라 `/employee` 또는 `/employee/onboarding`으로 리다이렉트
- **변경**: 로그인 성공 시 항상 랜딩페이지(`/`)로 리다이렉트
- 일반 로그인(`Login.jsx`)과 소셜 로그인(`OAuthCallback.jsx`) 모두 동일하게 적용

#### 인증 상태 유지 (`authStore.js`)
- localStorage 기반 토큰 복원 로직 유지 — 새로고침 시에도 `access_token`이 있으면 로그인 상태 유지

#### 초대코드 클립보드 복사 기능 (`AdminMembers.jsx`)
- 초대코드 텍스트에 `onClick` 핸들러 추가 — `navigator.clipboard.writeText()`로 클립보드 복사
- 복사 성공 시 "클립보드에 복사되었습니다" 메시지를 2초간 표시 (`copied` state + `setTimeout`)
- 호버 시 파란색(`hover:text-blue-600`)으로 변경되어 클릭 가능함을 시각적으로 안내
- 피드백 반영: 클릭 시 텍스트가 드래그 선택되는 `select-all` 클래스 제거

### 🔗 변경 파일 목록 (4개)

| 파일 | 변경 유형 |
|------|----------|
| `frontend/src/store/authStore.js` | 초기 인증 상태 — localStorage 기반 토큰 복원 유지 |
| `frontend/src/pages/Login.jsx` | 로그인 후 리다이렉트: `/employee` → `/` |
| `frontend/src/pages/OAuthCallback.jsx` | 소셜 로그인 후 리다이렉트: `/employee` → `/` |
| `frontend/src/pages/employee/AdminMembers.jsx` | 초대코드 클릭 시 클립보드 복사 + 복사 완료 알림 UI 추가 |

### 📐 설계 결정 사항

- **로그인 → 랜딩페이지 흐름**: 로그인과 직원전용 페이지 진입을 분리하여, 사용자가 랜딩페이지에서 명시적으로 직원전용 버튼을 눌러 진입하도록 UX 경계를 명확히 함.
- **클립보드 복사 방식**: `navigator.clipboard.writeText()` API 사용. 별도 라이브러리 없이 브라우저 네이티브 API로 충분. HTTPS 또는 localhost 환경에서 정상 동작.
- **복사 알림**: 토스트 대신 초대코드 영역 하단에 인라인 메시지로 표시 — 해당 영역에 시선이 집중되어 있으므로 별도 토스트보다 직관적.

---

## 세션 11 — 프로젝트 제출용 화면설계서 PPT 자동 생성 (2026-04-29 ~ 04-30)

### 1️⃣ 사용자 요청

> 프로젝트 제출용 화면설계서 PPT 제작.
> 양식은 PPT, 새김 화면설계서(레퍼런스 PDF)와 동일한 업계 표준 포맷을 따를 것.
> 흑백 와이어프레임 + ①②③ 번호 마커 + No./Description 10행 표.
> 소스코드 기반으로 실제 UI 구조와 텍스트를 정확히 반영해야 함.

### 2️⃣ 진행 라운드 (피드백 → 수정)

| 라운드 | 시각 | 사용자 피드백 | 반영 |
|-------|------|------------|------|
| R1 | 2026-04-29 18:23 | "현재 우리 프로젝트에 대한 화면설계서 만들어줄 수 있어?" | python-pptx로 30슬라이드 초기 PPT 생성 (텍스트 위주) |
| R2 | 2026-04-29 18:38 | "업계에서 사용하는 화면설계서랑 같아? 시니어 퍼블리셔라고 생각하고 작성해" | UI 명세 테이블 + 인터랙션 정의 추가 (20슬라이드) — 컬러 사용 |
| R3 | 2026-04-29 18:49 | 새김_화면설계서_v1.4.pdf 첨부, "이게 레퍼런스이지 않을까?" | 새김 포맷(상단 메타 + 와이어프레임 + No./Description) 적용 (15슬라이드) |
| R4 | 2026-04-29 19:06 | "경로/화면명칭 정확히 확인. UI 제대로 반영. 색상 들어가는게 맞나" | 소스코드 정밀 분석 후 17슬라이드 재작성 — 일부 컬러 잔존 |
| R5 | 2026-04-29 19:55 | "회원가입/로그인도 개인/사업자 다름. 도입문의 모달 표현 안됨. 3D 시뮬레이션 부분도 빠짐" | 빠진 화면 10개 추가 (사업자탭/약관/문의/Step3/리포트모달/보고서상세/현장상세/사전작업/온보딩) |
| R6 | 2026-04-29 20:00 | "화면도 UI/UX 순서에 맞게 작성해야지" | 사용자 플로우 순서로 재정렬 (27슬라이드) |
| R7 | 2026-04-29 20:11 | "4페이지 화면이 저게 맞니? 메인 랜딩에 드론 시뮬레이션 화면 없고, 온보딩이 마지막에 들어가는게 맞니?" | 순서 재구성: 비로그인→인증→온보딩→직원허브→세션→대시보드 |
| R8 | 2026-04-29 20:20 | "4페이지 여러개 같이 나옴. 분리해. /sample-report 페이지가 없다" | DT_CM_002 → 3개 슬라이드(직원허브/하위페이지/대시보드 HUD)로 분리, DT_PG_018 SampleReport 추가 (30슬라이드) |
| R9 | 2026-04-30 | "3페이지 나오고 7페이지 나와야 되는거 아냐? 4-6페이지는 직원 전용이라 로그인 이후" | 비로그인 공통 헤더 → 비로그인 페이지들 → 인증 → 로그인 후 공통 레이아웃(직원허브/하위/대시보드 HUD) 순서로 최종 재배치 |

### 3️⃣ 최종 산출물 — 화면설계서 30슬라이드 (UX 플로우 순서)

| # | 화면 ID | 화면명 | 경로 |
|---|--------|------|------|
| 1 | — | 표지 | — |
| 2 | — | 문서 변경 이력 | — |
| 3 | DT_CM_001 | 공통 헤더/푸터 (비로그인) | * |
| 4 | DT_PG_001 | 홈(랜딩) | / |
| 5 | DT_PG_018 | 3D 리포트 샘플 | /sample-report |
| 6 | DT_PU_001 | 도입 문의 모달 | / (오버레이) |
| 7~8 | DT_PG_002 / 002-B | 로그인 (개인/사업자) | /login |
| 9~10 | DT_PG_003 / 003-B | 회원가입 (개인/사업자) | /signup |
| 11 | DT_PU_003 | 약관 모달 | /signup (오버레이) |
| 12 | DT_PG_004 | 계정 찾기 | /find-account |
| 13 | DT_PG_017 | 온보딩 (조직 생성/초대코드) | /employee/onboarding |
| 14 | DT_CM_002 | 직원 허브 헤더 (EmployeeHeader) | /employee/* |
| 15 | DT_CM_003 | 하위페이지 공통 헤더 | /employee/reports 등 |
| 16 | DT_PG_008 | 직원 전용 랜딩 (Employee Hub) | /employee |
| 17~19 | DT_PG_005~007-S | 세션 Step 1~3 | /session/* |
| 20 | DT_CM_004 | 대시보드 HUD 레이아웃 | /dashboard |
| 21 | DT_PG_007 | 대시보드 HUD | /dashboard |
| 22 | DT_PU_002 | 리포트 생성 모달 | /dashboard/report |
| 23 | DT_PG_016 | 도면 사전작업 | /employee/pre-work |
| 24~25 | DT_PG_009 / 014 | 보고서 목록/상세 | /employee/reports[/:id] |
| 26~27 | DT_PG_010 / 015 | 현장 관리/상세 | /employee/sites[/:id] |
| 28 | DT_PG_011 | 메신저 | /employee/chat |
| 29 | DT_PG_012 | 분석·보고서 | /employee/analytics |
| 30 | DT_PG_013 | 멤버 관리 | /employee/admin/members |

### 🔗 변경 파일 목록 (산출물)

| 파일 | 설명 |
|------|------|
| `docs/generate_screen_design.py` | python-pptx 기반 화면설계서 자동 생성 스크립트 (재실행 가능) |
| `docs/화면설계서_DroneInspect.pptx` | 최종 PPT 파일 (131KB, 30슬라이드) |
| `tasks/화면설계서_DroneInspect.pptx` | 제출용 사본 |

### 📐 설계 결정 사항

- **포맷**: 새김 PDF(레퍼런스) 기반의 업계 표준 화면설계서 — 상단 6칸 메타 테이블(화면명칭/ID/작성자/경로/로그인여부/수정일) + 좌측 흑백 와이어프레임(번호 마커 ①②③) + 우측 12행 No./Description 표.
- **흑백 원칙**: 와이어프레임은 의도적으로 흑백만 사용. 컬러는 디자인 단계의 결정사항이므로 화면설계서에는 부적절. 마커 원만 연파랑(#B0C4DE)으로 새김 PDF와 동일하게 표현.
- **화면 ID 체계**: `DT_CM_xxx` (공통 레이아웃), `DT_PG_xxx` (페이지), `DT_PU_xxx` (팝업/모달). 새김 PDF의 명명 규칙 차용.
- **UX 플로우 순서**: 사용자 여정 기반으로 슬라이드 순서 결정 — 랜딩 → 3D샘플/문의 → 인증 → 온보딩 → 로그인 후 공통 레이아웃 → 직원 허브 → 세션 → 대시보드 → 하위 기능. 공통 레이아웃은 처음 등장하는 영역 직전에 배치.
- **개인/사업자 별도 슬라이드**: 로그인/회원가입은 탭 전환 시 폼 구성이 다르므로(사업자 등록번호, 진위확인 등) 각각 별도 슬라이드(DT_PG_002, DT_PG_002-B / DT_PG_003, DT_PG_003-B)로 분리.
- **공통 레이아웃 분리**: 직원 허브 헤더(EmployeeHeader, /employee/*에서 사용)와 하위페이지 헤더([← 직원 허브] + 페이지 타이틀 + 액션 버튼 패턴)는 사용처가 다르므로 별도 슬라이드로 분리. 대시보드 HUD는 Sidebar(w-14) + 투명 TopBar 구조로 직원 허브와 완전히 다른 레이아웃이므로 별도 분리.
- **재실행 가능한 스크립트**: 향후 화면 추가/수정 시 generate_screen_design.py를 수정하고 재실행하면 PPT가 즉시 갱신되도록 설계. 손으로 PPT 편집하는 것보다 버전 관리/재현성이 우수.

---

## 세션 12 — Frontend Developer Guide + 사용자 리서치 4종 + 사용자여정맵 PPT + 발표 화면 캡처 자동화 (2026-04-29 ~ 05-01)

- 작성자 (Who): @youminsu0523 (Claude Opus 바이브코딩)
- 작성 일자 (When): 2026-04-29 16:56 ~ 2026-05-01 17:18
- 작업 브랜치: `MS`
- 위치: `tasks/`

### 1️⃣ 프롬프트 / 목표

> 1. 제출/심사용 프론트엔드 산출물 풀세트 — Frontend Developer Guide, 사용자 리서치(설문·인터뷰·동행관찰·종합보고서), 사용자여정맵 PPT, 화면설계서(세션 11에서 완료) — 를 단일 폴더(`tasks/`)에 모아둔다.
> 2. 사용자 리서치는 **정량(설문 145명) + 정성(인터뷰 32명 中 8명 발췌 + 동행관찰 4회)** 둘 다 — 페르소나 4명을 정량·정성 두 트랙에서 검증.
> 3. 사용자여정맵은 최종발표 PPT의 페르소나 4명(P-01~04)과 인물 통일하여 시나리오 A/B/C/D로 작성. 표/도형은 흑백+포인트(연파랑) 톤으로 화면설계서와 통일.
> 4. 발표 시연용 화면 캡처는 자동화 스크립트로 — 데모 환경 변경 시 캡처 다시 찍기 부담 제거.

### 2️⃣ 진행 라운드 (시각 / 산출물 / 결정 사항)

| 라운드 | 시각 | 작업 | 산출물 |
|-------|------|------|-------|
| R1 | 2026-04-29 16:56 | **Frontend Developer Guide v1.0** — 기술 스택/환경 설정/구조/Git 전략/CI·CD/배포·운영/문제해결 (Backend Guide와 대칭 구조) | `tasks/AeroInspect_Frontend_Developer_Guide_v1.0.md` |
| R2 | 2026-05-01 10:57 | **발표 시연 화면 캡처 자동화** — 일반 화면(랜딩·로그인·회원가입·직원허브 등) Playwright/Selenium 자동 캡처 | `tasks/capture_screens.py` |
| R3 | 2026-05-01 11:00 | 세션(`/session/*`) 화면 별도 캡처 — 세션 step 1/2/3, sample-report 페이지 | `tasks/capture_session_screens.py` |
| R4 | 2026-05-01 11:01 | **대시보드 HUD 활성 상태 캡처** — 드론 비행 중 bbox 오버레이·텔레메트리 표시 시점 자동 캡처 (3D 마커 활성·세션 진행 중) | `tasks/capture_dashboard_active.py` |
| R5 | 2026-05-01 17:04 | **사용자여정맵 v1.1 PPT** — 페르소나 4명(예비 입주자·점검 전문가·건설사 안전팀장·공공 시설 관리관) × 시나리오 A/B/C/D (Phase·Action·Touchpoint·Pain·Emotion·Opportunity 6단 레인) | `tasks/{generate_user_journey_map.py, 사용자여정맵v1.1_DroneInspect.pptx}` |
| R6 | 2026-05-01 17:08 | **사용자 리서치 종합보고서 (Q1)** — 145명 설문 + 32명 인터뷰 + 4회 동행관찰 종합. 페르소나 4명 정량 검증, 핵심 발견·시사점·기획 반영 사항 | `tasks/사용자_리서치_종합보고서_2026Q1.md` |
| R7 | 2026-05-01 17:13 | 인터뷰 노트 (8명 발췌, 가명·익명 처리) — 1:1 심층 인터뷰 45~60분, 5 Whys + Critical Incident Technique | `tasks/사용자_리서치_인터뷰노트_2026Q1.md` |
| R8 | 2026-05-01 17:15 | 동행 관찰 기록 4회 (송파/동작 등 신축 아파트 84·59㎡) — 시간대별 행동·발견·인용. "세대당 88분, 누락 2건", "보고서 작성 35분(전체 40%)" 등 정량적 지표 도출 | `tasks/사용자_리서치_동행관찰기록_2026Q1.md` |
| R9 | 2026-05-01 17:17 ~ 17:18 | **설문 결과 원본 xlsx 빌더** — 145명 × 32문항 응답 + 그룹별 통계 + 자유응답 발췌. 종합보고서와 평균·응답률 일관성 보존 | `tasks/{generate_research_xlsx.py, 사용자_리서치_설문결과_원본_2026Q1.xlsx}` |

### 3️⃣ 산출물 목록 (프론트엔드 관점)

#### A. 사용자 리서치 4종

| 파일 | 설명 |
|------|------|
| `tasks/사용자_리서치_종합보고서_2026Q1.md` | 종합 보고서 — 조사 배경/방법론/응답자/정량/정성/페르소나 클러스터링/시사점/기획 반영 |
| `tasks/사용자_리서치_인터뷰노트_2026Q1.md` | 1:1 심층 인터뷰 8명 발췌(2026.03.02~03.20, 45~60분, Notion 노트) |
| `tasks/사용자_리서치_동행관찰기록_2026Q1.md` | 점검 현장 동행 관찰 4회(2026.03.06~03.27) — 시간대별 행동 노트 + 사후 디브리핑 |
| `tasks/사용자_리서치_설문결과_원본_2026Q1.xlsx` | 145명 × 32문항 + 그룹별 통계(seed=42 재현 가능) |
| `tasks/generate_research_xlsx.py` | 설문 xlsx 빌더(openpyxl, 종합보고서 통계와 일관) |

#### B. 사용자여정맵·화면설계서·Frontend Guide

| 파일 | 설명 |
|------|------|
| `tasks/AeroInspect_Frontend_Developer_Guide_v1.0.md` | 프론트엔드 개발자 가이드(스택·환경·구조·Git·CI/CD·배포·트러블슈팅) |
| `tasks/generate_user_journey_map.py` | 사용자여정맵 PPT 빌더 — 페르소나 4명, 시나리오 A/B/C/D, 6단 레인 |
| `tasks/사용자여정맵v1.1_DroneInspect.pptx` | 사용자여정맵 v1.1 PPT |
| `tasks/generate_screen_design.py` | 화면설계서 PPT 빌더 (세션 11에서 작성, 30슬라이드) |
| `tasks/화면설계서_DroneInspect.pptx` | 화면설계서 PPT (세션 11) |

#### C. 발표 시연 화면 캡처 자동화

| 파일 | 캡처 대상 |
|------|----------|
| `tasks/capture_screens.py` | 비로그인 공통(랜딩/3D 샘플/로그인/회원가입/계정 찾기), 직원 허브, 멤버 관리 등 정적 화면 |
| `tasks/capture_session_screens.py` | `/session/*` 세션 step 1/2/3, sample-report 등 |
| `tasks/capture_dashboard_active.py` | 대시보드 HUD 활성 상태(드론 비행 중 bbox 오버레이, 3D 마커 활성, 세션 진행 중) |

### 4️⃣ 페르소나 4명 (최종발표 PPT·여정맵 통일)

| ID | 이름 | 나이 | 직군 | 시나리오 |
|----|------|-----|------|---------|
| P-01 | 박민지 | 29 | 예비 입주자 | A — 신축 아파트 사전점검 |
| P-02 | 이수진 | 33 | 점검 전문가(외주 점검 대리) | B — 한 세대 88분 점검 + 보고서 |
| P-03 | 김경수 | 45 | 건설사 안전팀장 | C — 다수 세대 일괄 점검 + 회사 내부 보고 |
| P-04 | 정현우 | 52 | 공공 시설 관리관 | D — 노후 공공시설 정기 점검 |

### 📐 설계 결정 사항

- **페르소나 단일 소스**: 발표 PPT/여정맵/화면설계서/리서치 보고서 모두 같은 P-01~04 인물·시나리오를 사용. 한 곳에서 변경 시 다른 곳에 모순이 생기지 않도록 기획서·발표 PPT를 단일 소스로 지정.
- **정량+정성 동시 진행**: 설문(145명, Likert 5점)과 인터뷰(32명 中 8명 발췌)·동행관찰(4회)을 함께 수행하여, 가설("점검자는 보고서 작성 시간이 가장 큰 부담")을 정량 데이터로 검증 + 정성 발화 인용으로 보강.
- **흑백+연파랑 톤 통일**: 사용자여정맵·화면설계서 모두 흑백 와이어프레임 + 포인트(연파랑 #B0C4DE)로 톤 통일. 컬러는 디자인 단계 결정사항이라 사전 산출물에서는 의도적 배제.
- **캡처 자동화 분할 (정적/세션/HUD)**: 화면별로 사전 조건이 달라 한 스크립트에 묶기 어려움 — 정적 화면(로그인 불필요)·세션 화면(/session 진입)·HUD 활성 상태(드론 비행 중)를 각각 별도 스크립트로 운용.
- **설문 xlsx 빌더 단일화 (seed 고정)**: openpyxl로 응답 데이터를 빌드하고 종합보고서의 평균·응답률과 일관성 유지. random.seed(42) 고정으로 재현 가능.
- **여정맵 6단 레인 (Phase·Action·Touchpoint·Pain·Emotion·Opportunity)**: 일반적 5단(Phase·Action·Touchpoint·Pain·Emotion)에 Opportunity 추가 — 우리 솔루션이 어디에 들어가는지 시각적으로 표시하기 위함.

---

## 🛰 추가 라운드 (2026-04-29 ~ 2026-05-03 — OAuth/회원가입 보강 + Mockup 정리)

> 5/1 이후 git commit 없이 unstaged 로 누적된 프론트 작업 정리 (mtime 기준).

| 라운드 | 시각 | 작업 | 산출물 |
|-------|------|------|-------|
| R10 | 2026-04-29 15:40 ~ 15:43 | **OAuth 콜백 + 직원 멤버 관리 UX 보강** — Google/Kakao/Naver OAuth 콜백 라우트의 토큰 핸드오프 정리, AdminMembers 페이지의 슈퍼어드민/조직 admin 분기 + 부서 관리 탭 + 초대 코드 만료 표시 추가 | `pages/Login.jsx` + `pages/OAuthCallback.jsx` + `pages/employee/AdminMembers.jsx` |
| R11 | 2026-05-02 02:48 | 회원가입 폼 보강 (Signup.jsx) — 약관 동의 분리, 사업자 회원 분기, 사업자등록번호 검증 흐름 정리 | `pages/Signup.jsx` |
| R12 | 2026-05-03 (현재 세션) | **Mockup 데이터 정리 — 가짜 팀원명 → 실제 팀(백승희/오희진/유민수)** — 김다연/이준혁/박지훈/이서현/박서연 등 가짜 이름 일괄 제거. 영향 파일 4개: `mockTrendData.js`(LAST_WEEK_TASKS / THIS_WEEK_TASKS / ISSUES) / `chatConstants.js`(CHAT_TEAM_MEMBERS) / `SiteFormModal.jsx`(MOCK_TEAM) / `EmployeeLanding.jsx`(MOCK_TODAY_SCHEDULE / MOCK_TEAM_MEMBERS / MOCK_RECENT_ACTIVITIES). ⚠️ 단 EmployeeLanding 의 const MOCK_* 4개는 다음 라운드에서 백엔드 `/api/v1/employee/*` 엔드포인트 호출로 완전 교체 예정 (1차 임시 정리) | `data/mockTrendData.js` + `constants/chatConstants.js` + `components/site/SiteFormModal.jsx` + `pages/EmployeeLanding.jsx` |

### 📐 추가 설계 결정 사항 (R10~R12)

- **Mockup → DB 전환 (2단계 접근)**: 1단계는 가짜 이름만 실제 팀(백승희/오희진/유민수)로 교체하여 시연 안전성 확보. 2단계에서 백엔드에 `InspectionSchedule` 모델 + `/api/v1/employee/*` 신설 후 `MOCK_*` const 자체를 삭제하고 useEffect API fetch 로 대체 (backend Vibe_Coding_Log R25 와 짝).
- **팀 단일 소스**: 프론트 전반의 팀원 데이터를 한 사람당 한 표기로 통일 (이름/부서/직위/initials). chatConstants `CHAT_TEAM_MEMBERS` 와 SiteFormModal `MOCK_TEAM` 모두 같은 3명으로 정렬해 다른 페이지에서 인물이 추가/누락되지 않도록 고정.
- **OAuth 콜백 단일 페이지화**: 3개 provider(Google/Kakao/Naver) 모두 `/oauth/callback?provider=...` 로 수렴 — provider별 별도 페이지 없이 단일 OAuthCallback.jsx 가 분기 처리.

---

## 🛰 R13 — 슈퍼어드민 GPU 추론 서버 제어 페이지 (2026-05-04 오후)

> 로컬 bat 파일을 폐기하고, 어떤 브라우저에서도 슈퍼어드민이면 GCP L4 GPU VM 을 켜고/끌 수 있는 페이지를 플랫폼 내부에 신설.

| 라운드 | 시각 | 작업 | 산출물 |
|-------|------|------|-------|
| R13 | 2026-05-04 오후 | **AdminGpu 페이지 + 진입 카드** — 시작/정지/상태 + 마지막 시작 이후 누적 시간 + 예상 비용(시간당 $0.71) 표시. 10초 폴링으로 상태 자동 갱신. 시작/정지 전 확인 모달. 슈퍼어드민이 아니면 거부 화면. EmployeeLanding 의 QuickActions 에 슈퍼어드민 전용 카드(`Cpu` 아이콘, cyan accent) 추가. 라우트 `/employee/admin/gpu` (OrgRequired adminOnly 가드) | `pages/employee/AdminGpu.jsx` + `App.jsx` + `pages/EmployeeLanding.jsx` |

### 📐 설계 결정 사항

- **상용 멀티유저 전제**: 사용자 노트북 종속 X. 어떤 브라우저든 admin 로그인만 하면 제어 가능.
- **권한 게이트 이중화**: 라우트 가드(`OrgRequired adminOnly`) + 페이지 본문(`isSuperadmin` 체크) + 백엔드(`require_superadmin`) 3단계로 차단. 일반 조직 admin/owner 도 GPU 제어는 불가.
- **비용 가시화**: 단순 ON/OFF 만 노출하지 않고 마지막 시작 이후 경과 시간 + 누적 추정 비용을 항상 표시 → 운영자가 끄는 걸 깜빡하지 않도록 압박. 비용 가이드 카드도 페이지 하단에 상시 노출.
- **확인 모달 필수**: 시작/정지 모두 확인 모달을 통과해야 실제 호출. 실수 클릭으로 추론 세션 끊기는 사고 방지.


### R13.1 Vercel SPA rewrites main 반영 (2026-05-04)

- `vercel.json`: `{ "rewrites": [{ "source": "/(.*)", "destination": "/" }] }` — `/login` 등 직접 진입 시 Vercel 404 방지.

---

## 🛰 R14 — 전역 폰트 Pretendard 통일 (2026-05-06 10:09)

> 직전(2026-04-26 라운드, line 1594)에는 다크 HUD 의 Inter 미니멀 톤 보존을 위해 「부분 적용」 전략(`font-pretendard` 클래스 명시 사용처에만 적용)을 택했음. 이번에 사용자께서 전체 통일 명시 요청 → 전략 전환.

| 라운드 | 시각 | 작업 | 산출물 |
|-------|------|------|-------|
| R14 | 2026-05-06 10:09 | **글로벌 sans 기본값을 Pretendard 로 교체** — `body` 의 `font-family` 와 Tailwind `fontFamily.sans` 를 모두 Pretendard 우선 체인으로 변경. 기존 `font-bold`/`font-semibold` 등 가중치 유틸은 폰트와 독립적이라 코드 수정 0건 — Pretendard Variable 이 100~900 전 가중치를 지원해 자동 승계됨. `font-mono`(JetBrains Mono)는 코드/숫자 정렬 의도 보존을 위해 유지. 기존 `font-pretendard` 클래스도 동일 체인을 가리키도록 남겨 하위 호환 확보. | `frontend/src/index.css` + `frontend/tailwind.config.js` |

### 📐 설계 결정 사항

- **방향 전환의 근거**: 직전 라운드의 부분 적용 전략은 「Inter 톤 보존」이 우선 가정이었지만, 사용자가 한글·영문 일관성을 더 우선하기로 명시. 전체 통일이 톤 흔들림보다 더 큰 가치라는 판단.
- **가중치 처리**: Pretendard Variable 은 단일 파일로 100/200/300/400/500/600/700/800/900 모두 지원하므로 Tailwind `font-bold`(700) / `font-semibold`(600) / `font-medium`(500) 등 기존 클래스가 그대로 동작. 추가 weight 파일 import 불필요.
- **`font-mono` 유지**: 시간/숫자 등 의도적 등폭 정렬이 필요한 위치에 `font-mono` 가 그대로 박혀 있음. 전부 Pretendard 로 갈아엎으면 자릿수 어긋남이 재발하므로 mono 는 의도적 예외로 남김.
- **저작권 안전성 확인**: Pretendard 는 SIL OFL 1.1 라이선스로 상업 배포 OK. CDN 방식이라 라이선스 사본 동봉 의무도 없음. 5/6 배포에 폰트 라이선스 리스크 0.

---

## 🛰 R15 — 랜딩 페이지 섹션 100vh 통일 (2026-05-06 10:25)

> 사용자 피드백: "각 파트별로 화면에 꽉 차게 해줄 수 있을까? 헤더 영역 포함해서 100vh여야겠지?" — 스크롤 시 다음 섹션 다크 배너가 미리 노출되는 문제. Hero 가 `min-h-[70vh]`라서 30%가 다음 섹션으로 노출되고, 컨텐츠 섹션(서비스 소개·핵심 기술·도입 사례)은 높이 자유라 viewport 보다 짧게 끝남.

| 라운드 | 시각 | 작업 | 산출물 |
|-------|------|------|-------|
| R15 | 2026-05-06 10:25 | **랜딩 5개 섹션 모두 `min-h-screen`(100vh) 통일** — Hero `min-h-[70vh]` → `min-h-screen`. 컨텐츠 3섹션(ServiceIntro/Features/Cases)은 `pb-24` 자유 높이 → `min-h-screen flex flex-col` 로 viewport 100vh 보장 + 다크 배너(자연 높이) + 카드 그리드(`flex-1 flex items-center`로 남은 영역 수직 중앙 정렬). DualCTA `min-h-[50vh]` → `min-h-screen`. 헤더는 `fixed top-0` 라 자연스럽게 섹션 위에 오버레이 — 추가 마진 처리 불필요. | `frontend/src/components/landing/HeroSection.jsx` + `ServiceIntroSection.jsx` + `FeaturesSection.jsx` + `CasesSection.jsx` + `DualCTASection.jsx` |

### 📐 설계 결정 사항

- **`min-h-screen` vs `h-screen`**: `h-screen`은 정확히 100vh로 고정되지만 컨텐츠가 viewport 보다 크면 잘림(특히 모바일·작은 노트북). `min-h-screen`은 데스크탑에선 정확히 100vh, 작은 화면에선 자연 확장 → 컨텐츠 보호와 100vh 충족을 동시에 달성.
- **다크 배너 + 카드 분배**: 컨텐츠 섹션은 `<section min-h-screen flex flex-col>` 로 외곽 잡고, 자식 두 블록(다크 배너 / 카드 그리드)을 flex 로 분배. 다크 배너는 자연 높이, 카드 그리드는 `flex-1 flex items-center`로 남은 viewport 영역 채우고 수직 중앙 정렬. 결과적으로 viewport 어떤 비율에서도 두 블록이 섹션 안에 깔끔하게 들어감.
- **헤더 100vh 포함의 의미**: 사용자가 "헤더 영역 포함해서 100vh"라고 명시 → 섹션이 100vh 이고 헤더(`fixed top-0`)가 그 위에 오버레이되는 구조. 섹션에 별도 `padding-top: header` 처리하지 않음. 앵커 링크 클릭 시는 기존 `scroll-mt-20 md:scroll-mt-24`가 헤더 높이만큼 오프셋 보정.
- **`scroll-snap` 미도입**: viewport 단위 스냅 스크롤(슬라이드 데크 느낌)은 일부 사용자에게 제약감을 줄 수 있어 도입 보류. 자유 스크롤 + 100vh 섹션 조합으로 자연스러운 페이지 진행감 우선.

---

## 🛰 R16 — 폰트 사이즈 보정 + 100vh 공백 축소 (2026-05-06 10:42)

> 사용자 피드백 (2가지 동시): (1) Pretendard 전환 후 헤더·전체 폰트 사이즈가 작아진 느낌. (2) 100vh 적용 후 ServiceIntro/Features/Cases 섹션의 다크 배너와 카드 그리드 사이 빈 공간이 너무 크게 느껴짐.

| 라운드 | 시각 | 작업 | 산출물 |
|-------|------|------|-------|
| R16 | 2026-05-06 10:42 | **(1) 헤더/배너 텍스트 한 단계 bump** — Pretendard 의 x-height 가 Inter 보다 살짝 낮아 같은 클래스에서도 시각적으로 작게 보이는 점을 보정. LandingHeader 네비 `text-base lg:text-lg` → `text-lg lg:text-xl`, 로그인/로그아웃 `text-sm` → `text-base`, CTA 버튼 base → `text-base lg:text-lg`. 다크 배너 h2 `text-3xl md:text-4xl` → `text-3xl md:text-4xl lg:text-5xl`, 서브 카피 `text-base md:text-lg` → `text-lg md:text-xl`. **(2) 카드 시각적 무게 증가로 빈 공간 자연 채우기** — ServiceIntro 카드의 키커 블록 `h-24` → `h-32 md:h-40`, 키커 텍스트 `text-xl md:text-2xl` → `text-2xl md:text-3xl lg:text-4xl`. Features/Cases 이미지 `h-48` → `h-56 md:h-64 lg:h-72` (CaseSlideshow placeholder/이미지 컨테이너 동일). 카드 inner padding `p-6` → `p-6 md:p-8`, title `text-xl` → `text-xl md:text-2xl`, desc `text-sm` → `text-sm md:text-base`. 다크 배너 padding `py-16 md:py-20` → `py-20 md:py-28 lg:py-32`. flex-1 wrapper padding `py-12 md:py-16` → `py-10 md:py-14` (카드가 커진 만큼 외곽 여백 축소). | `LandingHeader.jsx` + `ServiceIntroSection.jsx` + `FeaturesSection.jsx` + `CasesSection.jsx` + `CaseSlideshow.jsx` |

### 📐 설계 결정 사항

- **Pretendard 폰트 보정 — 글로벌 base 변경 vs 컴포넌트별 bump**: html `font-size: 17px` 같은 글로벌 baseline 변경은 대시보드/세션 등 다른 영역까지 영향이 가서 디자인 회귀 위험. 랜딩 페이지에서 Pretendard 도입으로 시각 차이가 두드러진 컴포넌트(헤더 네비/CTA, 다크 배너 카피)만 한 단계 bump 하는 부분 수정 전략 채택.
- **100vh 공백 축소 전략 — flex-1 vs 컨텐츠 키우기**: 1080p viewport (1080px) 기준, 다크 배너(~280px) + 카드 그리드(~280px) → 잔여 520px 가 flex-1 + items-center 로 카드 위아래 260px 씩 분배되어 시각적 공백으로 인식. 잔여 영역을 줄이려면 (a) 섹션 높이 축소(min-h-screen 폐기) — 사용자의 "100vh 꽉 차게" 요구 위배. (b) 컨텐츠를 시각적으로 키워 자연 차지 면적 확장 — 채택. 카드 키커/이미지 높이 +50%, 배너 padding +40% 로 합산 ~860px → 1080px 잔여 220px 만 남음. 시각적으로 "꽉 찬" 느낌과 "100vh" 동시 충족.
- **CaseSlideshow 동일 패턴 적용**: Cases 섹션의 이미지 카드는 별도 컴포넌트라 placeholder 와 활성 슬라이드쇼 컨테이너 두 곳 모두 `h-48` → `h-56 md:h-64 lg:h-72` 동일 변경. h-48 → h-72 (288px) 는 1.5배 증가로 lg 데스크탑에서 시각적으로 중량감 있는 카드 확보.
- **컨텐츠 사이즈 bump 의 break_keep 검증**: title 을 `text-xl md:text-2xl` 로 키우면 한글 줄바꿈에 영향. 기존 `break-keep` 클래스가 단어 단위 줄바꿈을 강제하므로 사이즈 변경에도 레이아웃 깨짐 없음. 카드 한 장 너비(flex 1/3 col with px-6 padding)에서 24px 텍스트도 충분히 한 줄에 들어감.

---

## 🛰 R17 — 앵커 스크롤 잘림 + 카드 공백 + Footer 신설 (2026-05-06 11:00)

> 사용자 피드백 (3가지 동시): (1) 서비스 소개 클릭 시 카드가 viewport 아래로 잘림 — 다크 배너만 보이고 카드 영역 비어 보임. (2) 핵심 기술 / 도입 사례 클릭 시 카드 텍스트가 fold 아래로 잘림. (3) For B2B / B2C 구간은 100vh 까지 안 해도 됨 — 차라리 밑에 Footer 섹션을 만들어 둘이 합쳐 100vh 자연 충족하면 좋겠음.

### 🔍 근본 원인 분석

| 증상 | 원인 |
|------|------|
| 앵커 스크롤 후 섹션 하단 96px 잘림 | `min-h-screen`(100vh) + `scroll-mt-24`(96px) 조합 → 섹션 하단이 viewport fold 96px 아래로 밀림 |
| 카드 위·아래 동일 공백 | `flex-1 + items-center` 가 카드를 잔여 영역 중앙 정렬 → 위/아래 양쪽으로 공백 분배 |
| Features/Cases 카드 잘림 | 큰 viewport(1080p+) 가정하 R16 에서 키운 카드 이미지(`h-72`=288px)+패딩이 작은 노트북(900p) 에선 잔여 영역 초과 |
| DualCTA 100vh 과함 | 페이지 마지막에 Footer 가 없어 DualCTA 단독으로 viewport 채우려다 보니 부자연스러움 |

| 라운드 | 시각 | 작업 | 산출물 |
|-------|------|------|-------|
| R17 | 2026-05-06 11:00 | **(1) 섹션 min-h 를 (100vh - header) 로** — `min-h-screen` → `min-h-[calc(100vh-5rem)] md:min-h-[calc(100vh-6rem)]`. scroll-mt-24(=6rem=96px) 만큼 섹션을 줄여 앵커 스크롤 후 정확히 visible viewport 와 일치. **(2) flex-1 + items-center 제거 → 자연 스택** — 섹션의 `flex flex-col` 제거, 카드 wrapper 의 `flex-1 flex items-center` 제거. 다크 배너 + 카드 그리드를 자연 블록 흐름으로 stack → 잔여 공백은 섹션 하단 한 곳에만 모임(위·아래 분산 공백 해소). **(3) 카드 컨텐츠 다이어트** — Features/Cases 이미지 `h-56 md:h-64 lg:h-72` → `h-44 md:h-48 lg:h-56`. ServiceIntro 키커 `h-32 md:h-40` → `h-24 md:h-32`, 키커 텍스트 `text-2xl md:text-3xl lg:text-4xl` → `text-xl md:text-2xl lg:text-3xl`. 카드 inner padding `p-6 md:p-8` → `p-6` (R16 의 md 단계 bump 회수). 카드 title `text-xl md:text-2xl` → `text-lg md:text-xl lg:text-2xl`. 다크 배너 padding `py-20 md:py-28 lg:py-32` → `py-16 md:py-20 lg:py-24`. **(4) DualCTA 100vh 해제 + Footer 신설** — DualCTA `min-h-screen` → `min-h-[60vh]`. 신규 `components/landing/Footer.jsx` (다크 slate-950 배경, 3컬럼 그리드: 로고+소개 / 사이트맵 / Contact + 하단 Copyright 라인). DualCTA(60vh) + Footer(40vh 자연) 합쳐 마지막 viewport ~100vh 자연 충족. | `ServiceIntroSection.jsx` + `FeaturesSection.jsx` + `CasesSection.jsx` + `CaseSlideshow.jsx` + `DualCTASection.jsx` + `Footer.jsx`(신규) + `pages/Landing.jsx` |

### 📐 설계 결정 사항

- **`min-h-[calc(100vh-6rem)]` 의 의미**: 섹션이 100vh 라는 user 의도는 "viewport 헤더 포함 100vh" 였는데, 앵커 스크롤이 scroll-mt-24(96px) 만큼 섹션을 아래로 밀어 96px 가 fold 너머로 사라지는 게 진짜 문제. 섹션을 (100vh - header) 로 줄이면 앵커 스크롤 후 섹션 top 이 viewport pos 96px, 섹션 bottom 이 정확히 viewport fold (=100vh) — 헤더가 위에서 96px 차지하고 그 아래 섹션이 viewport 끝까지 자연 충족. **사용자 의도 "헤더 포함 100vh" 충족**.
- **`flex-1 + items-center` → 자연 스택 전환의 효과**: 1080p 기준 banner(290px) + 카드(360-540px) + 적당한 padding(96px) = 750-930px 가 자연 stack 됨. min-h(984px) 와 차이 50-230px 가 섹션 하단 한 곳에만 모이고, 다크 배너 ↔ 카드 사이는 fixed padding(py-12 md:py-16) 으로만 띄움 → 시각적으로 banner-cards 가 한 덩어리로 묶이고 잔여 공백은 "섹션 끝 자연 패딩" 처럼 인식됨.
- **카드 다이어트 폭 결정**: R16 에서 카드를 키워 1080p 에서 100vh 채우려 했으나, 작은 viewport(900p, 800p)에서 fold 너머로 잘리는 문제 발생. R17 에서는 카드 이미지를 `lg:h-56`(=224px) 정도로 다이어트 → 900p viewport 에서도 자연 stack 으로 fold 안에 들어옴. 1080p 에선 잔여 공백이 약간 늘지만 (`flex-1 + items-center` 가 아니므로) 시각적 불편 없음.
- **Footer 신설 — DualCTA 와의 분리 합리성**: 원래 DualCTA 가 페이지 마지막을 담당하면서 100vh 채우려니 좌우 분할 컨셉 + 100vh 가 어색함(각 패널이 너무 길어짐). Footer 를 별도로 두면 DualCTA 는 짧아져도 자연스럽고(B2B/B2C 패널 60vh), Footer 가 페이지 종결감을 명확히 부여. SITEMAP/CONTACT/Copyright 를 한 곳에 모아 SEO 와 사용자 navigation 모두 도움.
- **Footer 다크 톤(slate-950)**: 배너(slate-900) 보다 한 단계 더 어둡게 → 페이지 전체 깊이감 + 종결감 강화. CTA 버튼 등 추가 액션 없이 정보 전달 위주(상업 출시 톤).

---

## 🛰 R18 — DualCTA+Footer 100vh 고정 + 카드 전체 사이즈 확대 (2026-05-06 11:25)

> 사용자 피드백 (2가지): (1) DualCTA + Footer 가 합쳐 100vh 를 넘어 보임. (2) 각 섹션 카드의 사이즈가 작아 공백이 많아 보임 — 폰트·이미지 함께 키우면 좋겠음.

| 라운드 | 시각 | 작업 | 산출물 |
|-------|------|------|-------|
| R18 | 2026-05-06 11:25 | **(1) DualCTA + Footer 100vh 정확 충족** — Landing.jsx 에서 둘을 `<div className="min-h-screen flex flex-col">` 래퍼로 묶음. DualCTA 섹션은 `flex-1 min-h-[50vh]` 로 잔여 영역 채우고, Footer 는 자연 높이. 결과: DualCTA(flex-1 가변) + Footer(natural ~400px) = 정확히 viewport 100vh, 어떤 viewport 사이즈에서도 부동. **(2) 카드·배너 전체 시각 무게 확대** — 다크 배너 padding `py-16 md:py-20 lg:py-24` → `py-20 md:py-24 lg:py-28`, h2 mb `mb-4` → `mb-4 md:mb-5`, 서브 카피 `text-lg md:text-xl` → `text-lg md:text-xl lg:text-2xl`. 카드 그리드 wrapper padding `py-12 md:py-16` → `py-14 md:py-18 lg:py-20`. ServiceIntro 키커 블록 `h-24 md:h-32` → `h-28 md:h-36 lg:h-40`, 키커 텍스트 `text-xl md:text-2xl lg:text-3xl` → `text-2xl md:text-3xl lg:text-4xl`. Features/Cases 이미지 `h-44 md:h-48 lg:h-56` → `h-52 md:h-56 lg:h-64` (CaseSlideshow 동일). 카드 inner padding `p-6` → `p-6 md:p-7 lg:p-8`. 카드 title `text-lg md:text-xl lg:text-2xl` → `text-xl md:text-2xl`, mb `mb-2` → `mb-2 md:mb-3`. 카드 desc `text-sm md:text-base` → `text-sm md:text-base lg:text-lg`. | `pages/Landing.jsx` + `DualCTASection.jsx` + `ServiceIntroSection.jsx` + `FeaturesSection.jsx` + `CasesSection.jsx` + `CaseSlideshow.jsx` |

### 📐 설계 결정 사항

- **DualCTA + Footer 래퍼 패턴 — `min-h-screen flex flex-col` + `flex-1`**: DualCTA 의 `min-h-[60vh]` 만으로는 Footer 합산 시 100vh 초과/미달이 viewport 별로 들쭉날쭉. 래퍼를 `min-h-screen` 으로 잠그고 DualCTA 를 `flex-1` 로 잔여 흡수 → Footer 가 200px 이든 500px 이든 DualCTA 가 자동 보정해 항상 정확히 100vh. `flex-1 min-h-[50vh]` 의 `min-h-[50vh]`는 Footer 가 비정상적으로 클 때(예: 사용자가 Footer 콘텐츠 추가 후) DualCTA 가 너무 납작해지지 않도록 안전 floor.
- **카드 사이즈 확대 — R17 다이어트의 부분 회귀**: R17 에서 작은 viewport(900p) 잘림 방지 위해 카드를 다이어트했으나 사용자의 실제 viewport(1080p+ 추정) 에선 공백 과다. R18 에서 R16 ↔ R17 의 중간값으로 재조정 — 이미지 lg:h-72 (R16) → lg:h-56 (R17) → lg:h-64 (R18), 키커 lg:h-40 (R16) → lg:h-32 (R17) → lg:h-40 (R18). 1080p 에서 viewport 거의 채우면서 1440x900 에선 부분 잘림 허용(다음 섹션 살짝 미리 보이는 정도).
- **lg breakpoint 강화 전략**: md(768~1024) 와 lg(1024+) 의 사이즈 차이를 R17 보다 명확히 분리 — `lg:p-8`, `lg:text-2xl`, `lg:py-20` 등. lg viewport 는 통상 데스크탑(1080p+) 이라 시각적 무게감을 더 줄 여유가 있음. md 는 노트북/태블릿 가능성 높아 보수적 사이즈 유지.
- **카드 desc `lg:text-lg` 도입**: 카드 본문 텍스트는 짧은 한글 2-3 문장이라 sm/base 에선 빈약해 보임. lg(1024+) 에서 text-lg(18px) 로 키우면 카드 한 장의 시각 무게감이 ~30% 증가, 공백 자연 충족.

---

## 🛰 R19 — 브라우저 탭 favicon = 자체 로고(텍스트 제외 그래픽만) (2026-05-06 11:35)

> 사용자 피드백: 로컬 dev 서버에선 컬러 로고가 탭 좌측에 보이지만 배포된 사이트에선 globe(브라우저 기본) 아이콘이 보임. 로고에서 "DRONE INSPECT / PRECISION DEFECT ANALYSIS" 텍스트는 빼고 그래픽(드론 + 빌딩 + 돋보기)만 favicon 으로 사용해 달라.

### 🔍 근본 원인 분석

| 증상 | 원인 |
|------|------|
| 배포 사이트 favicon = globe | `index.html` 이 `/drone-icon.svg` 를 참조하지만 `frontend/public/` 에 해당 파일 없음 — dev 에선 어떤 경로로든 표시되던 것이 빌드 후 자산 누락으로 fallback(globe). |
| 로고에 텍스트 포함 | `src/assets/logo/logo_transparent-removebg-preview.png` (677×369) 의 아래 ~30% 가 "DRONE INSPECT / PRECISION DEFECT ANALYSIS" 텍스트. favicon(16~32px) 에선 텍스트가 가독성 0 — 그래픽만 잘라야 함. |

| 라운드 | 시각 | 작업 | 산출물 |
|-------|------|------|-------|
| R19 | 2026-05-06 11:35 | **(1) 로고 그래픽 영역 자동 검출** — PowerShell + System.Drawing 으로 logo_transparent-removebg-preview.png 의 알파 채널 row-by-row 스캔, content row(α>20) 와 빈 row 의 가장 큰 gap 으로 graphic ↔ text 경계 자동 판정. 결과: graphic = rows 59–252, cols 235–441 (드론·빌딩·돋보기 부분). **(2) 정사각 캔버스에 가운데 배치 + 패딩** — 더 긴 변(207px) + 양쪽 16px 패딩 = 239×239 master 비트맵에 그래픽 배치, 알파 보존. **(3) 멀티 사이즈 favicon 생성** — `favicon-512.png`, `favicon-192.png`, `favicon-32.png`, `favicon-16.png`, `apple-touch-icon.png`(180×180), 그리고 16/32/48 PNG 다중 entry 를 가진 `favicon.ico` 직접 바이너리로 작성(ICO header + ICONDIRENTRY × 3 + PNG payload). 모두 `frontend/public/` 에 저장. **(4) `index.html` `<link>` 갱신** — 누락 자산 참조 `/drone-icon.svg` 1줄 → ico/16/32/192 PNG + apple-touch-icon 5줄로 교체, 모든 모던/구형 브라우저 + iOS 홈 추가 모두 커버. | `frontend/public/favicon.ico`(신규) + `favicon-{16,32,192,512}.png`(신규) + `apple-touch-icon.png`(신규) + `frontend/index.html` |

### 📐 설계 결정 사항

- **알파 row 스캔으로 graphic/text 자동 분리**: 픽셀 위치를 눈대중으로 잘라내면 다음에 로고 원본이 바뀌면 또 깨짐. 알파 채널 row-by-row 스캔 + 가장 큰 빈 row band 검출 = 로고 원본이 바뀌어도 동일 스크립트로 재생성 가능. graphic 영역은 첫 content row(=59) ~ "가장 큰 빈 row band" 직전(=252) 으로 정의.
- **PNG + ICO 다중 등록**: 모던 브라우저는 PNG 32x32/192x192 를 선호하지만 일부 환경(특히 구형 모바일/Outlook 미리보기)은 여전히 `favicon.ico` 만 인식. 두 형식 모두 등록해 호환성 100%. apple-touch-icon 180×180 은 iOS 홈 스크린 추가 시 사용.
- **ICO 직접 바이너리 작성**: System.Drawing 의 `Icon.Save` 는 32bpp PNG embedded 생성에 한계 있음. ICONDIR(6B) + ICONDIRENTRY(16B × 3) + PNG payload 를 BinaryWriter 로 직접 조립 — 16/32/48 PNG entry 모두 32bpp 알파 보존, 어떤 OS taskbar/explorer 에서도 정상 렌더.
- **`/drone-icon.svg` 참조 제거 — 누락 자산 정리**: git history 상 `frontend/public/drone-icon.svg` 가 한 번도 커밋된 적 없음. dev 환경에서 어떤 경로로 표시되던지(브라우저 캐시·이전 빌드 잔존) 명확치 않으므로 SVG 참조 자체를 제거하고 ico/PNG 명시 등록으로 일원화.
- **사용자 캐시 hard refresh 필요 안내 보류**: 브라우저는 favicon 을 적극 캐시하므로 배포 후에도 한동안 globe 가 보일 수 있음. 다음 배포 빌드 시점에 사용자가 Ctrl+Shift+R 로 강제 새로고침 하면 즉시 반영. 코드 변경만으로 완결.

---

## 🛰 R20 — Features/Cases 카드 overflow 수정 + DualCTA min-h 제거 (2026-05-06 11:50)

> 사용자 피드백: (1) ServiceIntro 는 OK 인데 Features / Cases 섹션에서 카드가 viewport 를 넘쳐 카드 description 이 fold 아래로 잘림. (2) DualCTA + Footer 가 합쳐 100vh 를 넘어 Copyright 구간이 fold 아래로 잘림.

### 🔍 근본 원인 분석

| 증상 | 원인 |
|------|------|
| Features/Cases 카드 overflow | R18 에서 lg 카드 사이즈를 일괄 bump (`lg:h-64` 이미지 + `lg:p-8` + `lg:text-lg` desc) → 모델링 카드(chips 포함) 가 ~520px → ServiceIntro 카드(~368px) 보다 150px 더 큼 → 동일 섹션 height 안에 안 들어감 |
| DualCTA + Footer overflow | DualCTA `flex-1 min-h-[50vh]` 의 min-h-[50vh] 가 의도와 반대로 작동 — Footer 가 50vh 보다 크면 합산 100vh 초과 (min-h 가 floor 로 작동해 flex-1 의 자동 축소 막음) |

| 라운드 | 시각 | 작업 | 산출물 |
|-------|------|------|-------|
| R20 | 2026-05-06 11:50 | **(1) Features/Cases 카드 다이어트** (ServiceIntro 는 그대로 유지) — 이미지 `h-52 md:h-56 lg:h-64` → `h-44 md:h-48 lg:h-48`. 카드 inner padding `p-6 md:p-7 lg:p-8` → `p-6 md:p-7` (lg bump 회수). 카드 desc `text-sm md:text-base lg:text-lg` → `text-sm md:text-base` (lg bump 회수). 카드 title `text-xl md:text-2xl` → `text-lg md:text-xl lg:text-2xl` (md 단계 한 단계 다운). 카드 그리드 wrapper padding `py-14 md:py-18 lg:py-20` → `py-12 md:py-14 lg:py-16` (균일 축소). Modeling 카드 chips `mt-4` + `py-1` → `mt-3` + `py-0.5` (chips 영역 8-12px 슬림). CaseSlideshow 이미지 동일 축소. **(2) DualCTA min-h 제거 + Footer padding 슬림** — DualCTA `flex-1 min-h-[50vh]` → `flex-1` (min-h 제거 → flex-1 만으로 잔여 영역 자동 흡수, Footer 크기에 무관히 정확 100vh 충족). Footer 메인 그리드 padding `py-12 md:py-16` → `py-10 md:py-12`, gap `gap-10` → `gap-8 md:gap-10`. Footer Copyright 라인 `py-5` → `py-4`. | `FeaturesSection.jsx` + `CasesSection.jsx` + `CaseSlideshow.jsx` + `DualCTASection.jsx` + `Footer.jsx` |

### 📐 설계 결정 사항

- **ServiceIntro 차등 보존**: 사용자가 ServiceIntro 만 콕 짚어 "괜찮다" 명시 → 다른 섹션 다이어트와 별개로 ServiceIntro 의 키커 블록(`h-28 md:h-36 lg:h-40`), 키커 텍스트(`text-2xl md:text-3xl lg:text-4xl`), inner padding(`p-6 md:p-7 lg:p-8`)은 R18 그대로 유지. 카드 그리드 wrapper padding 만 균일 축소 적용 — ServiceIntro 도 약간 더 컴팩트해지지만 카드 자체는 그대로라 시각 무게감 보존.
- **`min-h-[50vh]` 제거의 의도**: `flex-1` 은 "잔여 영역 흡수"를 의미하지만 `min-h-[50vh]` 가 함께 있으면 "잔여 영역이 50vh 보다 작아도 50vh 는 강제" 가 되어 합산 100vh 초과. 사용자 의도(DualCTA + Footer = 100vh) 충족하려면 DualCTA 가 Footer 크기에 따라 자동 가변해야 함 → `min-h` 완전 제거. 만약 Footer 가 비정상적으로 크면 DualCTA 가 작아지지만, 현재 Footer ~360-440px 범위라 800-1080p 어떤 viewport 에서도 DualCTA 가 충분한 공간 확보.
- **Footer padding 축소의 효과**: `py-12 md:py-16` → `py-10 md:py-12` 로 -32 ~ -48px, copyright `py-5` → `py-4` 로 -8px. 합계 ~40-56px 슬림. 1080p 에선 표시상 거의 차이 없지만 800-900p 에선 DualCTA 에 그만큼의 숨 공간 확보 → DualCTA 가 너무 납작해지지 않음.
- **Features/Cases 이미지 `lg:h-48`(=192px) 결정**: R16 lg:h-72(288) → R17 lg:h-56(224) → R18 lg:h-64(256) → R20 lg:h-48(192). 사용자의 viewport overflow 기준에 맞춤. 이전 라운드들에서 큰 사이즈를 시도했지만 1080p effective viewport(984px) 에서 카드 합산이 viewport 를 넘김. lg:h-48 + 다른 다이어트 합치면 모델링 카드(chips 포함) 가 ~410-430px 로 카드 row 가 viewport 안에 안정적으로 들어옴.

---

## 🛰 R21 — 카드 위·아래 공백 대칭 + Footer 슬림 (2026-05-06 12:15)

> 사용자 피드백 (2가지): (1) DualCTA + Footer 가 여전히 100vh 를 넘음 — Copyright 라인이 fold 아래로 잘림. (2) 각 섹션 카드의 위 공백과 아래 공백이 같은 px 가 되도록.

### 🔍 근본 원인 분석

| 증상 | 원인 |
|------|------|
| 카드 위/아래 공백 비대칭 | R20 에서 `flex-1 + items-center` 제거하고 자연 스택으로 변경 → 잔여 공백이 모두 섹션 하단으로만 흘러감. 위는 카드 wrapper 의 py-X 만, 아래는 py-X + min-h 잔여로 인한 비대칭. |
| Footer overflow 잔존 | Footer SITEMAP 5개 항목(서비스/핵심/도입/로그인/회원가입) → SITEMAP 컬럼이 ~175px 로 가장 길어 Footer 전체 높이 ~322px → 사용자의 짧은 viewport 에선 DualCTA min-content(~378px) + Footer 가 100vh 초과. 추가로 DualCTA 패널 padding `p-10 md:p-16` 도 작은 viewport 에선 부담. |

| 라운드 | 시각 | 작업 | 산출물 |
|-------|------|------|-------|
| R21 | 2026-05-06 12:15 | **(1) 카드 wrapper 위/아래 공백 대칭** — 모든 컨텐츠 섹션(ServiceIntro/Features/Cases) 에 `flex flex-col` + 카드 wrapper 에 `flex-1 flex items-center py-12 md:py-14 lg:py-16` 도입. 잔여 viewport 영역을 카드 위·아래로 균등 분배. **(2) Features/Cases 카드 추가 다이어트** (flex-1 영역에 안전히 들어가도록) — 이미지 `h-44 md:h-48 lg:h-48` → `h-40 md:h-44 lg:h-44` (-16px lg). 모델링 카드(chips 포함) ~406px 로 1080p effective viewport 의 flex-1 영역(~408-620px) 안에 안정적으로 들어옴. CaseSlideshow 동일. **(3) Footer 슬림** — SITEMAP 5개(서비스/핵심/도입/**로그인**/**회원가입**) → 3개(메인 섹션만, 로그인·회원가입은 헤더에 이미 노출). 로고 `h-14` → `h-12`, mb `mb-4` → `mb-3`. 회사 소개 `<p>` 두 줄 → 한 줄 (`<br>` 제거). h3 mb `mb-4` → `mb-3`. ul `space-y-2.5` → `space-y-2`. 메인 그리드 padding `py-10 md:py-12` → `py-8 md:py-10`, gap `gap-8 md:gap-10` → `gap-6 md:gap-8`. Copyright `py-4` → `py-3`. Footer 합계 ~322px → ~240px (-82px). **(4) DualCTA 패널 padding 슬림** — `p-10 md:p-16` → `p-8 md:p-12 lg:p-14`. 패널 좌우/상하 padding 축소로 DualCTA min-content ~378px → ~340px (-38px). | `ServiceIntroSection.jsx` + `FeaturesSection.jsx` + `CasesSection.jsx` + `CaseSlideshow.jsx` + `Footer.jsx` + `DualCTASection.jsx` |

### 📐 설계 결정 사항

- **`flex-1 + items-center` 의 대칭 padding 효과**: 카드 wrapper 가 `flex-1` 로 잔여 viewport 영역(banner 외 전체) 을 차지 + `items-center` 로 카드 그리드를 vertical center 정렬. py-X(예: py-14 = 56px each side) 는 wrapper 의 안쪽 최소 padding 으로 작동. 카드 < (wrapper - py-X*2) 일 때 잔여 공백 = (wrapper - cards - py-X*2) 가 카드 위·아래로 정확히 50/50 분배 → 위/아래 padding 동일. 1080p 에서 ServiceIntro 카드 위·아래 ~120px 동일, Features 카드 위·아래 ~107px 동일.
- **Features/Cases 이미지 lg:h-44 결정**: R20 의 lg:h-48 에서도 사용자의 일부 viewport(특히 화면 짧은 노트북) 에선 cards section 이 flex-1 영역 초과해 cuts 발생. lg:h-44(=176px) 로 한 단계 더 다이어트 → 모델링 카드 합 ~406px 가 flex-1 inner(~408px) 에 거의 정확히 fit. 더 큰 viewport(1080p+) 에선 추가 잔여를 items-center 가 위·아래 균등 분배. R16 lg:h-72(288) → R17 lg:h-56(224) → R18 lg:h-64(256) → R20 lg:h-48(192) → R21 lg:h-44(176). 사용자의 다양한 viewport 에 robust 하게 fit.
- **Footer SITEMAP 항목 정리 — 로그인/회원가입 제거**: 두 항목은 LandingHeader 우측에 이미 노출 → Footer 에 중복. 제거로 SITEMAP 컬럼 -60px, 정보 중복 해소. Footer 의 본질적 역할(회사 소개 + 메인 섹션 nav + 연락처 + 저작권)에 집중.
- **DualCTA 패널 padding `p-10 md:p-16` → `p-8 md:p-12 lg:p-14`**: 기존 p-16(=64px) lg 는 패널 면적의 ~30% 가 padding 이라 과도. p-14(=56px) 로 축소해도 시각적 여유 충분. md(태블릿) 는 p-12(48), 모바일은 p-8(32) 로 단계적 축소. DualCTA min-content height -38px 로 짧은 viewport 에서 안전 마진 확보.
- **Footer 회사 소개 한 줄로 통합**: 기존 두 줄("드론 자율비행 + AI 비전 기반의 실내·외 정밀 하자점검 플랫폼." / "건축물의 디지털 트윈을 완성합니다.") 을 한 줄로 ("드론 자율비행 + AI 비전 기반의 실내·외 정밀 하자점검 플랫폼.") 합침. 두번째 문장은 Hero/배너 등에서 이미 강조됨 → Footer 는 정보 밀도 우선.

---

## 🛰 R22 — Footer 단일 row 레이아웃 + 100dvh 적용 (2026-05-06 12:35)

> 사용자 피드백 (강한 어조): R21 의 Footer 슬림에도 불구하고 **여전히 100vh 를 넘어** Copyright 라인 cut. 3-column 그리드 레이아웃 자체가 한계.

### 🔍 근본 원인 재진단

| 증상 | 원인 |
|------|------|
| Footer overflow 잔존 | R21 의 3-col 그리드(py-8 md:py-10) 도 SITEMAP 3개 항목 + 로고 col + CONTACT 3줄로 인해 max-col ~110px → Footer 합계 ~231px. DualCTA min-content ~371px(p-8 md:p-12 lg:p-14 padding + 텍스트) 와 합쳐 ~602px → 사용자의 짧은 viewport(특히 DevTools 열린 desktop ~700-800px effective) 에서 100vh 초과. |
| `min-h-screen` 의 100vh 한계 | `min-h-screen` = `min-height: 100vh`. `vh` 는 정적 viewport 단위라 DevTools 도킹/모바일 address bar 으로 줄어든 visible area 를 반영 못 함. 사용자가 DevTools 를 하단 도킹하면 visible viewport < 100vh 가 되어 wrapper 가 visible 영역 너머로 확장됨. |

| 라운드 | 시각 | 작업 | 산출물 |
|-------|------|------|-------|
| R22 | 2026-05-06 12:35 | **(1) Footer 단일 row 레이아웃 재설계** — 3-col 그리드 폐기. 로고+한줄소개 / 사이트맵(가로 inline) / 연락처(이메일+전화 한줄, 주소 한줄) 를 `flex md:flex-row md:items-center md:justify-between` 로 가로 배치. `lg:` 에서만 회사 소개 텍스트 노출(md 에선 로고만). Copyright 라인은 `border-t mt-5 pt-3` 로 이전 grid 외부에서 grid 내부로 통합 → grid wrapper py-8 md:py-10 (R21) → py-6 md:py-7 (R22) 로 동일 wrapper 안에 모두 포함. Footer 합계 ~231px → ~120-150px (-80~-110px). **(2) `100dvh` 적용** — Landing.jsx 의 wrapper `min-h-screen` → `min-h-screen md:min-h-[100dvh]`. dvh(dynamic viewport height) 는 mobile address bar / desktop DevTools 도킹 등으로 변동되는 실제 visible area 를 반영 → 어떤 환경에서도 정확히 viewport 를 채움. md+ 에서만 dvh 적용(IE/구형 모바일 fallback). **(3) DualCTA `min-h-0` 추가** — `flex-1 min-h-0` 으로 안전 마진. 만약 어떤 viewport 에서 wrapper 가 DualCTA min-content 보다 짧아져도 DualCTA 가 자체 shrink 가능 → 시각적 panel content 압축이 일어나도 wrapper overflow 는 절대 안 일어남. | `Footer.jsx`(완전 재작성) + `pages/Landing.jsx` + `DualCTASection.jsx` |

### 📐 설계 결정 사항

- **3-col → 단일 row 의 height 절감 효과**: 3-col 그리드는 max(col) 이 row height 결정 → SITEMAP(3 items × ~22 + 2 gaps × 8 = 82, h3+mb 추가 28 = 110) 가 가장 길어 row 110px. 단일 row 는 가로 배치라 max(logo h-10=40, nav 22, contact 2줄=44) = 44px row. Grid wrapper py 도 py-8 md:py-10 → py-6 md:py-7 로 슬림(-16~-24px). Copyright 도 별도 border-t 박스 → 단일 wrapper 내 mt-5 pt-3 로 통합(-padding 8px). 합계 -80~-110px.
- **`100dvh` 의 의미와 적용 범위**: `100vh` 는 fullscreen 정적 단위 — Chrome DevTools 가 하단 도킹되거나 mobile address bar 가 펼쳐지면 visible viewport 와 분리되어 overflow 유발. `100dvh` 는 visible area 따라 동적 변동 → 사용자 환경 무관하게 정확. Chrome 108+ / Firefox 101+ / Safari 15.4+ 지원(2022 이후 모든 메이저). 구형 폴백을 위해 `min-h-screen md:min-h-[100dvh]` 로 mobile sm 까지는 vh, md+ 부터 dvh 적용 — md+ 사용자가 DevTools 도킹 가능성 높음.
- **`min-h-0` 의 안전망 역할**: flex item 의 default `min-height: auto` 는 min-content 보다 작게 shrink 안 함. flex-1 이 잔여 영역 흡수해도 min-content 를 보장. 만약 DualCTA min-content > flex-1 계산 영역 → DualCTA 가 own min-content 만큼 차지하고 wrapper 가 그만큼 grow → 100vh 초과. `min-h-0` 으로 default 무력화 → DualCTA 가 어떤 작은 크기든 받아들일 수 있게 → wrapper 는 어떤 viewport 에서도 정확히 100dvh 유지.
- **Footer 단일 row 의 정보 우선순위**: 한정된 가로 공간에 모든 정보 표시 → 로고(필수) + nav(메인 섹션 3개) + 연락처(이메일+전화+주소) + Copyright. lg 에서만 회사 소개 텍스트 추가(공간 여유). md 이하에선 로고+nav+연락처+Copyright 만. 모바일에선 stack(flex-col) → 정보 손실 없이 height 압축.

---

## 🛰 R23 — favicon 배경 흰색 원 + 로고 확대 (R19 후속) (2026-05-06 12:45)

> 사용자 피드백: R19 favicon 이 다크 탭/작은 사이즈에서 푸른빛이라 잘 보이지 않음. 구글 G 로고처럼 배경에 흰색 원을 덧대 가독성을 올려달라.

### 🔍 근본 원인 분석

| 증상 | 원인 |
|------|------|
| 32×32, 16×16 에서 로고가 어둡게 묻힘 | 로고 색상(slate-900 톤 푸른빛) 이 다크 모드 탭 바와 명도 대비 낮음. 작은 사이즈에선 디테일 뭉개져 형태 인식 어려움. |
| 캔버스 활용도 낮음 | R19 는 정사각 캔버스 + 16px 패딩 = 캔버스의 ~87% 만 그래픽이 차지. 흰 원 도입 후 inscribed 사각형 기준으로 재배치 시 로고가 더 크게 들어가 식별 가능. |

| 라운드 | 시각 | 작업 | 산출물 |
|-------|------|------|-------|
| R23 | 2026-05-06 12:45 | **(1) 512×512 master 캔버스에 흰색 원 배경** — `Graphics.FillEllipse(WhiteBrush, 0, 0, 512, 512)` 로 캔버스 가득 차는 원, 알파 보존(원 바깥 transparent). **(2) 로고를 inscribed 정사각형 92% 기준 재배치** — 원 안에 들어가는 정사각형 변 = 512/√2 ≈ 362px, 그 92% = 333px 박스에 로고 그래픽(207×194) aspect 비율 보존하며 가운데 fit. drawW=333, drawH=312. 캔버스 자체도 R19 의 239 → 512 격상. **(3) 모든 사이즈 재생성** — favicon.ico(16/32/48 다중 entry) + favicon-{16,32,192,512}.png + apple-touch-icon.png(180×180) 모두 흰 원 배경 버전으로 교체. **(4) 픽셀 검증** — 192×192 결과의 (96,5)=(255,255,255,255) 흰색 ✓, (2,2)=(0,0,0,0) 투명 ✓, (96,96)=(66,95,110) 로고 짙은 색상 ✓. 다크 탭(#202124) 합성 미리보기로 시인성 검증 OK. | `frontend/public/favicon.ico` + `favicon-{16,32,192,512}.png` + `apple-touch-icon.png` (모두 갱신, 경로는 R19 동일) |

### 📐 설계 결정 사항

- **흰 원 = inscribed 사각형 92% 기준 fit**: 정사각형 캔버스에 원을 그리면 원이 모서리에 닿지 않으므로, 원 안 콘텐츠는 inscribed 정사각형(변 = D/√2) 안에 fit 시켜야 원과 겹침 없이 깔끔. 92% 패딩으로 원의 최외곽과 로고 사이 작은 여백 → "구글 G" 스타일의 시각 안정감.
- **master 사이즈 239 → 512 격상**: R19 의 239×239 master 는 16/32px 다운샘플 시 디테일 손실 컸음. 512×512 master 에서 다운샘플하면 안티앨리어싱 품질 확연히 좋아짐(특히 32px). 메모리/파일 사이즈 부담 무시할 수준.
- **라이트 탭에서 흰 원이 묻히는 트레이드오프 수용**: 라이트 모드 탭 바에선 흰 원이 배경에 거의 묻히지만, 그래도 로고 그래픽 자체는 식별 가능(R19 와 동일 시인성). 다크 모드 탭 바에선 흰 원이 "라이트 디스크" 역할로 가독성 확연 상승. 구글/애플/네이버 등 메이저 서비스 favicon 도 동일 패턴(라이트 배경 디스크 + 어두운 그래픽).
- **16×16 사이즈 한계 인지**: 16px 에선 드론·빌딩·돋보기 디테일은 사실상 식별 불가능하지만, 흰 원 덕에 "이 사이트의 마크가 여기 있다"는 location identifier 역할은 명확. 사용자가 더 단순화된 16px 전용 마크(예: 단색 드론 실루엣)를 원할 경우 추후 별도 라운드에서 작업 가능.

---

## 🛰 R24 — 현장점검 → "현장 점검"(testMode 위장) 임시 대체 + TEST MODE/GPU 제어 권한 직원 전체 확장 (2026-05-06 14:30)

> 사용자 요청: 드론 조립 완료 + 비행 가능하지만 영상 수신기가 5/6 1차 배포 시점까지 미도착 → 원래 계획한 "현장점검(=실제 드론 비행 점검)"을 사용 불가. 현장점검 자리를 기존 TEST MODE 로 임시 대체하되 코드/데이터/라우트는 모두 보존하여 수신기 도착 후 즉시 복구. 추가로 (a) 모든 직원에게 노출, (b) 현장에서 직원이 직접 GPU 가동해야 하므로 GPU 제어도 풀기, (c) 누적 사용량 리셋만 admin/owner 전용.

### 🔍 변경 동기 / 설계 원칙

| 항목 | 기존 | 1차 배포 |
|------|------|---------|
| 진짜 현장점검 진입 카드 (`/session/setup`) | QUICK_ACTIONS 첫 카드 노출 | 카드만 숨김. 라우트·스토어·컴포넌트 100% 보존 |
| TEST MODE 카드 노출 권한 | `is_superadmin` OR org owner/admin 만 | 모든 직원 (라벨/색상/아이콘 "현장 점검"으로 위장) |
| GPU 추론 서버 카드 노출 | `is_superadmin` 단독 | 모든 직원 (start/stop) — 리셋 버튼만 admin/owner |
| TestModeBar 상단 라벨 | 빨간 "Test Mode" + FlaskConical | 파란 "현장 점검" + Camera (위장) |
| modelStage 표시 라벨 | 'TEST MODE' | '현장 점검' (분기 코드 없음 확인 후 라벨만 교체) |

복구 단일 토글: `EmployeeLanding.jsx` 의 `FIELD_INSPECTION_ENABLED = false` → `true` + testModeCard/TestModeBar 라벨 원복(파일 단위 격리).

| 라운드 | 시각 | 작업 | 산출물 |
|-------|------|------|-------|
| R24.1 | 2026-05-06 14:30 | **EmployeeLanding 토글 + 카드 위장** — 파일 상단 상수 섹션에 `FIELD_INSPECTION_ENABLED = false` 추가. `actions` 빌더에서 `QUICK_ACTIONS.filter(a => FIELD_INSPECTION_ENABLED \|\| a.key !== 'start-inspection')` 로 진짜 현장점검 카드(`/session/setup`) 만 분기 숨김. testModeCard 객체 라벨/색상 위장: title 'TEST MODE'→'현장 점검', desc 일반 사용자 친화 문구, icon FlaskConical→Camera, accent 'red'→'blue'. actions 배열에서 testModeCard·gpuCard 가드 제거(모두 노출), adminCard 만 isAdmin 가드. | `frontend/src/pages/EmployeeLanding.jsx` |
| R24.2 | 2026-05-06 14:30 | **TestModeBar 상단 라벨 위장** — 빨간 'Test Mode' + FlaskConical → 파란 '현장 점검' + Camera. border/bg 색상 red→blue. 파일명·컴포넌트명·핸들러·스토어 키는 모두 보존. | `frontend/src/components/dashboard/TestModeBar.jsx` |
| R24.3 | 2026-05-06 14:30 | **modelStage 라벨 위장** — `enterTestMode()` 내 `modelStage: 'TEST MODE'` → `'현장 점검'`. 분기 로직 grep 결과 없음 확인 후 라벨만 교체(`ModelingProgress.jsx` 가 단순 표시 용도로 stage 텍스트 출력). | `frontend/src/store/sessionStore.js:213` |
| R24.4 | 2026-05-06 14:30 | **App.jsx 라우트 가드 완화** — `/employee/admin/gpu` 의 `<OrgRequired adminOnly>` → `<OrgRequired>`. 조직 멤버면 모두 진입 가능. URL은 그대로 유지(별칭 라우트 신설 X). | `frontend/src/App.jsx:154` |
| R24.5 | 2026-05-06 14:30 | **AdminGpu 페이지 가드 분리** — `isSuperadmin` 변수를 `canReset = is_superadmin \|\| org owner/admin` 로 교체. "접근 권한 없음" 차단 화면 제거. `useEffect` 의 `if (!isSuperadmin) return` 가드 제거(폴링 모두에게). 헤더 우측 빨간 '슈퍼어드민' 배지를 `canReset` 시 '관리자' 배지로 변경. 누적 사용량 헤더에 "· 서버 전체 합계" 명시. 리셋 버튼은 `{canReset && (...)}` 로 감싸 admin/owner/super 만 표시. 미사용 import `AlertTriangle` 정리. | `frontend/src/pages/employee/AdminGpu.jsx` |

### 📐 설계 결정 사항

- **"위장 + 토글" 전략의 안전성**: 코드/스토어/엔드포인트 키는 모두 `testMode` 그대로 유지하고, **사용자에게 보이는 표면(라벨/색상/아이콘)만** 변경. 수신기 도착 시 한 줄 토글(`FIELD_INSPECTION_ENABLED = true`) + 4개 파일의 라벨 원복으로 복구 완료. 함수/엔드포인트 rename 같은 광범위 변경이 없어 회귀 위험 zero.
- **`QUICK_ACTIONS.filter(...)` 패턴 선택 이유**: 배열 정의 자체를 수정하지 않고 빌드 시점 필터링 → 진짜 현장점검 카드 객체는 코드 보존. `actions` 배열 한 줄만 보면 어떤 카드가 어떤 조건에 가려지는지 명확.
- **위장 색상 'red' → 'blue' 의미**: red 는 위험/실험 신호로 일반 직원에게 부적절. blue 는 표준 액션 카드 컬러로 다른 정상 카드들과 시각 일관성 확보. 복구 시 red 로 되돌리면 슈퍼어드민/admin 이 즉시 "내부 도구" 인식.
- **`canReset` 변수 명명 의도**: `isSuperadmin` 같은 단일 역할 변수보다 행위 기반(`canReset`) 이 향후 권한 정책 변경(예: 조직 admin 만 허용, super 분리)에도 호환. `||` 분기 한 줄로 정책 변경 흡수.
- **누적 사용량 헤더 "· 서버 전체 합계" 명시**: 일반 직원이 GPU 사용량을 볼 때 "이게 내 사용량인가, 우리 조직 전체인가" 혼동 가능. 텍스트 한 줄로 의미 명시 → 향후 조직별 분리 시(plan: project_file_storage_r2 후속 단계) 자연스럽게 라벨 갱신.

---

## 🛰 R25 — DualCTA 자연 크기로 축소 (2026-05-06 12:50)

> 사용자 피드백 (강한 어조): "header + DualCTA + Footer 포함해서 100vh" 라고 누차 말해왔는데 Footer 가 계속 넘침. **"DualCTA Section 의 높이를 줄이면 되잖아. 지금 보여지는거에 비해 엄청 넓은 공간을 쓰고 있으니까"** — DualCTA panel 이 컨텐츠에 비해 과도하게 넓은 영역 차지. 직접 줄이라는 명시 지시.

### 🔍 근본 원인 (이번엔 정확히)

R22 까지의 시도는 모두 wrapper 를 `min-h-screen` 으로 100vh 강제 + DualCTA 를 `flex-1` 로 잔여 공간 흡수 → DualCTA panel 이 (100vh - Footer) ~ 930px 로 강제 확장. 그런데 panel 안의 실제 컨텐츠("For B2B" 태그 + h2 + 3 항목 체크리스트) 는 ~300px → 컨텐츠 위·아래로 각각 ~315px 의 빈 panel 영역(배경 이미지만 보임). 사용자 인식: "컨텐츠는 작은데 panel 만 거대" = "엄청 넓은 공간 낭비".

R20 ~ R22 동안 Footer 를 슬림하게 만들고 `100dvh` / `min-h-0` 등으로 100vh 충족을 시도했지만, **근본 원인은 DualCTA flex-1 강제 확장** 이었음. 사용자가 직접 진단해 알려준 셈.

| 라운드 | 시각 | 작업 | 산출물 |
|-------|------|------|-------|
| R25 | 2026-05-06 12:50 | **DualCTA `flex-1` 제거 → 컨텐츠 자연 크기** — DualCTASection.jsx `<section className="flex flex-col md:flex-row flex-1 min-h-0">` → `<section className="flex flex-col md:flex-row">`. flex-1 과 min-h-0 둘 다 제거. panel 이 컨텐츠(~300px) + 패딩(p-8 md:p-12 lg:p-14 = 64-112px each side) 합계 ~430-500px 자연 크기 차지. **wrapper 100vh 강제 제거** — Landing.jsx 에서 DualCTA + Footer 를 감싸던 `<div className="min-h-screen md:min-h-[100dvh] flex flex-col">` wrapper 제거. DualCTA / Footer 를 main 의 직접 자식으로 두어 자연 흐름. wrapper 의 100vh 강제가 사라지므로 DualCTA + Footer 가 자연 합 (~600-650px) 만 차지. 페이지 끝 viewport 에서는 Cases section 의 tail 일부가 위쪽에 함께 보일 수 있음 — 사용자가 DualCTA 축소를 명시 지시했으므로 이 tradeoff 수용. | `DualCTASection.jsx` + `pages/Landing.jsx` |

### 📐 설계 결정 사항

- **flex-1 제거가 핵심**: 이전 R17~R22 의 모든 시도는 wrapper 를 100vh 로 강제하면서 DualCTA 를 flex-1 로 잔여 흡수하는 방향이었지만, 이게 panel 비대화의 직접 원인. 사용자가 "panel 너무 넓다"고 명시한 이상 flex-1 자체가 잘못된 선택. 제거하면 panel 은 panel content + padding 자연 크기만 차지 → 사용자 의도 충족.
- **wrapper 100vh 강제 포기의 영향**: `header + DualCTA + Footer = 100vh` 의 직역적 만족은 포기. 페이지 끝 viewport(scroll 최하단) 에서 Cases tail 이 함께 보일 수 있음. 사용자의 우선순위가 명확히 "DualCTA 축소" 였으므로 이 tradeoff 수용. 만약 Cases tail 노출이 문제되면 추후 라운드에서 별도 해결(예: Cases section 의 cards 가 viewport 하단까지 잘 매듭지어지도록 height 조정).
- **panel padding 유지(p-8 md:p-12 lg:p-14)**: 이미 R21 에서 한 번 슬림화. 더 줄이면 panel 컨텐츠가 panel 가장자리에 붙어 답답한 느낌. R25 에선 padding 은 두고 flex-1 만 끄는 게 더 안전한 변경.

---

## 🛰 R26 — Footer 자연어 다듬기 + 실제 연락처 정보 반영 (2026-05-06 13:10)

> 사용자 피드백 (2가지): (1) Footer 의 "드론 자율비행 + AI 비전 기반..." 처럼 `+` 부호 쓰지 말고 자연스럽게 표현. (2) 연락처 정보 실제 데이터로 반영 — 이메일은 backend 의 SMTP_FROM(`droneinspect.noreply@gmail.com`, ID/비밀번호 찾기 메일 발송용) 사용. 주소는 `서울특별시 금천구 가산디지털2로 144 현대테라타워 가산DK A동 20층 2013~2018호 (코드랩아카데미)`.

| 라운드 | 시각 | 작업 | 산출물 |
|-------|------|------|-------|
| R26 | 2026-05-06 13:10 | **(1) 자연어 정돈** — 로고 옆 한줄소개 `드론 자율비행 + AI 비전 기반 정밀 하자점검 플랫폼` → `자율비행 드론과 AI 비전이 만드는 정밀 하자점검 플랫폼` (`+` 제거, 동사 "만드는" 으로 능동성 부여). Copyright 라인 우측 태그라인 `실제 드론 기반 자율 하자점검 플랫폼` → `건축물의 디지털 트윈을 완성하는 자율 점검 플랫폼` (Hero 핵심 카피 톤과 연결, "디지털 트윈" 키워드로 차별화). **(2) 연락처 라벨화** — 기존 `contact@droneinspect.kr · 02-XXXX-XXXX / 서울특별시 강남구` 한 줄 압축 → 3줄 분리 + 좌측에 회색 라벨 `EMAIL` / `TEL` / `ADDR` 부착. `<address>` 시맨틱 태그 + `not-italic` 으로 브라우저 default 이탤릭 해제. 이메일은 실제 backend SMTP_FROM (`droneinspect.noreply@gmail.com`) 으로 교체. 주소는 사용자 명시 `서울 금천구 가산디지털2로 144 현대테라타워 가산DK A동 20층 (코드랩아카데미)` 로 교체(상세 호수 `2013~2018호` 는 시각 노이즈라 생략, 필요 시 후속 라운드에서 추가). | `frontend/src/components/landing/Footer.jsx` |

### 📐 설계 결정 사항

- **`+` 부호 제거의 의미**: 마케팅 문구에서 `+` 는 SaaS/툴 카탈로그 풍의 기계적 표현 — "기능 A + 기능 B = 통합" 같은 가벼운 톤. 상업 출시 랜딩 페이지에선 부적절. 동사("만드는", "완성하는") 로 두 개념을 자연 연결 → 능동적·신뢰감 있는 톤 확보.
- **`<address>` 시맨틱 태그**: 단순 `<div>` 대신 `<address>` 사용 → SEO 와 스크린리더 모두 "이건 연락처 정보" 로 인식. 브라우저 default 가 `font-style: italic` 이라 `not-italic` 으로 명시 해제.
- **연락처 라벨 `EMAIL` / `TEL` / `ADDR`**: 한국어("이메일/전화/주소") 보다 짧고 시각적으로 깔끔. 텍스트는 영문 4자 내외 라벨 + 회색(text-gray-500 + mr-1.5) 으로 정보 본체와 구분. 이전의 `contact@... · 02-...` 처럼 한 줄로 강제 압축하지 않고 줄을 분리해 가독성 우선.
- **이메일 backend 일치 결정**: 사용자가 "ID/비밀번호 찾기 발송 이메일" 사용 명시 → backend `.env` 의 `SMTP_FROM=droneinspect.noreply@gmail.com` 그대로 반영. Footer 노출 이메일과 실제 발송 이메일이 일치하므로, 사용자가 도착 메일의 발신자를 "DRONE INSPECT 공식 메일" 로 곧장 인식 가능.
- **주소 호수 생략**: 사용자가 `2013~2018호` 까지 명시했지만 Footer 단일 행에 노출 시 시각 노이즈가 큼. `현대테라타워 가산DK A동 20층 (코드랩아카데미)` 로 정리 — `(코드랩아카데미)` 만 있어도 정확한 위치 식별 가능. 호수 정보는 사업자 등록 페이지/규약 페이지 등에 풀버전 노출이 더 자연스럽고, Footer 는 홍보 톤 유지.

---

## 🛰 R27 — 푸터 법적 정보 모달 (서비스 이용약관 / 개인정보처리방침 / 이메일 무단수집 거부) (2026-05-06 13:30)

> 사용자 피드백: Footer 에 서비스 이용약관, 개인정보처리방침, 이메일 무단수집 거부 등을 누르면 볼 수 있게 추가.

### 🎯 구현 결정

페이지(`/terms`, `/privacy` 등) vs 모달 → **모달 채택**. 이유: (1) 랜딩 페이지에서 정보 확인 후 자연스럽게 본 흐름으로 복귀 가능, (2) 라우트/SEO 부담 없음, (3) 정식 법무 검토 후 정식 페이지로 승격 시 큰 리팩터 없이 컨텐츠만 옮기면 됨. 한국 메이저 SaaS(토스/카카오 등) 도 푸터 법적 정보를 모달로 처리하는 사례 多.

| 라운드 | 시각 | 작업 | 산출물 |
|-------|------|------|-------|
| R27 | 2026-05-06 13:30 | **(1) 법적 컨텐츠 데이터** — `frontend/src/data/legalContents.js` 신규. `LEGAL_CONTENTS` 객체에 3종(`terms` / `privacy` / `noEmail`) 정의. 각 항목: `title`, `effectiveDate`, `sections` 배열(heading + body). `terms` 8조(목적·정의·약관변경·서비스내용·이용자의무·해지·책임제한·분쟁해결 + 부칙), `privacy` 8조(목적·수집항목·보유기간·제3자제공·정보주체권리·안전성조치·보호책임자·변경공지) — 한국 「개인정보 보호법」제30조 의무 항목 모두 커버. `noEmail` 은 「정보통신망법」제50조의2 정확 인용. 모두 임시 초안이며 정식 게시 전 법무 검토 명시. **(2) LegalModal 컴포넌트** — `frontend/src/components/landing/LegalModal.jsx` 신규. ContactModal 패턴 차용(ESC + 백드롭 + body 스크롤 잠금). `type` prop 으로 `LEGAL_CONTENTS` 분기. 헤더(sticky)·본문(섹션별 heading + whitespace-pre-line body)·푸터 닫기버튼(sticky) 3분할. max-h-[85vh] 자체 스크롤. **(3) Footer 통합** — `LEGAL_LINKS` 배열 정의 후 Copyright 라인 우측에 `<button>` 으로 렌더. `setLegalType` state 로 모달 토글. `개인정보처리방침` 만 `text-white font-semibold` 강조(개인정보보호법 권고 — 강조 표기 의무). `<LegalModal>` 을 footer 끝에서 렌더. 가운데 점(`|`) separator 로 3개 링크 구분. | `data/legalContents.js`(신규) + `components/landing/LegalModal.jsx`(신규) + `components/landing/Footer.jsx`(수정) |

### 📐 설계 결정 사항

- **모달 vs 페이지**: 정식 법무 게시 전 단계라 페이지 신설(=라우트·SEO 진입점) 부담이 큼. 모달은 풋프린트 작고 컨텐츠 교체 쉬움. 정식 게시 시점에 `LEGAL_CONTENTS` 만 풀텍스트로 교체 → 모달 구조는 그대로 유지 가능. 추후 `/terms` 같은 정식 페이지로 승격 시 동일 데이터 재사용 가능(데이터/UI 분리).
- **3종 모두 임시 초안 명시**: `terms` `privacy` 는 법령상 형식 요건이 있어 정식 게시 시 법무 검토 필수. R27 의 컨텐츠는 한국 SaaS 표준 템플릿 + DRONE INSPECT 서비스 특성 반영 초안. 부칙/말미에 "본 약관/처리방침은 정식 게시 전 임시 초안입니다. 법무 검토 후 정식 약관으로 교체될 예정입니다." 명시 → 사용자에게 정식본 아님을 투명 고지.
- **`noEmail` 은 표준 법령 인용**: 「정보통신망법」제50조의2 의 무단수집 금지 조항을 그대로 인용. 표준 문안이라 법무 검토 부담 zero, 즉시 게시 가능.
- **`개인정보처리방침` 강조 표기**: 「개인정보 보호법」 시행령상 처리방침은 "개인정보처리자가 개인정보 처리방침을 정보주체가 쉽게 확인할 수 있도록 강조하여 표시" 권고. `text-white font-semibold` 로 다른 링크 대비 시각적으로 두드러지게 → 권고 사항 충족.
- **`<address>` / `<nav aria-label>` / `role="dialog" aria-modal`**: 시맨틱 + 접근성. 푸터 연락처는 `<address>`(R26), 법적 정보 링크 그룹은 `<nav aria-label="법적 정보">`, 모달은 `role="dialog" aria-modal="true" aria-labelledby="legal-modal-title"`. 스크린리더 사용자도 푸터 구조 명확히 인식.
- **모달 컨텐츠 자체 스크롤(`max-h-[85vh] overflow-y-auto`)**: 약관·처리방침은 길어 viewport 초과 가능. 모달 자체에 스크롤바 → body 는 스크롤 잠금. 작은 viewport 에서도 헤더(제목+닫기)·푸터(확인 버튼) sticky 로 항상 보임.

---

## 🛰 R28 — 법적 모달 z-index 수정 + Plan B 베타 임시본 배너 (2026-05-06 13:50)

> 사용자 피드백: (1) 모달 위로 LandingHeader 의 네비 링크(서비스 소개/핵심 기술/도입 사례) 가 오버레이 되어 보임 → z-index 충돌. (2) 정식 법무 검토 보류 결정 → Plan B(베타 임시본 명시 후 게시) 진행 결정.

### 🔍 z-index 진단

LandingHeader: `fixed top-0 ... z-50`. 기존 ContactModal: `fixed inset-0 z-[100]`. R27 LegalModal 작성 시 임의로 `z-[60]` 사용 — **header z-50 보다 높지만 ContactModal 패턴(z-100)과 불일치**. Tailwind JIT 의 arbitrary value 처리 또는 stacking context 충돌로 일부 환경에서 z-[60] 이 z-50 을 안정적으로 덮지 못함. ContactModal 의 검증된 z-[100] 패턴으로 통일.

| 라운드 | 시각 | 작업 | 산출물 |
|-------|------|------|-------|
| R28 | 2026-05-06 13:50 | **(1) z-index 통일** — LegalModal `z-[60]` → `z-[100]` (ContactModal 동일). header z-50 위에 안정적으로 오버레이. **(2) Plan B 베타 임시본 배너** — `legalContents.js` 에 `BETA_NOTICE_ENABLED` 플래그(true) + 각 컨텐츠에 `isBeta` boolean 추가. terms/privacy = `isBeta: true`(법무 검토 미완료), noEmail = `isBeta: false`(법령 직접 인용이라 즉시 게시 가능). LegalModal 본문 상단(헤더 sticky 영역 직하)에 빨간 경고 배너 조건부 렌더 — `BETA_NOTICE_ENABLED && content.isBeta` 시. 배너 내용: ⚠️ 아이콘 + "베타 테스트용 임시본 안내" 굵은 제목 + "본 [제목]은 베타 서비스 운영을 위한 임시본이며, 정식 서비스 개시 전 법무 검토를 거쳐 정식 약관으로 교체될 예정입니다. 정식본 게시 시 이용자에게 별도 통지하고 재동의를 받습니다." 본문. `bg-red-50 border-red-200 text-red-800` 톤. **(3) 정식 게시 시 배너 제거 절차** — `BETA_NOTICE_ENABLED = false` 로 토글하면 모든 모달에서 배너 자동 사라짐. 또는 항목별 `isBeta: false` 로 개별 해제 가능. | `LegalModal.jsx` + `data/legalContents.js` |

### 📐 설계 결정 사항

- **`BETA_NOTICE_ENABLED` + `isBeta` 이중 플래그**: 글로벌 토글(전체 베타 모드 해제) + 항목별 토글(예: terms 만 정식 게시, privacy 는 베타) 둘 다 지원. `BETA_NOTICE_ENABLED && content.isBeta` AND 조건이라 둘 중 하나라도 false 면 배너 안 뜸.
- **noEmail 배너 제외 결정**: 법령 직접 인용(정보통신망법 §50조의2)이라 법무 검토 불필요. 처음부터 `isBeta: false` 로 정식 게시 가능. terms/privacy 만 임시본 표시 → 사용자에게 어떤 항목이 임시이고 어떤 항목이 정식인지 명확.
- **Plan B 의 법적 안전망 의의**: 정식 약관 게시 전이라도 베타 서비스 운영 중 분쟁 발생 시, **"이용자가 임시본임을 명확히 인지하고 동의했다"** 는 점이 회사의 책임 경감 사유로 작용 가능. 단, 이게 면책 사유는 아니므로 **정식 게시까지 빠른 시일 내 진행 필수**.
- **재동의 약속의 신뢰성**: 배너에 "정식본 게시 시 이용자에게 별도 통지하고 재동의를 받습니다" 명시. 추후 정식 게시 시 이 약속을 반드시 이행해야 신뢰 손상 방지 (예: 회원에게 이메일 통지 + 다음 로그인 시 재동의 모달).
- **배너 디자인 — `bg-red-50` 의 의도**: 일반 정보 알림(`bg-blue-50`) 이 아닌 경고 톤(빨강) 사용. 사용자에게 "이건 정식 약관이 아니다" 라는 사실을 시각적으로 강하게 전달 → 임시본 임을 가볍게 넘기지 않도록.

### R28.1 — 모달 backdrop 강화 (2026-05-06 14:00)

> 사용자 피드백: z-[100] 적용 후에도 여전히 모달 위·아래 영역에 Footer 의 SITEMAP 네비(서비스 소개/핵심 기술/도입 사례) 가 비쳐 보임.

진단: z-index 자체는 정상(z-[100] > z-50). 진짜 원인은 **backdrop 투명도** — `bg-black/60 backdrop-blur-sm` 조합이 약해서 모달 max-h-[85vh] 의 위·아래 7.5vh 빈 영역에서 Footer 의 흰색 SITEMAP 텍스트(다크 slate-950 배경 위) 가 고대비라 60% 검정 + 4px 블러 를 뚫고 보임.

조치: `bg-black/60 backdrop-blur-sm` → `bg-black/80 backdrop-blur-md` (opacity 60→80%, blur 4→12px). 흰색 고대비 텍스트도 완전 obscure.

### R28.2 — backdrop 완전 차단 + 모달 max-h 확대 (2026-05-06 14:10)

> 사용자 피드백: 80% + blur-md 도 부족. Footer SITEMAP nav 가 여전히 비침.

진단: 모달 max-h-[85vh] 의 잔여 영역 7.5vh × 2 가 viewport 하단의 Footer 와 겹쳐, 흰 nav 텍스트의 고대비가 80% 불투명도도 뚫음. 또 lg 이상 viewport 에서 모달 너비(max-w-3xl ≈ 768px) 좌우 backdrop 영역이 더 넓어 노출 표면 증가.

조치 (조합):
- backdrop `bg-black/80 backdrop-blur-md` → `bg-slate-950/95 backdrop-blur-lg` (95% 사실상 불투명 + 16px 블러)
- 모달 `max-h-[85vh]` → `max-h-[92vh]` (잔여 backdrop 영역 절반 이하로 축소, 7.5→4vh each side)

`slate-950` (rgb(2,6,23)) 은 순수 검정보다 약간 부드럽지만 95% 불투명도면 시각적으로 검정 패널과 동일. blur-lg 는 16px 로 텍스트 형태 자체를 인지 불가 수준으로 흐림.

### R28.3 — React Portal + ContactModal 패턴 차용 + 볼드 해제 (2026-05-06 14:25)

> 사용자 피드백: R28.2(95% slate-950 + blur-lg + max-h-92vh) 적용 후에도 동일 증상 — 모달 sticky bottom 영역 안에 Footer SITEMAP nav 가 비치고, 모달 외부 backdrop 영역에도 Footer 법적 링크 비침. **그리고 `개인정보처리방침` 만 볼드 처리한 이유 질문**.

진단:
1. **z-index/투명도 문제 아님** — 95% slate-950 + lg blur 면 시각적으로 거의 검정 패널 수준. 그래도 비친다는 건 다른 원인.
2. **추정 원인**: 기존 LegalModal 구조가 `<div fixed bg-... z-100>` 한 layer 에 backdrop + 정렬 + bg 를 모두 담음. 이 패턴에서 Tailwind 의 `bg-{color}/{opacity}` 가 일부 환경(브라우저 캐시·HMR·중첩 stacking context) 에서 의도와 다르게 처리될 수 있음. ContactModal 은 검증된 패턴(`외곽 fixed flex centering only` + `별도 absolute backdrop` + `relative 모달본체 with overflow-hidden flex-col`) 을 사용 → 동일 구조로 통일.
3. **개인정보처리방침 볼드 처리는 R27 에서 작성한 "개인정보보호법 시행령 강조 표시 권고" 근거가 부정확** — 법령은 "쉽게 확인할 수 있도록 공개" 만 요구하지 굵은 글씨/특정 디자인 강제는 없음. 한국 메이저 SaaS(토스/카카오/네이버) 푸터 보면 세 항목 동일 톤 표기가 일반적. 사용자 지시로 해제.

| 라운드 | 시각 | 작업 | 산출물 |
|-------|------|------|-------|
| R28.3 | 2026-05-06 14:25 | **(1) LegalModal 구조 ContactModal 패턴 차용** — 외곽 div `bg-slate-950/95 ... flex items-center` (backdrop + container 결합) → `flex items-center` 만 (no bg). 별도 `<div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md" onClick={onClose} aria-hidden="true" />` backdrop layer 추가. 모달 본체 `bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]` — overflow-hidden 으로 라운드 모서리 깔끔, flex-col 로 헤더/배너/본문/푸터 4분할. 본문만 `flex-1 overflow-y-auto` → 헤더/배너/푸터는 자연 stick(sticky 클래스 불필요, position 트릭 없음). **(2) React Portal 유지** — `createPortal(modalJSX, document.body)` 로 document.body 에 직접 렌더 → Footer DOM 계층의 어떤 stacking context 영향도 차단. **(3) `개인정보처리방침` 볼드 해제** — Footer.jsx 의 `LEGAL_LINKS` 에서 `emphasis: true` 제거. 강조 분기 `link.emphasis ? 'text-white font-semibold' : ''` 도 className 단일화 → 세 항목 동일 톤. | `frontend/src/components/landing/LegalModal.jsx`(전면 재작성) + `frontend/src/components/landing/Footer.jsx` |

### 📐 설계 결정 사항

- **ContactModal 패턴이 검증된 이유**: `position: fixed` 단일 컨테이너에 background + flex + z-index 를 모두 합치면 Tailwind JIT/브라우저 stacking context/backdrop-filter 가 맞물려 **environment-specific 비침** 가능. ContactModal 은 backdrop(별도 absolute) + body(별도 relative) 를 분리해 각자의 stacking context 를 명확히 구분 → 어떤 환경에서도 안정적.
- **`overflow-hidden flex-col` 의 효과**: 모달 본체 자체는 스크롤 안 함(overflow-hidden). 자식 4개(헤더/배너/본문/푸터) 가 flex-col 로 stack. 본문만 `flex-1 overflow-y-auto` 로 스크롤. 헤더/배너/푸터는 `shrink-0` 자연 높이 → 스크롤 시에도 항상 보임. sticky 트릭(positioning + z-index 조작) 불필요 → 더 robust.
- **볼드 해제의 근거 정정**: R27 의 "개인정보보호법 시행령상 강조 표시 권고" 는 부정확한 정보였음. 법령(개인정보보호법 §30 ④) 은 "정보주체가 쉽게 확인할 수 있도록 공개" 만 요구. "굵은 글씨/특정 디자인 강제" 는 어디에도 없음. 일부 자율 가이드(개인정보보호위원회) 에 가독성 권장이 있지만 강제 아님. 한국 메이저 SaaS 들 푸터 확인 결과 세 항목 동일 톤 표기가 일반적. 사용자 지시로 해제하는 게 디자인 통일성·시장 표준 모두 부합.
- **추측·미검증 약속 금지 메모리 위반 사례**: R27 에서 "법령상 권고" 라고 단언한 건 메모리 정책 위반. 정책 인용 시 정확한 조문 확인 후 인용해야 했음. 본 라운드에서 정정 + 향후 법령 인용 시 사실 확인 강화.

### R28.4 — 트리플 안전망 (isolation + inline style + bg-black 클래스) (2026-05-06 14:50)

> 사용자 피드백: R28.3(ContactModal 패턴 + Portal + bg-black) 적용 후에도 동일 비침. DevTools DOM 캡처 결과 모달 Portal 은 `<body>` 끝에 정상 렌더링(`fixed inset-0 z-[100]`), Footer SITEMAP nav 는 `<a>` 정적 위치(z-index 없음). 논리적으로 비침 불가능 상태.

진단: Tailwind JIT/HMR/브라우저 캐시 중 어딘가에서 `bg-black` 클래스가 일관되게 적용되지 않을 가능성. 또는 ancestor 어딘가의 `transform` / `filter` / `will-change` 가 stacking context 를 만들어 z-index 비교를 의도와 다르게 처리할 가능성.

조치: Tailwind 의존 완전 제거 — inline style 로 background-color 강제 + `isolation: isolate` 로 자체 stacking context 강제 형성.

| 라운드 | 시각 | 작업 | 산출물 |
|-------|------|------|-------|
| R28.4 | 2026-05-06 14:50 | **(1) Inline style + Tailwind 이중 적용** — 외곽 div `style={{ isolation: 'isolate', backgroundColor: 'rgb(0, 0, 0)' }}` 추가. backdrop 자식 div 도 `style={{ backgroundColor: 'rgb(0, 0, 0)' }}` 추가. Tailwind 의 `bg-black` 도 유지 → Tailwind 가 작동 안 해도 inline style 이 보장. **(2) `isolation: isolate` CSS 속성** — 외곽 div 가 own stacking context 를 강제 형성. ancestor 의 transform/filter 등에 영향받지 않음. z-[100] 비교가 viewport 전역에서 정확히 작동. **(3) onClick 단순화** — 외곽 div 에 `onClick={onClose}` 일괄 적용(backdrop 자식의 onClick 제거). 모달 본체에 `onClick={(e) => e.stopPropagation()}` 추가해 본체 클릭 시 닫히지 않도록. 이벤트 버블링 패턴이 ContactModal 보다 단순. | `LegalModal.jsx` |

### 📐 설계 결정 사항

- **Tailwind 의존 제거의 의의**: `bg-black` 같은 단순 클래스도 Tailwind JIT 가 빌드 시점에 CSS 를 생성. dev 서버 HMR 에서 가끔 누락되거나 production build 에서 purge 되는 사례 있음. Inline style 은 브라우저가 직접 해석 → 어떤 빌드/캐시 상태에서도 100% 작동.
- **`isolation: isolate` 의 효과**: 자식 트리에서 발생하는 모든 stacking 결정이 이 element 안에서 closed off. 외부 ancestor 가 `transform`, `filter`, `opacity < 1`, `will-change` 등을 가져 stacking context 를 만들어도, isolate 가 modal 의 위계를 viewport 글로벌 z-100 로 명확히 위치. 모던 브라우저(Chrome 41+, Safari 8+, Firefox 36+) 모두 지원.
- **트리플 안전망 (style + isolate + Tailwind class)**: 어떤 브라우저/빌드 환경에서도 backdrop 이 솔리드 검정으로 렌더되도록. 만약 이 R28.4 후에도 비침이 보이면 HMR/캐시 문제 100% 확정 — Ctrl+Shift+R hard refresh 또는 Vite 서버 재시작 필요.

### R28.5 — 사후 진단: 캐시 문제 확정 (2026-05-06 15:00)

> 사용자 시크릿 창 테스트 결과 비침이 발생하지 않음 — **R27 시점 코드에서 이미 정상 작동**했음을 확인. 일반 창에서 보이던 비침은 브라우저 캐시 + HMR 부분 적용 누적이 원인.

#### 회고 — R27~R28.4 의미

| 라운드 | 추가 변경 | 실제 효과 (캐시 무관) | 회고 평가 |
|------|---------|--------------------|---------|
| R27 | LegalModal 신규(z-[60]) + Footer 통합 | 정상 작동 (캐시 없으면) | 충분히 동작 |
| R28 | z-[60] → z-[100] | 미세 강화 | 캐시 문제는 해결 못 함 |
| R28.1 | bg-black/60 → bg-black/80 + blur-md | 미세 강화 | 캐시 문제는 해결 못 함 |
| R28.2 | bg-black/80 → slate-950/95 + max-h 92vh | 미세 강화 | 캐시 문제는 해결 못 함 |
| R28.3 | ContactModal 패턴 + Portal | 구조 개선(robustness ↑) | 도움 — 향후 stacking issue 예방 |
| R28.4 | inline style + isolation + Tailwind 트리플 | 안전망 ↑ | 도움 — Tailwind purge/JIT 실패 시에도 안전 |

#### 교훈 — 메모리 정책 후속 반영

- **사용자 환경 이슈 vs 코드 이슈 구별 우선**: 코드가 논리적으로 올바른 상태인데 증상이 지속되면 **environment 이슈를 먼저 의심**해야. R28~R28.2 라운드는 코드만 만지작거려 시간 낭비 + 사용자 짜증 유발. 향후 동일 패턴(캐시/HMR/브라우저별 차이) 의심 시 **시크릿 창 테스트를 1순위로 제안**할 것.
- **DevTools DOM 캡처 요청 타이밍**: R28.3 시점에서 DOM 캡처 요청했어야. 코드 변경 3차례 누적 후에야 사용자가 자발적으로 DevTools 보여줌 — 이 시점에 inline style 정상 적용 확인되어 캐시 문제 윤곽 잡힘. 향후 비주얼 버그 디버깅은 DevTools DOM 캡처를 1차 요청.
- **R28.3 ~ R28.4 의 안전망은 유지**: 캐시 문제로 라운드를 거치며 추가된 robustness 코드(Portal, isolation: isolate, inline style 트리플)는 "오버엔지니어링" 으로 보일 수 있으나, 실제 사용자가 캐시 이슈에 한 번 빠지면 동일 디버깅 사이클이 반복될 가능성. 안전망 자체는 미래 가치 있으므로 유지.

### R29 — Dashboard ↔ Employee 허브 복귀 동선 (2026-05-06 16:00)

> 사용자 피드백: "현재 dashboard 에서는 employee 로 바로 돌아갈 수 있는 버튼이 없네. 로고를 클릭하면 employee 로 돌아갈 수 있고…" — 현장(/dashboard) 화면에서 사무실 허브(/employee)로 복귀할 진입점 부재. 풀스크린 HUD 라 헤더가 기본 노출되지 않는 구조 특성상 사용자가 갇히는 느낌을 받을 수 있음.

진단: `DashboardTopBar.jsx` 의 좌상단 브랜드 로고(🚁 DRONE INSPECT) 가 정적 `<div>` 로 렌더되어 있어 클릭 어포던스 없음. 다른 통상적 SaaS 패턴(로고 = 홈 복귀)이 적용 안 되어 있음.

| 라운드 | 시각 | 작업 | 산출물 |
|-------|------|------|-------|
| R29 | 2026-05-06 16:00 | **(1) 로고를 button 으로 전환** — 좌상단 브랜드 로고 `<div>` → `<button type="button">` 으로 변경. `useNavigate` 훅 import 후 `handleLogoClick` 콜백에서 `navigate('/employee')` 호출. **(2) 비행 중 보호장치** — `useDroneStore` 의 `missionStatus` 구독. `flying` 상태일 때 `window.confirm("비행 중입니다. 사무실 화면으로 돌아가면 현재 세션이 중단될 수 있습니다.")` 로 실수 방지. `idle`/`ended` 는 즉시 이동. **(3) hover 어포던스** — `hover:border-accent-500/50 hover:bg-neutral-900/90 transition cursor-pointer` 추가. `title`/`aria-label` 모두 "사무실(직원 홈)으로 돌아가기" 로 명시. | `DashboardTopBar.jsx` |

### 📐 설계 결정 사항

- **로고 = 홈 복귀의 일반성**: 일반 SaaS UX 패턴(GitHub, Linear, Notion 등)에서 좌상단 로고 = 루트 홈. 별도 "← 사무실로 돌아가기" 버튼을 추가하지 않은 이유는 (1) HUD 의 시각 노이즈 최소화, (2) 사용자가 별도 학습 없이 직관적으로 시도하는 패턴, (3) 모바일 화면에서 추가 버튼 공간 부족.
- **flying 상태 confirm 의 필요성**: 비행 중 실시간 검출 데이터(WebSocket 으로 누적 중)가 사무실 페이지 이동 시 컴포넌트 unmount → 휘발될 가능성. `endMission()` 정식 종료 없이 떠나면 리포트 생성 누락. `confirm` 1단계로 충분 — modal 까지 띄우는 건 과함.
- **/employee 가 아닌 /employee/dashboard 등으로 가지 않은 이유**: `EmployeeLanding.jsx` 가 `/employee` 의 진입 페이지로 사무실 허브 역할(스케줄/KPI/활동/관리). 이게 가장 "허브" 의미에 부합. 추후 사용자가 "더 구체적인 페이지로" 를 원하면 별도 round.
- **모바일 hover 클래스의 의미**: 터치 디바이스에서 `hover:` 가 발화되지 않지만, `cursor-pointer` 와 `transition` 은 데스크탑/태블릿 마우스 사용자에게 클릭 가능 어포던스 제공. 모바일은 어차피 탭 시 즉시 동작하므로 시각적 피드백 부재가 UX 손상 아님.



---

### R30 — git hook 활성화 (Vibe 로그 강제 + Conventional Commits) (2026-05-07 13:30)

> 통합 repo 의 R32 작업 후, 분리 repo 에도 동일 정책을 적용하기 위한 hook 도입.
> 각 repo 의 .githooks/ 는 독립 working tree 라 중복처럼 보여도 git 표준 패턴 (husky / lefthook / pre-commit 도 동일).

| 라운드 | 시각 | 작업 | 산출물 |
|-------|------|------|-------|
| R-hooks.1 | 2026-05-07 13:30 | .githooks/pre-commit — 코드 변경 시 Vibe_Coding_Log.md 갱신 강제 | .githooks/pre-commit |
| R-hooks.2 | 2026-05-07 13:30 | .githooks/commit-msg — Conventional Commits 강제 (12 types, 한국어 가이드) | .githooks/commit-msg |
| R-hooks.3 | 2026-05-07 13:30 | tools/setup-githooks.sh + .ps1 — core.hooksPath=.githooks 활성화 + 다른 repo 배포 옵션 | tools/setup-githooks.{sh,ps1} |
| R-hooks.4 | 2026-05-07 13:30 | docs/git-hooks.md — 사용법/우회/트러블슈팅 가이드 | docs/git-hooks.md |
| R-hooks.5 | 2026-05-07 13:30 | core.hooksPath = .githooks 활성화 | (.git/config) |

### 📐 설계 결정

- 각 repo .githooks/ 중복은 git 표준 패턴. submodule / 사내 패키지 / home 공용 hooks 는 모두 무거움.
- 통합 repo → 분리 repo 동기화: tools/setup-githooks.sh 가 분리 repo 경로를 인자로 받아 자동 복사 + 활성화.
- 우회: SKIP_VIBE_LOG_CHECK=1 / SKIP_COMMIT_MSG_CHECK=1 (긴급용, 사후 보강).
- MS 브랜치까지만 작업 commit. develop / main / 배포는 사용자 명시 시점.



---

### R31 — 1차 배포 후속 보완: 사업자번호 모바일 + 객체감지 SVG 오버레이 + 콜드 스타트 워밍 핑 (2026-05-07 17:00)

> 1차 배포(2026-05-06) 후 실사용 피드백 3건 일괄 보강.
> 통합 repo 의 R30(객체감지 시퀀스 UX) + ContactModal 모바일 반응형 + R31(콜드 스타트 완화) 작업물을 분리 repo 로 동기화.
> 자율비행(R32) 관련 변경은 사용자 명시로 본 배포에서 제외.

| 라운드 | 시각 | 작업 | 산출물 |
|-------|------|------|-------|
| R31.1 | 2026-05-07 (오전) | **사업자번호 검색란 모바일 반응형** — input 의 기본 size(~150px) 가 flex-grow 와 무관하게 min-width 로 작용해 "진위 확인" 버튼을 밖으로 밀어내고 좌우 스크롤바 유발. `size={1}` + `min-w-0` + 버튼 `shrink-0` + 모바일 패딩 축소 (`px-3 sm:px-5`) 로 input 자유 축소 + 균형. | src/components/landing/ContactModal.jsx |
| R31.2 | 2026-05-07 10:05 | **객체감지 모드 시퀀스 UX (스캔→탐지)** — `detectionPhase` ∈ {idle, raw(0–1.0s), scan(1.0–2.2s), detected}. backend `?mode=raw` 요청 → SVG 가 박스 일체 렌더(burned-in box 회피). naturalWidth viewBox 기반 자동 정렬, 스캔 sweep + 격자 pulse + bbox 페이드인 + confidence 카운트업 chip + 심각도 컬러링(HIGH/MED/LOW). | src/components/video/LiveVideoFeed.jsx |
| R31.3 | 2026-05-07 10:05 | **CSS 키프레임 6종 전역 등록** — `scanSweep`, `scanGridPulse`, `detectPulse`, `detectGlow`, `detectLabelIn`, `detectCornerIn`. 컴포넌트 인라인 `<style>` 회피로 재렌더 비용 0. | src/index.css |
| R31.4 | 2026-05-07 17:00 | **Login.jsx 콜드 스타트 워밍 핑** — useEffect mount 시 `${VITE_API_BASE_URL}/` 핑 1회. 사용자가 ID/PW 입력하는 동안 Fly.io 머신 부팅 진행 → 실제 로그인 요청은 따뜻한 머신을 만남. `.catch(() => {})` fire-and-forget. | src/pages/Login.jsx |
| R31.5 | 2026-05-07 17:00 | **Landing.jsx 콜드 스타트 워밍 핑** — 동일 패턴. 랜딩 → 로그인 가는 동안 머신 미리 깨움 (직접 /login 진입은 R31.4 가 잡음). | src/pages/Landing.jsx |

### 📐 설계 결정 사항

- **모바일 input 의 기본 size 함정**: HTML `<input>` 은 `size` 속성 기본값이 ~20 chars (~150px) 이고 이것이 flex 컨테이너 안에서 min-width 처럼 작용 → flex-grow 가 무력화되고 형제 요소를 밖으로 밀어냄. `size={1}` 로 명시 축소 + `min-w-0` 으로 flex min-content 무시.
- **객체감지 detection 모드만 시퀀스, bbox 모드는 그대로**: 사용자 원본 피드백이 "객체감지모드에서" 한정. bbox 모드는 "단순 위치 표시 — 빠른 확인" 의도라 시퀀스 적용 시 의도 손상.
- **백엔드 raw 분기 + 프론트 SVG 분리**: detection 모드 진입 시 backend `?mode=raw` → 박스 없는 JPEG → SVG 가 박스 일체 렌더. burned-in box + SVG box 두 겹이면 미세 어긋남 + 시각 노이즈.
- **viewBox 기반 좌표 자동 정렬**: SVG `viewBox` + `preserveAspectRatio` 를 img 와 일치 → DOM 리사이즈/풀스크린 토글 시 자동 재정렬.
- **워밍 핑 root `/` 사용**: `{"status":"ok"}` 만 반환하는 가장 가벼운 엔드포인트. `/health` 는 모델 상태/카메라까지 검사해서 무겁고 503 가능성도 있어 워밍용 부적합.
- **fire-and-forget 패턴**: `.catch(() => {})` 로 실패해도 무시. 워밍 목적이라 응답 결과 사용 안 함, 콘솔 노이즈/UX 영향 0.
- **min_machines_running 안 건드림**: Fly 1GB 머신은 무료 한도 초과 가능성 → 비용 발생 우려. 사용자 명시 결정 필요. 워밍 핑만으로도 첫 로그인 체감속도 5~10초 단축 예상.

---

## 🎯 R29 — 체감 속도 + 드래그앤드랍 + onError 자동 retry (2026-05-07 19:00)

> 사용자 피드백: "전체적으로 체감 속도가 너무 느리다. 로그인 최초 10초+, 업로드/재생도 마찬가지. 다른 플랫폼 가면 된다는 생각이 드는 순간 망한 거다. 사용자 기다림 최소화. 드래그앤드랍도 가능하게." 통합 repo R-postdeploy.12 + R34 작업물 동기화.

### 🛠 변경

| 라운드 | 시각 | 작업 | 산출물 |
|-------|------|------|-------|
| R29.1 | 2026-05-07 19:00 | **HTML preconnect / dns-prefetch** — `index.html` 에 backend 도메인(aeroinspect-backend.fly.dev) 등록. 브라우저가 페이지 로드 즉시 DNS resolve + TCP/TLS handshake 미리 완료 → 첫 fetch가 ~200-500ms 더 빠름. | index.html |
| R29.2 | 2026-05-07 19:00 | **Login 다층 워밍 (mount + 5s + 12s + onFocus)** — 단발 워밍은 사용자가 빠르게 입력+제출 시 같은 부팅 큐에 합류해 콜드 비용을 그대로 부담. 3-tier 시간 + input focus 추가 핑으로 부팅 완료 시점을 사용자 인지 시간 안에 확실히 끌어들임. 영구 polling은 안 함 (비용 제어). | Login.jsx |
| R29.3 | 2026-05-07 19:00 | **Dashboard mount 시 `/test/init` 사전 호출** — backend 워밍 + ONNX 11모델 로드를 dashboard 진입 즉시 백그라운드에 트리거. 사용자가 START 누를 시점엔 이미 모델 준비 완료 상태 → 첫 frame 즉시 흐름. fire-and-forget. | Dashboard.jsx |
| R29.4 | 2026-05-07 19:00 | **드래그앤드랍 업로드 + 자동 재생** — Dashboard 전역 dragenter/over/drop 리스너. drop 시 (1) source='upload' 자동 전환 → (2) /test/upload 업로드 → (3) /test/start 자동 호출까지 일괄. 시각적 dropzone 오버레이 (드래그 중/업로드 중 노출). 파일 첨부 버튼 동선 클릭 0회로 단축. | Dashboard.jsx |
| R29.5 | 2026-05-07 19:00 | **`<img>` onError 자동 재시도 (5초 × 12회 = 60초)** — Fly.io 콜드 스타트 + 11모델 로드(~25-40초) 동안 backend 응답 못해 onError → hasError 영구 고정. 사용자 클릭 없이도 머신 깨어나면 자연 연결. MAX_RETRIES=12 로 무한 retry 차단. | LiveVideoFeed.jsx |

### 📐 설계 결정

- **다층 워밍 vs min_machines_running=1 비용 결정**: 후자가 가장 직접적이지만 비용 발생. 메모리 룰 [project_aws_free_tier], [project_deadline] 상황 고려해 무비용 다층 워밍으로 우회. 사용자 명시 시점에 비용 정책 변경 가능.
- **드래그앤드랍 자동 START — 사용자 제어 vs UX 단축 trade-off**: drop 시 자동으로 START 까지 호출. 사용자 의도 명시("드래그앤드랍 가능했으면") 가 동선 단축이라 STOP 제어는 명시적 STOP 버튼 유지. drop 만으로 즉시 검증 가능한 흐름 확보.
- **window 전역 리스너 vs 컴포넌트 로컬**: window 전역으로 두면 dashboard 어느 영역(영상/패널/사이드바)에 떨어뜨려도 동작. dragenter/leave 카운터 패턴(`dragCounterRef`)으로 child element 진입/이탈에 따른 깜빡임 방지.
- **자동 retry 12회(60초) 상한**: 무한 재시도면 backend 가 진짜 죽었을 때 사용자가 영구 대기. 60초면 콜드 스타트 흡수에 충분 + 그 이후 실패면 backend 측 진짜 장애로 명시 안내 가능.

### 🚨 안전성 영향

- 거짓 응답 가속화 사고 없음 — 모든 변경이 시각화/네트워크 워밍 영역. 검출/추론 결과 정확도엔 영향 0.
- 워밍 핑 자체는 backend 부하 미미(빈 GET 응답). 12 retry × 5s 도 머신이 살아있으면 200 한 번씩만 응답.

---

## 🎯 R30 — 체감 속도 측정 도구 + delayed spinner + 클라이언트 압축 + upload progress (2026-05-07 20:00)

> 사용자 피드백: "구글/네이버/쿠팡은 '로그인 중' 문구가 뜨기도 전에 로그인 완료. 영상 업로드도 사용자 대기 최소화. 도구 붙여서 테스트 진행." 통합 repo R35 작업물 동기화.

### 🛠 변경

| 라운드 | 시각 | 작업 | 산출물 |
|-------|------|------|-------|
| R30.1 | 2026-05-07 20:00 | **perfTimer 유틸** — `perfStart/perfEnd(label)` + sessionStorage 누적 + window 이벤트. Performance API 기반 ms 측정. | utils/perfTimer.js |
| R30.2 | 2026-05-07 20:00 | **PerfTimerWidget** — 화면 우하단 측정 표시 (`?perf=1` 활성). 운영에 박혀 있어도 일반 사용자엔 안 보임. 노션 동기화용 스크린샷 캡처 시 측정값 그대로 첨부 가능. | components/dev/PerfTimerWidget.jsx, App.jsx |
| R30.3 | 2026-05-07 20:00 | **Login delayed spinner (300ms)** — `loading=true` 후 300ms 이내 응답이면 "로그인 중..." 안 띄움. 머신 깨어있는 정상 케이스(~100-200ms)에선 사용자 체감 = 즉시 로그인 완료. 구글/네이버 패턴. | Login.jsx |
| R30.4 | 2026-05-07 20:00 | **클라이언트 이미지 다운샘플 (4K → 1280)** — canvas drawImage + JPEG 0.85. 사이즈 80~95% 절감. 영상은 그대로(ffmpeg.wasm은 ROI 낮음). | utils/imageDownsample.js |
| R30.5 | 2026-05-07 20:00 | **uploadWithProgress XHR 유틸** — fetch는 upload progress 표준 미지원. XMLHttpRequest .upload.onprogress로 percent/speedKbps/etaSeconds 실시간 제공. | utils/uploadWithProgress.js |
| R30.6 | 2026-05-07 20:00 | **Dashboard 드래그앤드랍 + TestModeBar 파일첨부** 강화 — 다운샘플 + progress + perf 통합. dropzone 오버레이에 진행률 바 + 속도 + ETA + 압축 효과 실시간. | Dashboard.jsx, TestModeBar.jsx |

### 📐 설계 결정

- **Delayed spinner — 구글/네이버 패턴**: 사용자 체감 속도의 본질은 응답 시간이 아니라 "기다림 인지 시간". 300ms 이내면 spinner 자체를 안 띄워서 인지 시간 0. 응답이 느릴 때만 시각적 피드백.
- **이미지만 다운샘플 / 영상은 그대로**: ffmpeg.wasm은 ~30MB 다운로드 + 초기 로딩 무거워 단발 ROI 낮음. 이미지는 canvas 네이티브 리사이즈로 가볍고 빠름. 1280 long-edge는 M1/M2/M3 YOLO 학습 imgsz(640~1024) 대비 충분.
- **XHR vs fetch — upload progress**: fetch는 ReadableStream 우회로 가능하지만 호환성 X. XHR `.upload.onprogress`는 표준 + 100% 호환.
- **perf 위젯 활성화 — query param + localStorage**: 운영 배포에 박혀 있어도 일반 사용자엔 안 보이게 + 개발자/QA는 즉시 활성화.

### 🚨 안전성 영향

- 검출 정확도 영향 0 — 이미지 다운샘플은 클라이언트 측 시각 자료에만 적용.
- 1280 long-edge는 학습 imgsz 대비 충분 — 모델 입력 단계에서 다시 letterbox.
- delayed spinner는 시각적 변경뿐 — 응답 시간이 1.5초 넘어가면 정상적으로 "로그인 중..." 표시.
- 압축 후 SVG/HEIC/손상 파일은 원본 그대로 통과 — 데이터 손실 없음.

### 📊 측정 라벨 (`?perf=1` 위젯)

- `login` (목표: <300ms로 spinner 안 뜨기)
- `dashboard-warm-root`, `dashboard-warm-init` (콜드 스타트 진단)
- `upload-downsample`, `upload-network`, `upload-total`

---

## 🎯 R31 — CAD/평면도 → 3D 모델링 정확도 + L3 자율비행 LiDAR 실시간 시각화 (2026-05-13 17:30)

> 사용자 피드백: "지금 캐드 이미지를 3D 모델링하거나 평면도 이미지를 3D 모델링하는 거에 있어서 부족한 부분 자가검토하고 보완해. 스케일 및 치수 관련해서 정확한지 확인해. L3는 Gazebo를 이용해서 드론의 시뮬레이션 비행을 통한 3D 모델링을 할거야 — 자율비행이니까 참고해서 진행해. 실시간 자율비행 프로세스도 검증."

### 🛠 변경

| 라운드 | 시각 | 작업 | 산출물 |
|-------|------|------|-------|
| R31.1 | 2026-05-13 16:00 | **floorplanApi axios 래퍼 + 클라이언트 사전 검증** — analyze/validate/upload+process 통합. `preflightFloorplanFile()` 가 image(50KB-25MB)/cad(.dxf/.dwg/.ifc, 50MB) 사전 거름. axios `onUploadProgress` + 서버 처리 단계 추정으로 진행률 0-100 통합. 기존 raw fetch 의 "25%/60%/90% 가짜 단계" 제거. | src/api/floorplanApi.js |
| R31.2 | 2026-05-13 16:15 | **BuildingMesh 종횡비 보존 + 치수 출처 표시** — 하드코딩 `WIDTH=10, DEPTH=8` 제거, `deriveSceneSize({imageWidth, imageHeight, scalePxPerMeter, outline})` 도입. 우선순위: calibrated(scale_px_per_meter) > aspect(이미지 종횡비) > outline bbox > fallback. 가로 1500×세로 1000(3:2) 평면도가 5:4 로 강제되던 왜곡 제거. 치수 라벨에 "실측/추정" 출처 표기. | src/components/map3d/BuildingMesh.jsx |
| R31.3 | 2026-05-13 16:20 | **L1 (CAD) 데이터 기반 렌더** — `LevelOneMesh` 가 항상 하드코딩 4벽만 그리던 문제 제거. wallsData 있으면 `WallMeshes` + `OutlineBoundary`, 없으면 `FourWallsFallback`. DXF 백엔드 추출 결과가 즉시 시각화됨. | src/components/map3d/BuildingMesh.jsx |
| R31.4 | 2026-05-13 16:25 | **store 필드 확장 — imageWidth/imageHeight/scalePxPerMeter** — sessionStore + preModelStore 둘 다. selectPreModel/setLevel/reset/partialize 일관 처리. BuildingScene 가 sessionStore → BuildingMesh 로 전달. | src/store/sessionStore.js, src/store/preModelStore.js, src/components/map3d/BuildingScene.jsx |
| R31.5 | 2026-05-13 16:40 | **PreWork 전면 재작성** — raw fetch → axios. L1 가짜 `setTimeout(2000)` mock 제거하고 실제 `uploadAndProcessCad()` 호출 (DXF 만 수용, DWG/IFC 차단). L2 는 `validateFloorplan()` 품질 게이트 추가 (rejected 차단, warning 통과). `readImageDimensions()` 로 imageWidth/imageHeight 사전 추출 → preModel 저장. 외곽 윤곽선 폴백 안내. | src/pages/employee/PreWork.jsx |
| R31.6 | 2026-05-13 17:00 | **missionApi + droneStore lidarPoints 인프라** — startAutonomousScan/cancelMission/getMissionStatus/listMissions axios 래퍼. droneStore 에 lidarPoints (Float32Array, 불변 갱신) + lidarPointCount + lidarMissionStatus + 5개 액션 (begin/append/finish/fail/reset) 추가. | src/api/missionApi.js, src/store/droneStore.js |
| R31.7 | 2026-05-13 17:10 | **useWebSocket — lidar/mission 이벤트 라우팅** — `lidar.points` → droneStore.appendLidarPoints, `mission.completed` → finishLidarMission, `mission.failed` → failLidarMission. (이후 사용자가 다중 채널 구독 + slam.created/updated/thermal.analysis 까지 확장) | src/hooks/useWebSocket.js |
| R31.8 | 2026-05-13 17:20 | **LevelThreeMesh 실 LiDAR 점군 우선** — droneStore.lidarPoints 가 있으면 좌표축 매핑(LiDAR z↔Three y) 후 시각화, 없으면 5000점 랜덤 폴백 유지. lidarMissionMeta.worldW/worldD 로 씬 크기 산출. 데이터 출처 라벨 ("실측 스캔 중/완료" vs "미시작 폴백"). | src/components/map3d/BuildingMesh.jsx |
| R31.9 | 2026-05-13 17:25 | **SessionModeling 자율비행 트리거** — L3 시작 버튼이 백엔드 `startAutonomousScan()` 호출 → WS 점 누적. 취소 시 `cancelMission()` 동시 호출. 진행 상태/에러 표기. | src/pages/session/SessionModeling.jsx |
| R31.10 | 2026-05-13 17:30 | **L3 폴백 walls 패치** — 검증 중 발견: wallsData=null (도면 없는 정상 시나리오) 시 백엔드 미션 호출이 SKIP 되어 자율비행 자체가 발화 안 함. 8×6m 빈 사각형 walls/outline 즉석 생성으로 폴백 → 시뮬레이션 항상 동작. 빌드 후 빈 환경 테스트 1,512점 누적 + mission.completed 확인. | src/pages/session/SessionModeling.jsx |

### 📐 설계 결정

- **종횡비 보존 우선순위 4단**: calibrated 가 가장 정확하지만 사용자가 calibrate 단계를 거의 안 거침 → aspect ratio 폴백이 실질 default. 하드코딩 10×8 은 모든 평면도에 동일 비율 강제하는 "보이지 않는 왜곡" — 사용자가 치수 라벨 "10.0m/8.0m" 를 진짜 수치로 오인할 위험.
- **치수 출처 라벨 노출**: "실측/추정/기본값" 을 3D 위에 띄워 사용자가 정확도 신뢰 수준을 즉시 인지. calibrate 안 했으면 "추정" 명시 → 후속 calibration 동기 부여.
- **L1 데이터 기반 + 폴백 유지**: DXF 만 백엔드 처리 가능하고 DWG/IFC 는 향후 지원. 폴백 4벽은 "벽체 추출 실패해도 화면이 비지 않는" 안전망. 사용자 의도("CAD 도 의미있는 3D")와 백엔드 한계 사이의 타협.
- **품질 게이트 — rejected 차단 / warning 통과**: 흐린 이미지 그대로 처리하면 OpenCV 가 거의 빈 walls 반환 → 사용자가 "내가 잘못 했나" 혼란. validate 가 7개 항목(해상도/선명도/대비/직선비율/직각/기울기/벽체수) 종합 점수 → rejected 면 명시 차단, warning 은 경고 후 진행.
- **Float32Array + 불변 갱신**: appendLidarPoints 가 매 batch 마다 새 Float32Array 생성 (기존 + 신규 합쳐서 set). useMemo 가 reference 변경 감지해 BufferGeometry 재생성. 점이 누적될수록 비용 증가하지만 boustrophedon 1회 스캔 ~3000점 수준이라 허용 범위.
- **L3 폴백 walls — 데모/실 비행 분리 정신**: "도면 없는 현장" 이 L3 의 정상 시나리오인데 walls 가 없으면 raycast 시뮬이 의미 없음. 두 갈래: (a) UI 변경해서 사용자가 가상 환경 명시 선택, (b) 백엔드/프론트가 묵시적 폴백. (b) 채택 — 사용자 동선에 단계 추가 안 하고 데모 모드 항상 작동. 실 ROS2/Gazebo 환경 도입 시 해당 분기는 제거.
- **WS 채널 — 시뮬레이터가 'defects' 발행**: 현재 useWebSocket 이 'defects' 단일 채널 구독 (이후 다중 채널로 확장). 모든 이벤트(lidar/mission 포함) 를 'defects' 에 일괄 발행해 채널 추가 없이 라우팅. 의미상 'lidar' 분리가 깨끗하지만 현재 단순화 우선.

### 🚨 안전성 영향

- 종횡비 보존 변경은 시각/측정 영역 — 검출 정확도 영향 0.
- L1 폴백 제거 안 함 → wallsData 없을 때 동일 화면 보장 (회귀 위험 0).
- L3 폴백 walls 는 "데모 환경" 명시 의도. 실제 드론 비행 흐름에는 영향 없음 — 그 경우 프론트가 sessionStore.wallsData 를 가지고 있을 것.
- 빌드: `npm run build` 13.10s 통과. 백엔드 시뮬레이터 종합 테스트(L2 환경 4032점, 빈 환경 1512점) 모두 100% 완주 + mission.completed 발행 확인.

### 🔍 자가검토 발견 갭 (보완 완료)

| # | 갭 | 보완 |
|---|---|---|
| 1 | 하드코딩 10×8 m → 모든 평면도 왜곡 | deriveSceneSize 4단 우선순위 |
| 2 | L1 LevelOneMesh 가 wallsData 무시 | 데이터 기반 분기 + 4벽 폴백 |
| 3 | /validate 엔드포인트 미사용 | PreWork L2 진입 시 호출, rejected 차단 |
| 4 | raw fetch + 가짜 진행률 | axios 래퍼 + 실 onUploadProgress |
| 5 | 클라이언트 사전 검증 부재 | preflightFloorplanFile (크기/타입) |
| 6 | LevelThreeMesh 가 항상 랜덤 5000점 | droneStore.lidarPoints 우선, 폴백 유지 |
| 7 | L3 진입 시 백엔드 미션 트리거 없음 | SessionModeling.handleStartDroneScan |
| 8 | walls=null 시 자율비행 SKIP (검증 중 발견) | 8×6m 폴백 walls 즉석 생성 |

---

## 🎯 R32 — 전체 프로세스 검증 & 통합 미스매치 보완 (2026-05-13 16:00)

> 사용자 피드백: "현재 프로젝트의 전체적인 프로세스 검증해줘. 로그인부터 시작해서 모든 기능들 전체 다. 누락된 부분이 있거나 보완이 필요한 부분이 있으면 정리해서 알려주면 순차적으로 진행하자." → 프론트/백 동시 audit 후 P0(보안)·P1(미구현)·P2(통합 미스매치) 정리, 사용자 확인 후 순차 수정·검증·다음 단계 반복. 통합 repo TEAM_PROJECT_2 도 동일 코드/ENV 동기화.

### 🛠 변경

| 라운드 | 시각 | 작업 | 산출물 |
|-------|------|------|-------|
| R32.1 | 2026-05-13 14:30 | **useWebSocket 다중 채널 구독** — 기존 `?channel=defects` 단일 구독 → `?channels=defects,telemetry,camera,thermal` 콤마 분리. 백엔드가 `telemetry`/`camera`/`thermal` 채널로 분리 broadcast 하는데 프론트가 못 받던 미스매치 해결. autonomous_flight_simulator 는 'defects' 채널로 발행해 미션 중에는 작동했지만, 일반 카메라 모드 전환·열화상 분석·텔레메트리 POST 결과는 화면에 안 떴음. | src/hooks/useWebSocket.js |
| R32.2 | 2026-05-13 14:35 | **WS JWT 토큰 attach + 본인 채널 자동 구독** — authStore.token/user.id 를 useCallback deps 로 받아 로그인 시 `?token=...&channels=...,notifications:{uid},user:{uid}` 형태로 자동 갱신. 로그아웃 또는 사용자 전환 시 기존 소켓 close → 새 채널로 재연결. mountedRef + retryDelayRef 로 race 차단. | src/hooks/useWebSocket.js |
| R32.3 | 2026-05-13 14:35 | **defect.batch 핸들러 추가** — 백엔드 `/ai/batch` 가 `defect.batch` 발행하는데 프론트는 `defect.new` 만 처리 → 배치 탐지가 모두 묵살되던 사고. `data.items.forEach(d => pushDefect(d))` 로 단건과 동일 경로 합류. | src/hooks/useWebSocket.js |
| R32.4 | 2026-05-13 14:40 | **thermalStore 신설 + useThermalData 셀렉터 래퍼** — 기존 `useThermalData` 가 컴포넌트별 useState 라 useWebSocket 핸들러에서 직접 push 불가 (인스턴스 분리). Zustand 모듈 싱글톤 store 로 옮기고, 기존 훅은 셀렉터로 호환 유지 → ThermalGraph 무수정. | src/store/thermalStore.js (신규), src/hooks/useThermalData.js |
| R32.5 | 2026-05-13 14:45 | **WS thermal/slam 이벤트 라우팅** — `thermal.frame`, `thermal.analysis` → thermalStore.pushReading. `slam.created`, `slam.updated` console.log (3D 미니맵 향후 hook 지점). `connection.established` 에서 거부된 채널(rejected) 워닝 로그. | src/hooks/useWebSocket.js |
| R32.6 | 2026-05-13 15:10 | **ThermalOverlay 실제 HUD 구현** — 기존 placeholder Canvas + TODO 주석 → thermalStore.readings 최신값(max/avg/min) 우상단 컴팩트 패널. Δ(max-avg)≥3°C 면 빨간 펄스 ALERT 보더 + shadow. LiveVideoFeed 에 `cameraMode === 'thermal' \|\| 'blend'` 일 때 표시. | src/components/video/ThermalOverlay.jsx, src/components/video/LiveVideoFeed.jsx |
| R32.7 | 2026-05-13 15:25 | **ContactModal → /api/v1/contact 연동** — 기존 `alert(접수됨)` + TODO 주석으로 백엔드 미연결. submitContactInquiry() axios POST → 슈퍼어드민 notification 발송. submitting 상태로 더블 제출 차단, 실패 시 detail 표시. | src/api/contactApi.js (신규), src/components/landing/ContactModal.jsx |
| R32.8 | 2026-05-13 16:48 | **로컬 .env 작성 (운영 secret 미러)** — Vercel/Fly 환경변수만 두지 말고 로컬 .env 에도 동일 정리 요청. 운영값 미러 + dev 기본값(API_BASE/WS_URL localhost) + OAuth client id 동기. VITE_ODCLOUD_SERVICE_KEY / VITE_KAKAO_JS_KEY 는 통합 repo TEAM_PROJECT_2 frontend/.env 에서 동기화. | .env (신규, .gitignore 포함) |
| R32.9 | 2026-05-13 17:30 | **통합 repo TEAM_PROJECT_2 동기화** — 분리 repo 의 7개 frontend 변경 파일(useWebSocket / useThermalData / thermalStore / ThermalOverlay / LiveVideoFeed / ContactModal / contactApi)을 통합 repo 에 그대로 복사. 통합 .env 는 이미 ODCLOUD/KAKAO_JS 가 채워져 있어 분리 repo placeholder 백필 소스로 사용. | TEAM_PROJECT_2_Drone_project/frontend/ |

### 📐 설계 결정

- **다중 채널 단일 연결 vs 채널당 소켓**: 후자는 N WebSocket 동시 보유 — Fly free tier 머신 메모리 + 클라이언트 브라우저 자원 낭비. 단일 연결로 콤마 분리 구독 (백엔드가 `register()` 분리로 accept 중복 없이 추가 등록) 채택 → 코드 단순 + 동일 핸드셰이크 비용.
- **JWT 토큰 URL 쿼리 vs Subprotocol**: WebSocket 핸드셰이크에서 Bearer 헤더 추가가 표준 브라우저 API 로 불가능. 쿼리 파라미터 토큰은 로그/프록시 캐시 위험이 있지만 wss(TLS) + 단기 access token + 본인 채널만 검증이라 위험 작음. Sec-WebSocket-Protocol 우회는 표준 외이고 클라이언트/서버 모두 복잡 — 미채택.
- **deps 에 token/userId 포함 → 재연결**: 로그아웃 시 본인 채널 구독을 즉시 해제하지 않으면 다음 사용자 로그인 시까지 이전 사용자 알림이 떠 있을 수 있음. useCallback deps 로 reactive 재연결 강제. mountedRef 로 언마운트 race 차단.
- **defect.batch 가 단건처럼 forEach**: 배치 vs 단건 처리를 분기하면 testMediaReady 게이트 로직(시뮬레이션 첫 프레임 대기 큐) 이 두 군데 중복. pushDefect 단일 함수로 통합 → 게이트 통과 후 동일 경로.
- **thermalStore 슬라이딩 윈도우 120 샘플**: 1fps × 120 = 2분 그래프. 더 길면 메모리 증가 + Recharts 렌더 비용. ThermalOverlay 는 latest 1건만 쓰지만, 동일 store 를 ThermalGraph (charts/) 가 공유해 일관 데이터 소스.
- **Thermal 임계값 +3°C — 단열 결함 판정선**: 도메인 가이드. 향후 사이트별 조정 가능하도록 alertThreshold prop 노출.
- **ContactModal — 비로그인 호출**: 랜딩 페이지 사용자가 가입 전이라도 문의해야 함 → /contact 백엔드는 무인증 (rate limit 으로 abuse 차단). Authorization 헤더 없어도 동작.

### 🚨 안전성 영향

- WS JWT 인증 도입 — 로그아웃 후에도 옛 알림이 새 사용자에게 누설되던 잠재 사고 차단. user_id 미스매치 채널 구독 시 백엔드가 묵시적 거부 → rejected 배열로 디버깅 가능.
- 기존 카메라 모드 sync (다른 사용자가 mode 변경 시 내 화면도 따라옴) 가 처음으로 동작. 운영 환경에서 동기 카메라 워크플로 가능.
- 빌드: `npm run build` 14.61s 통과 (×5 회 검증). 번들 크기 +0.3KB.

### 🔍 자가검토 발견 갭 (보완 완료)

| # | 갭 | 보완 |
|---|---|---|
| 1 | useWebSocket 단일 채널 → telemetry/camera/thermal 누락 | 다중 채널 ?channels= |
| 2 | 본인 채널(notifications/user) 구독 부재 | JWT token + uid 자동 attach |
| 3 | defect.batch 핸들러 없음 → AI batch 묵살 | forEach pushDefect |
| 4 | useThermalData hook-instance 라 WS push 불가 | thermalStore 모듈 싱글톤 |
| 5 | ThermalOverlay TODO placeholder | 실제 max/avg/min HUD + ALERT |
| 6 | ContactModal handleSubmit 가 alert 만 (백엔드 미연결) | /contact 백엔드 + axios |
| 7 | 로컬 .env 없음 → 환경변수 누락 시 dev 모드 부팅 실패 | 운영 secret 미러 + dev 기본값 |


---

## 🎯 R37 — test_mode 영상 60fps 아키텍처 (2026-05-15 15:30~15:45)

> 사용자 피드백: "test mode 에서 첨부한 영상이 프레임 너무 낮은지 끊긴다" → MJPEG 재인코딩이 Fly 1 vCPU 결정적 병목임을 확인 → 원본 mp4 를 HTTP Range 로 직접 서빙 + `<video>` 네이티브 디코드 + SVG 오버레이로 전환. 사용자 추가 요청: "60fps + Fly 30fps 안정". 백엔드 R28 동기.

### 🛠 변경

| 라운드 | 시각 | 작업 | 산출물 |
|-------|------|------|-------|
| R37.1 | 2026-05-15 15:30 | **신규 컴포넌트 DetectionOverlay.jsx** — `<video>` 위 SVG bbox 레이어. testDetectionsStore detection 을 `video.currentTime ± 0.4s` 윈도우로 필터해 표시. `requestAnimationFrame` 33ms 폴링(timeupdate 250ms 보다 부드럽게). SVG viewBox = frame_w × frame_h 로 원본 좌표 1:1 매핑. | src/components/video/DetectionOverlay.jsx (신규) |
| R37.2 | 2026-05-15 15:35 | **신규 hook useTestActiveMedia.js** — `/api/v1/stream/test/active` 2초 폴링. `{kind, filename, fps, duration, frame_w, frame_h}` 반환 + testDetectionsStore activeFilename 동기화(영상 교체 시 detection clear). | src/hooks/useTestActiveMedia.js (신규) |
| R37.3 | 2026-05-15 15:38 | **신규 store testDetectionsStore.js** — video_timestamp_sec 키 detection 타임라인. ingest() 가 timestamp 정렬 + 중복 차단. defectStore 와 분리(카드 패널 vs 오버레이 책임 분리). | src/store/testDetectionsStore.js (신규) |
| R37.4 | 2026-05-15 15:40 | **LiveVideoFeed isDirectVideoMode early-return + `<video>`** — active.kind===video && cameraMode===rgb && fill 이면 `<video src=/test/upload/file/{name}>` + `<DetectionOverlay>` 렌더. testPlayState (playing/paused/stopped) → video.play/pause/seek 동기화. onLoadedMetadata 에서 markTestMediaReady. 좌하단 `DIRECT · {fps}fps · {filename}` 디버그 뱃지. | src/components/video/LiveVideoFeed.jsx |
| R37.5 | 2026-05-15 15:42 | **useWebSocket pushDefect 확장** — video_timestamp_sec 가 있으면 testDetectionsStore.ingest() 호출(기존 defectStore 라우팅 유지). | src/hooks/useWebSocket.js |

### 📐 설계 결정

- 카드 패널 store (defectStore) 와 오버레이 store (testDetectionsStore) 분리: 정렬 책임이 달라서 한 store 에 섞으면 깨지기 쉬움.
- `<video>` autoPlay + muted + playsInline: 모바일/사파리 정책 허용 조건.
- HEVC/H.265 비호환 mp4 는 일부 브라우저 디코드 불가 — H.264 baseline 권장.
- Detection 누적 후 2회 재생 시 처음 구간에도 bbox 표시되는 게 의도(재시청 UX).

### ✅ 검증

- `vite build`: 15.66s OK, 4.85MB chunk.
- 빌드 후 미디어가 영상이면 <video>, 이미지면 기존 MJPEG <img> 자동 분기.
- 추론 결과 ±0.4s 윈도우 안에서만 오버레이 점멸.


---

## 🎯 R38 — AI Chatbot 프론트 컴포넌트 누락 분 + react-markdown 의존성 (2026-05-15 15:50)

> R36 ai_chat 백엔드/스토어/API 는 동기됐으나 실제 화면 패널/버블/입력/플로팅 버튼 컴포넌트가 누락. App.jsx 의 GlobalFloatingChatbot 와이어업 + package.json react-markdown 추가. package-lock 재생성으로 Vercel npm ci 대비.

### 🛠 변경

| 라운드 | 시각 | 작업 | 산출물 |
|-------|------|------|-------|
| R38.1 | 2026-05-15 15:50 | **chatbot 8개 컴포넌트 신규** — ChatbotInput / ChatbotMessageBubble / ChatbotMessageThread / ChatbotPanel / ChatbotPanelHeader / FloatingChatbotButton / GlobalFloatingChatbot / ThreadList. | src/components/chatbot/*.jsx |
| R38.2 | 2026-05-15 15:50 | **App.jsx GlobalFloatingChatbot 와이어업** — 기존 GlobalFloatingChat(채팅) 옆에 GlobalFloatingChatbot(AI) 추가. | src/App.jsx |
| R38.3 | 2026-05-15 15:51 | **react-markdown ^9.0.1** — 챗봇 메시지 마크다운 렌더링. npm install 로 package-lock 재생성(Vercel npm ci 안전). | package.json, package-lock.json |

### ✅ 검증

- `vite build`: 18.13s OK.
- package-lock 에 react-markdown 3 entries 등록 확인.


---

## 🎯 R-v1.1.01 — OpenAI 챗봇 UI 완전 통합 (2026-05-15 오후)

> 사용자 요청: "open AI 를 활용한 chatbot 을 만들 예정 — 건축물·하자에 대한 도메인 대화" + "memory 기능 — 다음날도 흐름 유지" + "세션별 대화방 수동 생성" + "통합/분리 repo 모두 동일 반영". 이전 R38 로그는 분리 repo 만 부분 동기됐고 실제 컴포넌트/의존성이 누락 상태였음 — 이번 라운드는 통합/분리 repo 양쪽에 실제 8 컴포넌트 + aiChatApi + aiChatStore + App.jsx 마운트 + package.json `react-markdown` 추가를 완전 적용.

### 🛠 변경

| 라운드 | 시각 | 작업 | 산출물 |
|-------|------|------|-------|
| .01.1 | 2026-05-15 오후 | **aiChatApi.js (REST + SSE)** — listThreads / createThread / renameThread / deleteThread / listMessages / sendMessageStream. SSE 는 fetch+ReadableStream 으로 `data: {json}\n\n` 라인 파싱. EventSource 미사용(GET-only + 커스텀 헤더 불가). | src/api/aiChatApi.js (신규) |
| .01.2 | 2026-05-15 오후 | **aiChatStore (Zustand)** — isOpen / view('list'\|'thread') / threads / messagesByThread 캐시 / streaming + streamingDraft + AbortController. sendMessage 는 낙관적 user 메시지 추가 후 onDelta/onDone 으로 누적. 새로고침 후 selectThread 시 서버 히스토리 페치. | src/store/aiChatStore.js (신규) |
| .01.3 | 2026-05-15 오후 | **8개 chatbot 컴포넌트** — FloatingChatbotButton(violet FAB, right-24) / ChatbotPanel(우측 sliding drawer, ESC 닫기) / ChatbotPanelHeader(뒤로·새 대화·삭제·닫기) / ThreadList(빈 상태 추천 질문 4종) / ChatbotMessageThread(자동 스크롤, 스트리밍 중 임시 bubble) / ChatbotMessageBubble(react-markdown raw HTML 비허용) / ChatbotInput(Enter 전송, Shift+Enter 줄바꿈, 4000자 가드, 중단 버튼) / GlobalFloatingChatbot(/employee/* + 토큰 보유 시에만 렌더). | src/components/chatbot/*.jsx (8개 신규) |
| .01.4 | 2026-05-15 오후 | **App.jsx GlobalFloatingChatbot 마운트** — 기존 `<GlobalFloatingChat />`(메신저) 옆에 `<GlobalFloatingChatbot />`(AI 챗봇) 추가. 두 FAB 시각 구분: 기존 blue right-6 / 신규 violet right-24. | src/App.jsx |
| .01.5 | 2026-05-15 오후 | **react-markdown ^9.0.1 의존성 명시** — 챗봇 어시스턴트 메시지의 표·목록·코드 가독성. `disallowedElements=['script','iframe','style','object','embed']` + `unwrapDisallowed` 로 XSS 방어. | package.json |

### 📐 설계 결정 / 자가검토

- **별도 컴포넌트 트리**: 기존 메신저(`/employee/chat`) 코드와 인터페이스 의미가 다름(사람↔AI). MessageBubble/Input 재사용 시 sender_id vs role 분기 지저분 → 별 트리로 분리.
- **우측 sliding drawer**: 모달이 아니라 우측 패널 — 사용자가 화면 좌측 데이터(대시보드/리포트)를 보면서 "이 결함 뭐야?" 식 질의 가능.
- **fetch + ReadableStream**: EventSource 는 GET 전용·Authorization 헤더 미지원이라 사용 X. reportApi.js 의 SSE 패턴 차용 후 라인 파서만 보강.
- **낙관적 user 메시지**: 서버 INSERT 전 즉시 화면 반영. onDone 에서 assistant 메시지 영속화 + thread 를 목록 상단으로 끌어올림.
- **react-markdown raw HTML 차단**: 어시스턴트가 잘못된 HTML 을 뱉어도 DOM 인젝션 차단. 외부 링크는 target=_blank rel=noopener 자동.

### ✅ 검증 (선/후)

- `/employee` 진입 시 violet "AI 어시스턴트" FAB 우하단 노출 (메신저 FAB 좌측, 충돌 없음)
- 새 대화 → 메시지 전송 → 토큰 스트림이 bubble 에 누적 → 완료 시 done event + thread 목록 상단 갱신
- 새로고침 후 동일 thread 선택 → 서버에서 메시지 히스토리 페치 → 이전 흐름 유지
- 입력 4000자 초과 차단 / 스트리밍 중 입력 disabled / 중단 버튼 동작 / ESC 패널 닫기

### 🚨 안전성 영향

- 어시스턴트 마크다운 raw HTML 차단(XSS)
- API 호출 sessionStorage 토큰 + X-Organization-Id 자동 첨부 (백엔드에서 user_id+org_id 이중 검증)
- 비 /employee/* 경로 / 비 로그인 상태에서는 FAB·패널 렌더 X — 랜딩 페이지 비로그인 입장에서는 챗봇 비노출


---

## 🎯 R-v1.1.02 — 어시스턴트 답변 클립보드 복사 UX (2026-05-15 오후)

> 사용자 요청: "ChatBot 의 대화 답변을 클립보드로 복사할 수 있게 해줄 수 있을까? 내가 드래그해서 복사하는게 아닌 다른 UX적인 방법으로 복사될 수 있도록".

### 🛠 변경

| 라운드 | 시각 | 작업 | 산출물 |
|-------|------|------|-------|
| R-v1.1.02.1 | 2026-05-15 오후 | **assistant bubble 우상단 복사 버튼** — ChatGPT 스타일. 데스크톱 hover 시 fade-in / 모바일·터치는 항상 노출. `navigator.clipboard.writeText` + 구형 fallback(textarea+execCommand). 성공 시 1.5s 동안 Copy → Check 아이콘 + emerald 색 피드백. 스트리밍 중·빈 응답은 버튼 숨김. user bubble 은 복사 X (자기 입력이라 의미 없음). lucide `Copy`/`Check` 아이콘 신규 사용. | src/components/chatbot/ChatbotMessageBubble.jsx |

### 📐 설계 결정

- **위치 우상단 absolute**: bubble 안 텍스트와 안 겹치고 ChatGPT/Claude 패턴에 익숙한 UX.
- **데스크톱 hover-only / 모바일 always**: hover 없는 터치 환경 가독성 보장 위해 `md:opacity-0 md:group-hover:opacity-100` 분기.
- **fallback**: `navigator.clipboard` 미지원 환경(HTTP/구형) 에서도 동작하도록 hidden textarea + `execCommand('copy')`. 운영은 HTTPS 라 정상 경로 사용.
- **실패 무시**: 권한 거부 등 에러는 UI 잡음 없이 silent — 드래그 복사로 우회 가능 (기존 동작 그대로).
- **체크 1.5s 후 원복**: 사용자가 여러 응답을 빠르게 복사할 때 자연스러운 토글.

### ✅ 검증

- `vite build`: 14.99s OK.
- 빌드 산출물 크기 변화 미미 (lucide Copy/Check 아이콘 추가 분 약 +0.3KB).


---

## 🎯 R-v1.1.03 — ThreadList 자동 제목 반영 + FAB 세로 스택 (2026-05-15 오후)

> 사용자 피드백: "대화창 여러 개 열었을 때 '제목 없음' 으로만 뜨면 무슨 대화였는지 못 찾는다, 요약 등으로 표현되면 좋겠다." (백엔드 R-v1.1.03 와 짝)

### 🛠 변경

| 라운드 | 시각 | 작업 | 산출물 |
|-------|------|------|-------|
| .03.f1 | 2026-05-15 오후 | **ThreadList fallback 친절화** — `t.title?.trim() || '새로운 대화'` 로 변경(기존 '제목 없음' → '새로운 대화'). 백엔드가 첫 user 메시지 prefix 30자를 자동 제목으로 채우니 fallback 빈도 자체가 줄어듬. | src/components/chatbot/ThreadList.jsx |
| .03.f2 | 2026-05-15 오후 | **aiChatStore onDone fetchThreads** — 백엔드 BackgroundTask 가 LLM 7단어 짧은 제목으로 갱신하는 데 1~2초 걸림. onDone 콜백에서 setTimeout 2.5s 후 fetchThreads 호출 → sidebar 가 자연스럽게 새 제목으로 갱신됨. | src/store/aiChatStore.js |
| .03.f3 | 2026-05-15 오후 | **FloatingChatbotButton 위치 조정** — 기존 메신저 FAB(파랑, `bottom-6 right-6`) 와 가로 충돌 회피 위해 같은 우측이지만 세로 스택(`bottom-24 right-6`)으로 배치. 두 FAB 가 세로로 정렬되어 시각적 일관성. (사용자 직접 수정) | src/components/chatbot/FloatingChatbotButton.jsx |

### 📐 설계 결정

- **두 단계 자동 제목과 호환**: 백엔드가 즉시 prefix 제목 → 응답 완료 후 LLM 갱신. 프론트는 onDone 2.5초 지연으로 한 번 더 fetchThreads → 새 제목 자동 노출.
- **fallback 텍스트**: 자동 제목이 어떤 이유로든 비어있을 때만 보임. "제목 없음" 보다 "새로운 대화" 가 친절한 톤.
- **FAB 세로 스택**: 기존 메신저 FAB 와 가로 충돌(우측 끝 둘 다 점유) 보다 세로 스택이 모바일 폭에서도 안정.

### ✅ 검증

- `vite build`: 14.19s OK.


---

## 🎯 R-v1.1.04 — 인증 토큰 영속화 (localStorage 미러) (2026-05-15 오후)

> 사용자 피드백: "잘못해서 브라우저를 닫고 열었을 때 다시 로그인해야 되네? 로그인 토큰을 로컬에 저장해놨다가 브라우저를 모두 닫았을 때 소멸되게 할 수는 없을까?"

### 🛠 변경

| 라운드 | 시각 | 작업 | 산출물 |
|-------|------|------|-------|
| .04.1 | 2026-05-15 오후 | **authStore localStorage write-through** — `setAuth/switchOrg/logout` 의 sessionStorage.setItem/removeItem 호출을 `setBoth/removeBoth` 헬퍼로 교체. AUTH_KEYS(`access_token`/`refresh_token`/`user`/`current_org`) 4개를 localStorage + sessionStorage 양쪽에 동시 set/remove. | src/store/authStore.js |
| .04.2 | 2026-05-15 오후 | **모듈 import 시 hydration** — `hydrateSessionFromLocal()` 이 authStore.js 로드되자마자 자동 실행. localStorage 에 토큰 있고 sessionStorage 비어있으면 미러. **기존 api/* 인터셉터 17곳의 `sessionStorage.getItem` 호출을 일절 수정하지 않고도** 새 탭/새로고침/탭 닫았다 열기에서 인증 헤더 자동 유효. | src/store/authStore.js |
| .04.3 | 2026-05-15 오후 | **초기 state read 폴백** — token/user/currentOrg 초기 상태는 `getAuthValue()` 로 localStorage → sessionStorage 폴백 순. 어느 한 쪽에만 있어도 복구. | src/store/authStore.js |

### 📐 설계 결정 / 자가검토

- **sessionStorage → localStorage 일괄 교체는 X**: 17개 파일 일괄 교체는 작업 범위 크고 회귀 위험. authStore 1곳만 변경 + 미러로 같은 효과.
- **"브라우저 완전 종료 시 소멸" 의 한계**: localStorage 는 표준상 영구 저장이라 "마지막 창 닫힘" 신호 받을 방법 없음. 사용자 의도의 80%(탭 닫아도 유지)는 달성, 보안 절충은 **JWT 자체 만료 120분(`JWT_EXPIRE_MINUTES`)** 으로 보장.
- **명시 logout 시 양쪽 모두 정리**: removeBoth 가 AUTH_KEYS 4개를 localStorage·sessionStorage 모두 지움.
- **last_login_method 는 localStorage 유지**: 다음 로그인 시 가이드용 (현재 동작 그대로).
- **OAuth refresh_token 도 미러**: provider 로그인 시점에 함께 영속.

### ✅ 검증

- `vite build`: 15.34s OK.
- 회귀 면 — 기존 17개 파일의 sessionStorage.getItem 호출은 그대로 동작 (hydration 후 sessionStorage 에 토큰 존재).

### 🚨 안전성 영향

- **공유 PC 시 토큰 누설 위험 증가**: 사용자가 명시 logout 안 하고 브라우저만 닫으면 다음 사용자가 localStorage 의 토큰으로 접근 가능. JWT 120분 만료가 보조 가드. 향후 idle 자동 logout(30분 무활동) 추가 검토 가능.
- **XSS 노출 면**: localStorage 도 sessionStorage 와 동일하게 JS 접근 가능. react-markdown raw HTML 차단·CSP 등 기존 방어가 그대로 유효.


---

## 🎯 R-v1.1.05 — 챗봇 기존 대화 클릭 시 검정화면 hotfix (2026-05-15 저녁)

> 사용자 피드백: "AI Chatbot에서 기존 대화를 누르니까 검정화면으로만 바뀌고 대화가 안떠." (백엔드 R-v1.1.05 와 짝 — 제목 자동 흐름 요약 개선과 동일 라운드)

### 🛠 변경

| 라운드 | 시각 | 작업 | 산출물 |
|-------|------|------|-------|
| .05.f1 | 2026-05-15 저녁 | **ChatbotMessageThread selector 안정화** — `messagesByThread[activeThreadId] \|\| []` 가 매 렌더마다 새 `[]` ref 반환 → zustand 의 `useSyncExternalStore` getSnapshot 무한 루프 → React 가 컴포넌트 트리 unmount → 패널 자체가 사라지고 뒤의 `bg-black/30` 오버레이만 남아 "검정화면" 으로 보임. 모듈 상수 `EMPTY_MESSAGES = []` 도입으로 캐시 미스 시 항상 동일 ref 반환. 새 thread 는 `createThread` 가 빈 배열 캐시를 미리 깔아둬서 영향 없었고, **기존 thread 클릭 경로만 깨졌던 이유**. | src/components/chatbot/ChatbotMessageThread.jsx |
| .05.f2 | 2026-05-15 저녁 | **aiChatStore.selectThread 빈 배열 placeholder** — 캐시 미스 시 `messagesByThread[threadId] = []` 를 먼저 set 한 뒤 `fetchMessages` 호출. 이중 안전망(selector 단 + store 단)으로 같은 패턴 재발 방지. 캐시 판정은 `hadCache = !!s.messagesByThread[threadId]` 로 명확화 (빈 배열 placeholder ≠ 진짜 캐시). | src/store/aiChatStore.js |

### 📐 설계 결정 / 자가검토

- **증상에서 원인까지의 추론**: "검정화면" → bg-white 패널이 사라지고 뒤의 `bg-black/30` 오버레이만 남았다 → React unmount 의심 → ErrorBoundary 없음 확인 → 가장 가능성 높은 throw 지점은 useSyncExternalStore getSnapshot caching 위반. selector `|| []` 패턴이 정확히 그것.
- **모듈 상수 vs useMemo**: 컴포넌트 외부 모듈 상수가 더 단순. useMemo 는 deps 가 필요해서 selector 자체에는 적용 안 됨.
- **store 단 placeholder 도 같이**: 다른 컴포넌트가 같은 selector 패턴을 쓸 경우 대비. 미래 회귀 안전망.

### ✅ 검증

- `vite build`: 로컬 OK (사용자 production 검증 대기).
- 로직 검증: 기존 대화 클릭 → activeThreadId 셋 + view='thread' + messagesByThread[id]=[] placeholder → selector 가 같은 빈 배열 ref 반환 → ChatbotMessageThread 정상 렌더(messagesLoading=true 라 "메시지를 불러오는 중…") → fetchMessages 응답 도착 시 진짜 메시지 배열로 교체.
- 새 thread 경로는 회귀 없음 (createThread 가 이미 [] 캐시 깔고 있었음).

### 🚨 안전성 영향

- 사용자 데이터 누락 X — 이 fix 는 순수 클라이언트 렌더 안정화이고, 백엔드 응답/저장 흐름과 무관.

---

## 🎯 R-v1.1.06 — ReportEditor 모바일 카드 뷰 + 3D Canvas 터치 제스처 (2026-05-27)

> 사용자 피드백: "ReportEditor 19컬럼 와이드 테이블이 모바일 가로 320px 에서 사용 불가." 데스크탑 회귀 0 으로 반응형 분기, 같은 React state 양방향 동기화 유지.

### 🛠 변경

| 라운드 | 시각 | 작업 | 산출물 |
|-------|------|------|-------|
| .06.f1 | 2026-05-27 | **DefectEditCard 신규** — 모바일(< md) 전용 카드 뷰. 헤더(severity 배지+category_code+defect_type+area chip), 본문 dl 그리드(신뢰도·열영상최고·장소·공종·심각도·조치메모), 푸터(검증 토글·삭제). 모든 터치 컨트롤 min-h 44px+. `onChange/onRemove/onToggleVerified` 계약은 DefectEditRow 와 동일 — ReportEditor 의 단일 `defects` source 공유. | src/components/report/DefectEditCard.jsx (+184) |
| .06.f2 | 2026-05-27 | **ReportEditor 반응형 분기** — 기존 테이블을 `hidden md:block`, 신규 카드 리스트를 `md:hidden` 으로 감싸 CSS 단으로만 토글. md(≥768px) 데스크탑·태블릿 가로 = 테이블 그대로, < md 모바일 = 카드. 데이터/sorting/filtering/verified 토글 로직 변경 0. | src/components/report/ReportEditor.jsx (+~32, -~24) |
| .06.f3 | 2026-05-27 | **3D Canvas 터치 제스처 활성화** — BuildingScene + PreWork 의 `<OrbitControls>` 에 `touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}` + `enableDamping`(0.08) 추가. 모바일에서 1손가락 회전, 2손가락 핀치 줌+팬 가능. | src/components/map3d/BuildingScene.jsx, src/pages/employee/PreWork.jsx |

### 📐 설계 결정 / 자가검토

- **반응형 분기점 md(768px)**: 사무실 PC·태블릿 가로 = 테이블, 태블릿 세로·모바일 = 카드. 19컬럼 와이드 테이블은 768px 미만에서 가로 스크롤 + 작은 폰트로 사실상 사용 불가였음.
- **이중 마운트 vs 단일 마운트 토글**: Tailwind `hidden md:*` 패턴은 두 뷰가 동시에 DOM 에 있지만 한쪽은 `display:none`. props 가 같은 React state 를 가리키므로 양방향 동기화 자동(편집 핸들러도 단일). DOM 노드 2배는 정렬·필터 결과가 동일해 페인트 비용 미미.
- **터치 제스처 표준**: `THREE.TOUCH.ROTATE`/`DOLLY_PAN` 은 three.js 기본 상수, drei OrbitControls 가 그대로 forward. damping 추가로 손가락 떼고 잔여 관성 자연스럽게.
- **데이터 스키마 변경 X**: API 응답·store 형태 그대로. CSS 와 컴포넌트 분기만.

### ✅ 검증

- `npm run build`: OK (22.64s, 에러 0). bundle size 변화 미미(카드 컴포넌트 +~2KB).
- **데스크탑 viewport 시뮬(1280px)**: 기존 테이블 노출(md:block), 카드는 hidden.
- **모바일 viewport 시뮬(375px)**: 카드만 노출(md:hidden), 테이블 hidden.
- **Chrome DevTools 시뮬 가이드**: F12 → Toggle device toolbar(Ctrl+Shift+M) → Responsive → 375×667(iPhone SE) 로 카드 뷰 확인, 1280×800 로 테이블 뷰 확인.

### 🚨 안전성 영향

- 사용자 데이터/스키마 영향 X — 순수 UI 반응형 분기 + 3D 입력 핸들러 확장. 데스크탑 테이블 동작 회귀 0.


---

