# TODO — mp3tuber 구현 로드맵

> "0 → 동작하는 MVP"까지의 단계별 체크리스트. **위에서 아래로 순차 진행**하고, 각 phase 끝의 게이트를 통과한 뒤 conventional commit으로 마무리한다.
> 토대 문서: 제품 `PRD.md` · 아키텍처 `ARCHITECTURE.md` · 결정 `ADR.md` · API `API.md` · 디자인 `UI_GUIDE.md` · 규칙 `../CLAUDE.md`

## 역할(role) 범례
1인 개발이므로 "사람"이 아니라 그 task에서 **쓰는 모자**의 구분이다.

| 라벨 | 의미 |
|------|------|
| `[Infra]` | 환경·빌드·툴링(스캐폴딩, 테스트 러너, scripts) |
| `[Design]` | 디자인 토큰·레이아웃·타이포(`UI_GUIDE.md` 소비) |
| `[Domain]` | 타입·검증·순수 유틸(`lib/*`, `types/*`) |
| `[Backend]` | 외부 API 래퍼·route handler(`services/*`, `app/api/*`) |
| `[Frontend]` | UI 컴포넌트·페이지 배선(`components/*`, `app/page.tsx`) |
| `[QA]` | 테스트·통합·수동 검증·릴리스 체크 |

## 공통 규칙 (모든 phase 적용)
- **TDD**: 테스트를 먼저 쓰고(아래 각 phase의 "테스트 케이스 먼저" 항목), 통과하는 구현을 작성한다.
- **`/tdd-loop`**: 30줄↑ 변경이나 기능/버그 단위는 구현 시작 전에 호출, 단위가 끝날 때마다 재호출. 예외는 오타/리네임/주석/단일 줄.
- **게이트 실패 = 차단**: blocker/major는 수정 후 재검증. 재검증 필요한 상태로 phase를 끝내지 않는다.
- **오류 자동해결 금지**: 런타임/도구 오류는 멈추고 원인(의존성 체인 + 근본 원인)을 설명한 뒤 방향을 정한다.
- **커밋**: conventional commits(`feat:`/`fix:`/`chore:`/`docs:`/`refactor:`/`test:`), "왜"를 본문에. `.env*`/credentials 사고 방지를 위해 **변경 파일만 명시 add**(`git add -A` 금지).
- **보안 불변식**: 키 서버 전용(`NEXT_PUBLIC_` 금지·응답/로그 미노출), yt-dlp **인자 배열만**, `videoId` 정규식 검증, 파일명 sanitize, temp `try/finally`+abort kill. (상세는 `../CLAUDE.md`/`API.md`)

## 진행률
| Phase | 0 Infra | 1 Design | 2 Domain | 3 Search | 4 Convert | 5 Frontend | 6 QA |
|-------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| 상태  | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

(상태: ⬜ 미착수 · 🟦 진행중 · ✅ 완료)

---

## Phase 0 — 프로젝트 스캐폴딩 & 토대 `[Infra]`
**목표**: 빈 저장소에 Next.js 15 + TS strict + Tailwind v4 + Vitest/RTL 토대를 세우고 게이트가 돌게 한다.

- [x] Next.js 15(App Router) + React 19 + TypeScript **strict** 초기화 → 산출: `package.json`, `tsconfig.json`, `next.config.ts`
- [x] `tsconfig` strict 확인 + `@/*`→`src/*` path alias → 산출: `tsconfig.json`
- [x] Tailwind v4 + PostCSS 설정 → 산출: `postcss.config.mjs`, `src/app/globals.css`(스텁)
- [x] Vitest + RTL + jsdom + `@testing-library/jest-dom` 설정(`environment: jsdom`, setup 파일, `@/` alias 동기화) → 산출: `vitest.config.ts`, `src/test/setup.ts`
- [x] `package.json` scripts 확정: `dev` / `build` / `lint` / `typecheck`(`tsc --noEmit`) / `test`(`vitest run`) — `../CLAUDE.md`·`API.md`와 일치
- [x] 폴더 골격 + `.gitkeep`: `src/{app,components,lib,services,types,styles,test}`
- [x] `.env.local.example` 작성(`YOUTUBE_API_KEY=` + 주석), `.gitignore`에 `.env*`(단 `.example`은 추적) 확인

