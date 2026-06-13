# 아키텍처

## 디렉토리 구조
```
src/
├── app/                  # 페이지 + API 라우트 (App Router)
│   ├── layout.tsx        # 루트 레이아웃 (다크 배경, tokens/globals import)
│   ├── page.tsx          # 메인 검색 페이지
│   ├── globals.css       # Tailwind v4 + @theme 토큰 매핑 + 타이포 역할 유틸
│   └── api/
│       ├── search/route.ts    # GET /api/search  (runtime: nodejs)
│       └── convert/route.ts   # GET /api/convert (runtime: nodejs)
├── components/           # UI 컴포넌트 (semantic token만, fade-in/slide-up만)
├── lib/                  # 변환 래퍼·검증·파일명 sanitize 등 유틸
├── services/             # 외부 API 래퍼 (YouTube Data API)
├── types/                # TypeScript 타입 정의 (docs/API.md 데이터 모델과 일치)
└── styles/
    └── tokens.css        # CSS custom properties 단일 소스 (docs/UI_GUIDE.md)
```

### 모듈 책임
- `services/youtube.ts` — YouTube Data API `search.list` 호출 + 응답 매핑(엔티티 디코딩, 썸네일 선택). HTTP 경계.
- `lib/convert.ts` — yt-dlp(`youtube-dl-exec`) + `ffmpeg-static` 래퍼: 인자 배열 구성, temp 출력, 프로세스 관리(kill/타임아웃). `child_process`/`fs` 경계.
- `lib/validation.ts` — `videoId`(`^[A-Za-z0-9_-]{11}$`), `format`(`mp3`/`mp4`), `maxResults`(1–50) 검증.
- `lib/filename.ts` — 다운로드 파일명 sanitize(§보안: 제어문자/`..`/Windows 예약명 제거, fallback=videoId).
- `types/index.ts` — `VideoResult`, `ConvertFormat`, `ApiError`.

## 패턴
- **Server Component 기본.** 데이터·환경변수 접근은 서버에서. 인터랙션이 필요한 지점만 Client Component(`'use client'`).
- 외부 API 호출과 변환은 **route handler에서만** 수행한다(클라이언트 직접 호출 금지). 키는 서버에만 존재.
- 변환 라우트는 **Node 런타임**(`export const runtime = 'nodejs'`) — `child_process`/`fs`/스트림 필요, Edge 불가.

## 데이터 흐름

### 검색
```
사용자 입력(SearchBar, Client)
  → fetch GET /api/search?q=&maxResults=
    → services/youtube.search()  → YouTube Data API search.list (서버, 키 사용)
    → 매핑: id.videoId, snippet.title(HTML 엔티티 디코딩), channelTitle, thumbnails(우선순위 선택)
  → 200 { items: VideoResult[] }            → ResultsGrid 렌더
  → 빈 결과 { items: [] }                    → EmptyState
  → 에러 { error: { code, message } }        → ErrorBanner + 재시도
```

### 변환 / 다운로드
```
사용자(VideoCard 포맷 토글 + 변환 버튼, Client)
  → fetch GET /api/convert?videoId=&format=&title=   (AbortController 보유)
    → validation(videoId/format)            → 실패 시 400
    → lib/convert: 인자 배열로 yt-dlp 실행
        mp3: -x --audio-format mp3 --audio-quality 0
        mp4: -f bestvideo+bestaudio/best --merge-output-format mp4
        공통: --ffmpeg-location <ffmpeg-static 경로>, -o <os.tmpdir()/고유파일명>
    → 변환 완료 → fs.stat(Content-Length) → fs.Readable → Readable.toWeb()
  → 200 바이너리 스트림
       Content-Type: audio/mpeg | video/mp4
       Content-Disposition: attachment; filename*=UTF-8''<sanitized>
  → 클라: response.blob() → objectURL → 다운로드 트리거 → URL.revokeObjectURL
  [실패/중단 경로]
    - 영상 접근 불가 → 404 VIDEO_UNAVAILABLE
    - 바이너리 없음 → 500 CONVERTER_UNAVAILABLE
    - 변환 실패/타임아웃/디스크 → 500 CONVERSION_FAILED
    - 클라 탭 닫음 → AbortSignal → yt-dlp kill
    - 모든 경로 → try/finally로 temp 파일 삭제
```

## 상태 관리
- **서버 상태**: `fetch` 결과(검색 목록). 별도 라이브러리 없이 페이지/컴포넌트 로컬에서 보유.
- **클라이언트 상태**(`useState`):
  - 검색어, 검색 단계(`idle|loading|success|empty|error`)
  - 결과 배열
  - **카드별 변환 상태**(`idle|loading|error`) — 변환 중 해당 버튼만 비활성, 중복 변환 방지
- 전역 상태 관리 도구(redux/zustand 등) 미도입 — 규모상 불필요.

## 프론트 UX 상태 (엣지케이스)
- 검색: 로딩 스켈레톤, 빈 결과 메시지, 에러 배너 + 재시도, Enter 제출, 중복 제출 방지.
- 카드: 긴 제목 truncate(토큰), 썸네일 로드 실패 시 placeholder.
- 변환: 버튼 로딩 스피너/비활성, 인라인 에러 + 재시도, 다운로드 후 `objectURL` revoke.
- 접근성: 버튼/입력 aria 라벨, 포커스 상태(토큰), 키보드 조작.

## 컴포넌트 인벤토리
`SearchBar`, `ResultsGrid`, `VideoCard`(포맷 토글 + 변환/다운로드 버튼), `EmptyState`, `ErrorBanner`, `Spinner`/`Skeleton`.
모두 semantic 토큰만 사용, 모션은 `fade-in`/`slide-up`만(글로우/펄스 금지).

## 외부 의존 경계
- `services/youtube`(HTTP + 키)와 `lib/convert`(child_process 바이너리)는 route handler 안에서만 호출된다. 키·프로세스·파일시스템 접근이 이 경계 밖(컴포넌트/클라이언트)으로 새지 않는다.
- ffmpeg 경로는 `ffmpeg-static`에서 주입(Windows는 `.exe`). yt-dlp 바이너리는 `youtube-dl-exec`가 관리.

## 테스트 전략
- **단위**: `lib/validation`(videoId 경계 10/11/12자·허용문자, format 대소문자/오타, maxResults 클램프), `lib/filename`(traversal·Windows 예약명·빈문자 fallback·길이), `services/youtube`(엔티티 디코딩·썸네일 fallback·매핑, `fetch` 모킹), 에러 코드 매핑.
- **라우트**: `services`/`lib`를 모킹해 네트워크·실제 변환 없이 검증(빈 결과 200, 에러 코드/HTTP 매핑).
- **컴포넌트(RTL)**: SearchBar 제출/중복제출 방지, VideoCard 변환 로딩·비활성·에러·재시도, EmptyState/ErrorBanner 렌더.
- **픽스처**: 샘플 `search.list` 응답 JSON.
- 변환 흐름의 end-to-end 동작은 자동화 대신 **수동 확인**(개발 서버에서 실제 검색·변환)으로 검증한다.
