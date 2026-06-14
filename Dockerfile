# mp3tuber — 상시 구동 Docker 이미지.
# 서버리스(Vercel)의 5분 타임아웃·512MB /tmp 제약이 없어 긴 영상·플레이리스트도 변환된다.
# node_modules를 통째로 실행 이미지에 넣어 yt-dlp/ffmpeg 번들 바이너리가 항상 존재한다
# (서버리스 file-tracing이 바이너리를 누락시켜 spawn ENOENT가 나던 문제를 원천 차단).

# 1) 의존성 — youtube-dl-exec(yt-dlp)·ffmpeg-static 바이너리가 postinstall로 node_modules에 받아진다.
FROM node:22-bookworm-slim AS deps
WORKDIR /app
# youtube-dl-exec의 preinstall은 python 존재를 검사한다. 바이너리 "다운로드"엔 python이 필요 없고,
# 실제 "실행"에 필요한 python3는 runner 단계에 설치하므로, 빌드 단계의 이 검사만 건너뛴다.
ENV YOUTUBE_DL_SKIP_PYTHON_CHECK=1
COPY package.json package-lock.json ./
RUN npm ci

# 2) 빌드
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 3) 실행
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# 번들 yt-dlp(linux)는 python 런타임이, HTTPS 요청엔 ca-certificates가 필요하다.
# yt-dlp가 `python`/`python3` 어느 쪽을 호출해도 되도록 심볼릭 링크까지 건다.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 ca-certificates \
  && ln -sf /usr/bin/python3 /usr/bin/python \
  && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
EXPOSE 3000
CMD ["npm", "run", "start"]