**게이트·수용**: `npm run typecheck` / `npm run lint` / `npm run test`(0건 통과) / `npm run dev` 부팅 200.

**추천 커밋**
- `chore: init next15 app router + typescript strict` — 변환에 child_process/fs 필요해 Node 런타임 기반 토대 마련
- `chore(tooling): add tailwind v4 + vitest/RTL setup` — 토큰 기반 디자인·TDD 게이트의 전제
- `chore: scaffold src structure + env example` — 모듈 경계 폴더와 키 설정 가이드 정립

---

## Phase 1 — 디자인 토큰 & 루트 레이아웃 `[Design]`
**목표**: `UI_GUIDE.md`의 토큰을 단일 소스로 이식하고, 모든 UI가 semantic 유틸만 쓰게 만든다.

- [ ] `src/styles/tokens.css`: `UI_GUIDE.md`의 CSS custom properties **전량 이식**(color/border/text/accent/state/radius/space/elevation/motion) → 단일 소스
- [ ] `globals.css`: Tailwind v4 `@theme`로 토큰→semantic 유틸 매핑(`bg-surface`, `text-text-muted`, `rounded-card` 등) ⛓ 의존: `tokens.css`
- [ ] 타이포 역할 유틸 정의: `text-display/title/heading/body/body-sm/caption/code`(size+weight+leading 묶음)
- [ ] `app/layout.tsx`: 다크 배경(`bg-bg text-text`), tokens/globals import, 콘텐츠 max-width 컨테이너(좌측 정렬)
- [ ] 모션 유틸 `fade-in`/`slide-up`만(`--duration-base`/`--ease-standard`) — 글로우·펄스 금지

**게이트·수용**: 임시 마크업으로 토큰 소비 시각 확인, **raw/arbitrary 값 0**(`bg-[#..]`/`text-[13px]`/`rounded-2xl` = 리뷰 blocker), 게이트 3종.

**추천 커밋**
- `feat(ui): add design tokens as single source` — 디자인 표류(drift) 차단(`tokens.css` 단일 소스)
- `feat(ui): map tokens to tailwind theme + typography roles` — semantic 유틸로만 쓰도록 강제
- `feat(ui): root layout with dark theme` — 다크 도구형 셸 확립

---

## Phase 2 — 타입 & 순수 유틸 (TDD) `[Domain]`
**목표**: API·변환의 토대가 되는 타입과 검증/파일명 유틸을 테스트 우선으로 만든다.

- [ ] `types/index.ts`: `VideoResult` / `ConvertFormat` / `ApiError` — `API.md` 데이터 모델과 정확히 일치(`duration?` optional 유지)
- [ ] **테스트 먼저** `lib/validation.test.ts` → 케이스:
  - videoId: 10자(❌)/11자(✅)/12자(❌), 허용문자 `A-Za-z0-9_-`, 금지문자(공백·`/`·`.` 등) ❌
  - format: `mp3`/`mp4`(✅), `MP3`(정책 결정: 거부 또는 소문자 정규화), `wav`(❌)
  - maxResults: 미지정→기본 12, 1·50(✅), 0·51·비숫자→`INVALID_MAX_RESULTS`(또는 클램프 — 정책 명시)
- [ ] `lib/validation.ts` 구현(`isValidVideoId` / `parseFormat` / `parseMaxResults`)
- [ ] **테스트 먼저** `lib/filename.test.ts` → 케이스:
  - 금지문자 `/ \ : * ? " < > |` 제거, 제어문자/개행 제거
  - `..` 제거, 앞뒤 점/공백 trim
  - Windows 예약명 `CON/PRN/AUX/NUL/COM1-9/LPT1-9`(대소문자 무관) 회피
  - ~100자 truncate, 결과가 비면 `videoId`로 fallback
- [ ] `lib/filename.ts` 구현(`sanitizeFilename(title, videoId, ext)`)

**게이트·수용**: 위 단위 테스트 전부 green + 게이트 3종.

