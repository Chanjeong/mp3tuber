# API 명세

> 자체 API 엔드포인트가 있는 프로젝트이므로 이 명세를 **먼저 작성·검증**한 뒤 구현한다(`CLAUDE.md`).
> 검증 = 하단 "검증 체크리스트" 모두 통과.

## 개요
mp3tuber의 서버 API. 두 가지를 제공한다: ① YouTube 영상 **검색**(메타데이터), ② 선택 영상의 **mp3/mp4 변환·다운로드**. 검색은 YouTube Data API v3를 서버에서 호출하고, 변환은 서버에서 yt-dlp+ffmpeg를 실행한다(`docs/ARCHITECTURE.md`).

## 베이스 URL / 버전
- Base URL: `/api` (Next.js App Router route handler — `src/app/api/...`)
- 버전 정책: 버전 없음(로컬·단일 사용자).
- 런타임: 두 라우트 모두 `runtime = 'nodejs'`.

## 인증
없음(공개). 로컬에서만 실행되며 외부 노출하지 않는다. `YOUTUBE_API_KEY`는 서버 환경변수로만 사용되고 응답에 노출되지 않는다.

## 공통 규약

### 에러 포맷
모든 에러 응답(JSON)은 동일한 형태를 따른다:
```json
{ "error": { "code": "STRING_CODE", "message": "사람이 읽을 설명" } }
```
클라이언트엔 안전한 `message`+`code`만 노출한다. 스택·상위 API 원문·키는 서버 로그(`console.error`)에만 남긴다.

### 상태 코드 컨벤션
| 코드 | 의미 |
|------|------|
| 200 | 성공 |
| 400 | 잘못된 요청(검증 실패) |
| 404 | 리소스 없음(영상 접근 불가) |
| 405 | 허용되지 않은 메서드(두 엔드포인트는 GET 전용) |
| 500 | 서버 오류 |
| 502 | 상위(YouTube) API 오류 |
| 503 | 상위 API 쿼터 초과 |

### 에러 코드 카탈로그
| code | HTTP | 발생 지점 | 의미 |
|------|------|-----------|------|
| `MISSING_QUERY` | 400 | search | `q` 누락/공백 |
| `INVALID_MAX_RESULTS` | 400 | search | `maxResults` 범위 밖(1–50) |
| `INVALID_VIDEO_ID` | 400 | convert | `videoId`가 `^[A-Za-z0-9_-]{11}$` 아님 |
| `INVALID_FORMAT` | 400 | convert | `format`이 `mp3`/`mp4` 아님 |
| `VIDEO_UNAVAILABLE` | 404 | convert | 삭제/비공개/지역차단/연령제한으로 접근 불가 |
| `QUOTA_EXCEEDED` | 503 | search | YouTube Data API 일일 쿼터 초과 |
| `UPSTREAM_ERROR` | 502 | search | YouTube API 네트워크/5xx |
| `CONFIG_ERROR` | 500 | 공통 | `YOUTUBE_API_KEY` 미설정 등 환경 문제 |
| `CONVERTER_UNAVAILABLE` | 500 | convert | yt-dlp/ffmpeg 바이너리 없음·실행 불가 |
| `CONVERSION_FAILED` | 500 | convert | 변환 중 실패(디스크/ffmpeg/타임아웃 등) |

### 페이지네이션
없음(MVP). `nextPageToken` 미사용.

## 엔드포인트 명세

### `GET /api/search` — 키워드로 YouTube 영상 검색
- **인증**: 불필요
- **요청**:
  - Path params: 없음
  - Query:
    - `q: string` — 검색어(필수, trim 후 비어 있으면 `MISSING_QUERY`)
    - `maxResults?: number` — 결과 개수(선택, 기본 `12`, 1–50 범위. 범위 밖이면 `INVALID_MAX_RESULTS`)
  - Body: 없음
- **응답 (200)**:
  ```json
  { "items": [
    {
      "videoId": "string — YouTube 영상 ID(11자)",
      "title": "string — 영상 제목(HTML 엔티티 디코딩됨)",
      "channelTitle": "string — 채널명",
      "thumbnailUrl": "string — 썸네일 URL(우선순위 선택)",
      "publishedAt": "string — ISO 8601 게시일시"
    }
  ] }
  ```
  - 매칭 결과가 없으면 `{ "items": [] }` (200, 에러 아님).
