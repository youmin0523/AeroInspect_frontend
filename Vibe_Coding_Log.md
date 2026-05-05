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