**추천 커밋**(단위별 분리)
- `feat(types): add VideoResult/ConvertFormat/ApiError` — API 계약과 1:1 일치하는 단일 타입 소스
- `feat(lib): videoId/format/maxResults validation (TDD)` — 커맨드 인젝션·잘못된 입력 차단의 1차 방어선
- `feat(lib): filename sanitize incl. windows reserved names (TDD)` — 경로 traversal·예약명 충돌 방지

---

## Phase 3 — 검색: 서비스 + API 라우트 (TDD) `[Backend]`
**목표**: YouTube `search.list`를 서버에서만 호출·매핑하고, `/api/search`로 통일 응답/에러를 낸다.

- [ ] 픽스처: 샘플 `search.list` 응답 JSON(엔티티 포함 title, 썸네일 일부 누락 케이스 포함) → 산출: `src/test/fixtures/search.sample.json`
- [ ] **테스트 먼저** `services/youtube.test.ts`(`fetch` 모킹) → 케이스:
  - 정상 매핑: `id.videoId`, `snippet.title` 엔티티 디코딩(`&amp;`→`&`, `&#39;`→`'`), `channelTitle`, 썸네일 medium·high 우선순위·없으면 default
  - 빈 결과 → `[]`
  - 403 quota → `QUOTA_EXCEEDED`
  - 5xx/네트워크 실패 → `UPSTREAM_ERROR`
- [ ] `services/youtube.ts` 구현(`searchVideos(q, maxResults)`, `type=video`, 옵션 `regionCode=KR`/`relevanceLanguage=ko`, 키는 서버 env에서만)
- [ ] **테스트 먼저** `app/api/search/route.test.ts`(서비스 모킹) → 케이스:
  - 200 `{ items }`, 빈결과 200 `items: []`
  - `q` 공백 → 400 `MISSING_QUERY`
  - maxResults 범위밖 → 400 `INVALID_MAX_RESULTS`
  - 키 미설정 → 500 `CONFIG_ERROR`
  - quota → 503 `QUOTA_EXCEEDED`, upstream → 502 `UPSTREAM_ERROR`
  - 비-GET → 405
- [ ] `app/api/search/route.ts` 구현(`export const runtime = 'nodejs'`, 통일 에러 `{ error: { code, message } }`, 키/스택은 `console.error`로만)

**게이트·수용**: 서비스+라우트 테스트 green + 게이트 3종, **응답 본문에 키 미노출** 확인.

**추천 커밋**(단위별 분리)
- `test(search): add search.list fixture` — 네트워크 없이 매핑/에러 검증할 픽스처 확보
- `feat(search): youtube service with entity decode + error mapping (TDD)` — HTTP 경계·엔티티 디코딩·쿼터/upstream 구분
- `feat(search): GET /api/search route (TDD)` — 키 서버격리 + 통일 에러 모델 적용

---

## Phase 4 — 변환: lib + convert API (TDD) `[Backend]`
**목표**: yt-dlp+ffmpeg를 안전하게(배열 인자) 호출해 파일을 만들고, `/api/convert`로 스트리밍 다운로드한다.

- [ ] **테스트 먼저** `lib/convert.test.ts`(`youtube-dl-exec`/`fs` 모듈 모킹, 바이너리 **비호출**) → 케이스:
  - mp3 인자 배열: `-x --audio-format mp3 --audio-quality 0`
  - mp4 인자 배열: `-f bestvideo+bestaudio/best --merge-output-format mp4`
  - 공통: `--ffmpeg-location <ffmpeg-static>`, `-o <os.tmpdir()/고유명>`
  - **셸 문자열 보간 없음**(전부 배열 인자로 전달)
  - AbortSignal 발화 → 자식 프로세스 kill 호출
  - 타임아웃 초과 → kill → 실패 반환
- [ ] `lib/convert.ts` 구현(`convertToFile({ videoId, format, signal })` → temp 경로 반환, 고유 파일명 = `videoId + nonce`)
- [ ] **테스트 먼저** `app/api/convert/route.test.ts`(`lib/convert`·`fs` 모킹) → 케이스:
  - 검증 실패 400: `INVALID_VIDEO_ID` / `INVALID_FORMAT`
  - 성공 헤더: `Content-Type` `audio/mpeg`|`video/mp4`, `Content-Disposition: attachment; filename*=UTF-8''…`, 가능 시 `Content-Length`
  - 영상 접근불가 → 404 `VIDEO_UNAVAILABLE`
  - 바이너리 없음 → 500 `CONVERTER_UNAVAILABLE`
  - 변환실패/타임아웃 → 500 `CONVERSION_FAILED`
  - **try/finally temp 삭제 호출** 확인, abort 시 프로세스 kill, 비-GET 405