- **서버 동작 메모**: `search.list`(`part=snippet`, `type=video`, `q`, `maxResults`, 선택적 `regionCode=KR`·`relevanceLanguage=ko`) 호출. `snippet.title`은 HTML 엔티티 디코딩, 썸네일은 medium/high 우선순위로 선택(없으면 default).
- **에러**: `MISSING_QUERY`(400), `INVALID_MAX_RESULTS`(400), `QUOTA_EXCEEDED`(503), `UPSTREAM_ERROR`(502), `CONFIG_ERROR`(500)
- **예시**:
  ```
  GET /api/search?q=lofi&maxResults=2
  → 200 { "items": [ { "videoId": "jfKfPfyJRdk", "title": "lofi hip hop radio", "channelTitle": "Lofi Girl", "thumbnailUrl": "https://i.ytimg.com/...", "publishedAt": "2022-07-12T00:00:00Z" }, ... ] }

  GET /api/search?q=
  → 400 { "error": { "code": "MISSING_QUERY", "message": "검색어를 입력하세요." } }
  ```

### `GET /api/convert` — 선택 영상을 mp3/mp4로 변환해 다운로드
- **인증**: 불필요
- **요청**:
  - Path params: 없음
  - Query:
    - `videoId: string` — YouTube 영상 ID(필수, `^[A-Za-z0-9_-]{11}$`)
    - `format: "mp3" | "mp4"` — 출력 포맷(필수)
    - `title?: string` — 다운로드 파일명용(선택, 서버에서 sanitize. 없거나 빈 결과면 `videoId` 사용)
  - Body: 없음
- **응답 (200)**: **바이너리 스트림(JSON 아님)**
  - Headers:
    - `Content-Type`: `audio/mpeg`(mp3) | `video/mp4`(mp4)
    - `Content-Disposition`: `attachment; filename*=UTF-8''<sanitized-name>.<ext>`
    - `Content-Length`: 변환 완료 파일 stat 값(가능 시)
  - Body: 변환된 파일 바이트 스트림
- **서버 동작 메모**(`docs/ARCHITECTURE.md` §변환):
  - 검증 통과 후 yt-dlp를 **인자 배열**로 실행. mp3 = `-x --audio-format mp3 --audio-quality 0`, mp4 = `-f bestvideo+bestaudio/best --merge-output-format mp4`. 공통 `--ffmpeg-location <ffmpeg-static>`, `-o <os.tmpdir()/고유파일명>`.
  - 변환 완료 파일을 스트리밍. `try/finally`로 temp 삭제, 요청 `AbortSignal`로 중단 시 프로세스 kill, 타임아웃 초과 시 kill→`CONVERSION_FAILED`.
- **에러**: `INVALID_VIDEO_ID`(400), `INVALID_FORMAT`(400), `VIDEO_UNAVAILABLE`(404), `CONVERTER_UNAVAILABLE`(500), `CONVERSION_FAILED`(500)
- **예시**:
  ```
  GET /api/convert?videoId=jfKfPfyJRdk&format=mp3&title=lofi%20hip%20hop%20radio
  → 200 (audio/mpeg, attachment; filename*=UTF-8''lofi%20hip%20hop%20radio.mp3)

  GET /api/convert?videoId=bad&format=mp3
  → 400 { "error": { "code": "INVALID_VIDEO_ID", "message": "유효하지 않은 영상 ID입니다." } }

  GET /api/convert?videoId=jfKfPfyJRdk&format=wav
  → 400 { "error": { "code": "INVALID_FORMAT", "message": "format은 mp3 또는 mp4여야 합니다." } }
  ```

## 데이터 모델
구현의 `src/types/index.ts`와 일치시킨다.
```ts
type VideoResult = {
  videoId: string;       // 11자 YouTube 영상 ID
  title: string;         // HTML 엔티티 디코딩된 제목
  channelTitle: string;  // 채널명
  thumbnailUrl: string;  // 썸네일 URL
  publishedAt: string;   // ISO 8601
  duration?: string;     // (MVP 미사용 — search.list 미제공. 향후 확장용 optional)
};

type ConvertFormat = 'mp3' | 'mp4';

type ApiError = { code: string; message: string };
// 모든 에러 응답은 { error: ApiError } 로 래핑된다.
```

## 변경 이력
| 날짜 | 변경 |
|------|------|
| 2026-06-13 | 최초 작성 (search, convert 엔드포인트) |

---

## 검증 체크리스트 (구현 전 통과 필수)
- [x] 모든 엔드포인트에 method/경로/요청/응답/에러가 빠짐없이 기술됨
- [x] 요청·응답 스키마가 `데이터 모델`의 타입과 일치 (`VideoResult`, `ConvertFormat`, `ApiError`)
- [x] 에러 포맷·상태코드가 `공통 규약`·에러 코드 카탈로그를 따름
- [x] 프론트엔드가 호출할 모든 데이터가 어떤 엔드포인트에서 오는지 커버됨 (검색 목록=search, 변환 파일=convert. 카드 표시 필드 썸네일·제목·채널이 search 응답에 모두 존재. duration은 MVP 미표시로 누락 흐름 없음)
- [x] 인증이 필요한 엔드포인트 없음(로컬 공개) — 명시됨
