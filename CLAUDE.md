# 프로젝트: mp3tuber

YouTube를 검색해 영상을 고르고, 그 영상을 **mp3(오디오) 또는 mp4(비디오)로 변환해 브라우저로 내려받는** 로컬·개인용 웹앱.

> 관련 문서: 제품 정의 `docs/PRD.md` · 아키텍처 `docs/ARCHITECTURE.md` · 결정 기록 `docs/ADR.md` · API 명세 `docs/API.md` · 디자인 토큰 `docs/UI_GUIDE.md`

## 기술 스택
- **프레임워크**: Next.js 15 (App Router)
- **런타임**: Node.js ≥ 18.18 (Next 15 요구 / 변환 라우트가 `child_process`·`fs` 사용 → Node 런타임 필수, Edge 불가)
- **언어**: TypeScript strict mode
- **스타일링**: Tailwind CSS v4 (semantic token, `src/styles/tokens.css` 단일 소스)
- **검색**: YouTube Data API v3 (`search.list`) — 서버에서만 호출
- **변환**: `youtube-dl-exec`(yt-dlp 바이너리) + `ffmpeg-static`(ffmpeg 바이너리)
- **테스트**: Vitest + React Testing Library(단위/컴포넌트)
- **경로 alias**: `@/*` → `src/*`

## 환경 변수
- `YOUTUBE_API_KEY` — YouTube Data API v3 키. **서버 전용** (`.env.local`). 미설정 시 `/api/search`는 `CONFIG_ERROR`(500).
- `NEXT_PUBLIC_` 접두사 변수에 키를 넣지 말 것 (클라이언트 번들 노출).
- `.env.local`은 절대 커밋 금지(`.gitignore` 확인).

## 아키텍처 규칙
- CRITICAL: 외부 API 호출·변환 로직은 **`src/app/api/` route handler에서만** 처리한다. 클라이언트 컴포넌트에서 YouTube API나 변환 도구를 직접 호출하지 말 것.
- CRITICAL: `YOUTUBE_API_KEY`는 **서버 전용**. 응답 본문·에러 메시지·클라이언트 번들 어디에도 노출 금지.
- CRITICAL: 모든 디자인은 semantic token으로만 한다 (`docs/UI_GUIDE.md`). 색·타이포·간격·radius·그림자·모션을 컴포넌트에 하드코딩(raw hex, `rounded-2xl`, `text-[13px]`, arbitrary `[..]`)하지 말 것. 새 값은 토큰을 먼저 정의해 쓴다. raw/arbitrary 값 = 리뷰 blocker.
- CRITICAL: 자체 API 엔드포인트(`/api/search`, `/api/convert`)는 **`docs/API.md`에 명세를 먼저 작성·검증**한 뒤에만 구현한다.
- CRITICAL (보안):
  - yt-dlp 호출은 **인자 배열로만** 전달한다 — 셸 문자열 보간 금지(커맨드 인젝션 차단).
  - `videoId`는 호출 전 `^[A-Za-z0-9_-]{11}$`로 엄격 검증한다.
  - 다운로드 파일명은 `title`을 sanitize한다: `/ \ : * ? " < > |`·제어문자·개행 제거, `..`·앞뒤 점/공백 제거, ~100자 truncate, **Windows 예약 디바이스명(`CON, PRN, AUX, NUL, COM1‑9, LPT1‑9`) 회피**, 결과가 비면 `videoId`로 fallback. temp 출력은 `os.tmpdir()` 하위로 고정.
  - 변환 temp 파일은 `try/finally`로 항상 정리하고, 요청 `AbortSignal`로 중단 시 yt-dlp 프로세스를 kill한다.
- CRITICAL (ToS): 스트림 변환은 **로컬·개인·학습 목적에 한정**한다. 공개 배포 금지. 업로더 권리를 존중한다.
- 통일 에러 모델: 모든 JSON 에러는 `{ "error": { "code": "STRING_CODE", "message": "..." } }`. 클라엔 안전한 메시지+code만, 스택·상위 API 원문·키는 `console.error` 서버 로그로만. 에러 코드 카탈로그는 `docs/API.md` 참조.
- 폴더 규칙: 컴포넌트는 `src/components/`, 유틸/변환 래퍼는 `src/lib/`, 외부 API 래퍼는 `src/services/`, 타입은 `src/types/`, 토큰은 `src/styles/`.

## 개발 프로세스
- CRITICAL: 새 기능 구현 시 반드시 테스트를 먼저 작성하고, 테스트가 통과하는 구현을 작성할 것 (TDD). 30줄 이상 변경되거나 기능/버그 단위면 `/tdd-loop`로 작은 사이클(변경→테스트→커밋)을 돌린다.
  - 테스트 seam: `services/youtube`는 `fetch` 모킹, `lib/convert`는 모듈 모킹으로 **실제 네트워크/다운로드 없이** 라우트를 검증한다. 변환 바이너리는 단위 테스트에서 호출하지 않는다.
- CRITICAL: phase 완료 전 게이트를 통과해야 한다. `npm run typecheck`/`npm run lint`는 작업 중 수시로, `npm run test`(Vitest + RTL)는 phase마다 실행한다. 게이트 실패는 차단이며, 발견된 blocker/major는 수정 후 재검증한다. 사용자가 직접 실행했을 때 한 번에 동작하도록 — 재검증이 필요한 상태로 완료하지 않는다.
- 커밋 메시지는 conventional commits 형식을 따를 것 (`feat:`, `fix:`, `docs:`, `refactor:`). "왜"를 적는다.
- Staging은 변경한 파일만 명시 add (`.env*`/credentials 사고 방지).

## 명령어
```
npm run dev        # 개발 서버
npm run build      # 프로덕션 빌드
npm run lint       # ESLint
npm run typecheck  # 타입 체크 (tsc --noEmit)
npm run test       # 단위/컴포넌트 테스트 (Vitest + RTL)
```