- [ ] `app/api/convert/route.ts` 구현(`runtime = 'nodejs'`, `fs.stat`→`Content-Length`, `Readable.toWeb()` 스트리밍, `try/finally` 정리, `request.signal` 구독)

**게이트·수용**: convert lib+라우트 테스트 green + 게이트 3종. (실제 바이너리 변환은 Phase 6 수동검증.)

**추천 커밋**(단위별 분리)
- `feat(convert): yt-dlp+ffmpeg wrapper with arg-array + abort/timeout (TDD)` — 셸 보간 없는 안전 호출·프로세스 수명 관리
- `feat(convert): GET /api/convert streaming route (TDD)` — temp try/finally 정리 + Content-Disposition 스트리밍

---

## Phase 5 — UI 컴포넌트 & 페이지 (TDD/RTL) `[Frontend]`
**목표**: 검색→결과→변환→다운로드를 한 화면에서 끝내는 UI를, semantic 토큰만으로 배선한다.

- [ ] `Spinner`/`Skeleton`(토큰만) → 산출: `components/Spinner.tsx`, `components/Skeleton.tsx`
- [ ] **테스트 먼저** `SearchBar.test.tsx` → 케이스: Enter/버튼 제출 콜백, 빈 입력 제출 차단, 로딩 중 중복제출 방지, aria-label
- [ ] `components/SearchBar.tsx` 구현
- [ ] **테스트 먼저** `VideoCard.test.tsx` → 케이스: 썸네일/제목/채널 렌더, 포맷 토글(mp3/mp4), 변환 클릭→로딩·버튼 비활성, 에러 시 인라인+재시도, 썸네일 로드 실패 placeholder, 긴 제목 truncate 클래스
- [ ] `components/VideoCard.tsx` 구현(포맷 토글 + 변환/다운로드 버튼)
- [ ] `components/ResultsGrid.tsx`(VideoCard 매핑) + `EmptyState`/`ErrorBanner`(렌더 테스트: 메시지 + 재시도 버튼)
- [ ] `app/page.tsx`: 검색 상태머신(`idle|loading|success|empty|error`) + 카드별 변환 상태(`idle|loading|error`) 배선, `fetch /api/search`, 변환은 `fetch /api/convert`→`blob()`→`objectURL`→`<a>` 다운로드 트리거→`revokeObjectURL`, `AbortController` 보유

**게이트·수용**: 컴포넌트 테스트 green + 게이트 3종, **토큰 외 raw 값 0**.

**추천 커밋**(단위별 분리)
- `feat(ui): Spinner/Skeleton primitives` — 로딩 상태 공통 요소
- `feat(ui): SearchBar with submit + dup-submit guard (TDD)` — 제출 기반 검색·중복 호출 방지
- `feat(ui): VideoCard with format toggle + convert states (TDD)` — 카드별 변환 로딩/에러/재시도
- `feat(ui): ResultsGrid + EmptyState/ErrorBanner` — 결과/빈결과/에러 표시
- `feat(ui): wire page state machine + download flow` — 검색·변환·blob 다운로드 배선(objectURL revoke)

---

## Phase 6 — 통합 · 수동 검증 · 폴리시 `[QA]`
**목표**: 실제 키로 전체 흐름을 수동 검증하고, 엣지·접근성·문서를 마무리한다.

