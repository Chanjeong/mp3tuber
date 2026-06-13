# mp3tuber

YouTube를 검색해 영상을 고르고, 그 영상을 **mp3(오디오) 또는 mp4(비디오)로 변환해 브라우저로 내려받는** 로컬·개인용 웹앱.

> ⚠️ **개인·학습 목적 전용.** 스트림 변환은 로컬에서 개인적으로만 사용한다. 공개 배포·서비스 운영 금지, 업로더의 권리와 YouTube 약관(ToS)을 존중할 것. 자세한 내용은 아래 [디스클레이머](#디스클레이머) 참조.

## 기술 스택

- **Next.js 15** (App Router) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4** — semantic token 단일 소스 (`src/styles/tokens.css`)
- **검색**: YouTube Data API v3 (`search.list`) — 서버에서만 호출
- **변환**: `youtube-dl-exec`(yt-dlp 바이너리) + `ffmpeg-static`(ffmpeg 바이너리) 번들
- **테스트**: Vitest + React Testing Library

## 요구 사항

- **Node.js ≥ 18.18** (Next 15 요구. 변환 라우트가 `child_process`·`fs`를 쓰므로 Node 런타임 필수 — Edge 불가)
- **YouTube Data API v3 키** — [Google Cloud Console](https://console.cloud.google.com/)에서 *YouTube Data API v3*를 활성화하고 API 키를 발급한다.

## 빠른 시작

```bash
# 1) 의존성 설치 (yt-dlp / ffmpeg 바이너리가 함께 설치됨)
npm install

# 2) 환경 변수 설정: 예시 파일을 복사해 키를 채운다
cp .env.local.example .env.local   # Windows PowerShell: Copy-Item .env.local.example .env.local
# .env.local 을 열어 YOUTUBE_API_KEY=발급받은_키 입력

# 3) 개발 서버 실행 → http://localhost:3000
npm run dev
```

> 키를 설정하지 않으면 `/api/search`가 `CONFIG_ERROR`(500)을 반환한다.
> `YOUTUBE_API_KEY`는 **서버 전용**이다. `NEXT_PUBLIC_` 접두사를 붙이지 말 것(클라이언트 번들 노출). `.env.local`은 절대 커밋하지 않는다(`.gitignore`로 무시됨).

## 사용법

1. 상단 검색창에 키워드를 입력하고 검색한다.
2. 결과 카드에서 **mp3 / mp4** 포맷을 토글한다.
3. **변환** 버튼을 누르면 서버가 변환한 파일이 자동으로 다운로드된다.

## 명령어

```bash
npm run dev        # 개발 서버
npm run build      # 프로덕션 빌드
npm run start      # 빌드 결과 실행
npm run lint       # ESLint
npm run typecheck  # 타입 체크 (tsc --noEmit)
npm run test       # 단위/컴포넌트 테스트 (Vitest + RTL)
```

## 문서

| 문서 | 내용 |
|------|------|
| [`docs/PRD.md`](docs/PRD.md) | 제품 정의 |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | 아키텍처 |
| [`docs/ADR.md`](docs/ADR.md) | 결정 기록 |
| [`docs/API.md`](docs/API.md) | API 명세 (`/api/search`, `/api/convert`) + 에러 코드 카탈로그 |
| [`docs/UI_GUIDE.md`](docs/UI_GUIDE.md) | 디자인 토큰 |
| [`docs/TODO.md`](docs/TODO.md) | 구현 로드맵 |

## 디스클레이머

이 프로젝트는 **개인 학습·로컬 사용**을 위한 도구다.

- 변환·다운로드 기능을 **공개 서비스로 배포하거나 타인에게 제공하지 않는다.**
- 콘텐츠 업로더와 YouTube의 권리·이용약관을 존중한다. 저작권이 있는 콘텐츠를 권리자의 허락 없이 내려받아 재배포하지 않는다.
- 사용에 따른 책임은 전적으로 사용자 본인에게 있다.