- [ ] `.env.local`에 실제 `YOUTUBE_API_KEY` 설정 후 `npm run dev`
- [ ] **수동 E2E 시나리오**(자동화 대신): 검색 → 결과 카드 표시 → mp3 변환·다운로드·재생 확인 → mp4 변환·다운로드·재생 확인
- [ ] 실패 경로 수동 확인: 빈결과 메시지, 검색 에러 배너+재시도, 변환 실패 인라인+재시도, 변환 중 다른 카드 사용 가능, 탭 닫기 시 중단(프로세스/temp 정리)
- [ ] 접근성/엣지: aria 라벨·포커스(토큰)·키보드 조작, 긴 제목 truncate, 썸네일 실패 placeholder
- [ ] `API.md` 검증 체크리스트 5항목 재확인, 전체 게이트 그린(`typecheck`/`lint`/`test` + `build`)
- [ ] (선택) `README.md`: 빠른 시작(키 설정 → `npm run dev`) + ToS 디스클레이머(개인·학습용, 공개 배포 금지)

**게이트·수용**: 전 게이트 그린 + 수동 시나리오 통과.

**추천 커밋**
- `fix(ui): polish edge cases from manual verification` — 수동 검증서 발견한 빈결과/에러/접근성 보완(필요 시)
- `docs: add README quick start + ToS disclaimer` — 키 설정·실행법·개인용 한정 고지

---

## 부록

### 의존 그래프
```
0 (Infra)
 └→ 1 (Design)
 └→ 2 (Domain) ──┬→ 3 (Search API)  ─┐
                 └→ 4 (Convert API) ─┤
                                     ├→ 5 (Frontend) → 6 (QA)
            1 (Design) ──────────────┘
```
- 3·4는 2 위에서 **병렬 가능**. 5는 3·4(API 계약)와 1(토큰)이 필요. 6은 전부 선행.

### Phase별 산출 파일
| Phase | 주요 산출 |
|-------|-----------|
| 0 | `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `src/test/setup.ts`, `.env.local.example`, `src/{app,components,lib,services,types,styles,test}/` |
| 1 | `src/styles/tokens.css`, `src/app/globals.css`, `src/app/layout.tsx` |
| 2 | `src/types/index.ts`, `src/lib/validation.ts`(+test), `src/lib/filename.ts`(+test) |
| 3 | `src/test/fixtures/search.sample.json`, `src/services/youtube.ts`(+test), `src/app/api/search/route.ts`(+test) |
| 4 | `src/lib/convert.ts`(+test), `src/app/api/convert/route.ts`(+test) |
| 5 | `src/components/{Spinner,Skeleton,SearchBar,VideoCard,ResultsGrid,EmptyState,ErrorBanner}.tsx`(+test), `src/app/page.tsx` |
| 6 | `README.md`(선택), 폴리시 diff |

### 게이트 체크리스트 (phase마다 재사용)
```
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint
npm run test        # Vitest + RTL
```

### 에러 코드 ↔ 구현 위치 (출처: `API.md` 카탈로그)
| code | HTTP | 발생 지점 |
|------|------|-----------|
| `MISSING_QUERY` | 400 | search 라우트 |
| `INVALID_MAX_RESULTS` | 400 | search 라우트 |
| `QUOTA_EXCEEDED` | 503 | youtube 서비스→search |
| `UPSTREAM_ERROR` | 502 | youtube 서비스→search |
| `INVALID_VIDEO_ID` | 400 | convert 라우트 |
| `INVALID_FORMAT` | 400 | convert 라우트 |
| `VIDEO_UNAVAILABLE` | 404 | convert lib→라우트 |
| `CONVERTER_UNAVAILABLE` | 500 | convert lib→라우트 |
| `CONVERSION_FAILED` | 500 | convert lib→라우트 |
| `CONFIG_ERROR` | 500 | 공통(키 미설정 등) |

### 보안 체크리스트 (릴리스 전 최종 확인)
- [ ] `YOUTUBE_API_KEY`가 응답 본문·에러 메시지·클라 번들 어디에도 없음, `NEXT_PUBLIC_` 미사용
- [ ] yt-dlp 호출이 전부 **인자 배열**(셸 문자열 보간 0)
- [ ] `videoId`가 호출 전 `^[A-Za-z0-9_-]{11}$`로 검증됨
- [ ] 다운로드 파일명 sanitize(금지문자·`..`·Windows 예약명·길이·fallback) 적용
- [ ] 변환 temp 파일 `try/finally` 정리 + `AbortSignal`로 프로세스 kill
- [ ] `.env.local`이 커밋되지 않음(`.gitignore` 확인)
