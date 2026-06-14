import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const nextConfig: NextConfig = {
  // 홈 디렉터리의 부랑(stray) package-lock.json 때문에 Next가 워크스페이스 루트를 잘못 추론하는 것을
  // 막고, 변환 라우트의 file tracing을 이 프로젝트로 고정한다.
  outputFileTracingRoot: fileURLToPath(new URL(".", import.meta.url)),
  // 변환 라우트가 child_process/fs를 쓰므로 Node 런타임 기반.
  // youtube-dl-exec/ffmpeg-static은 동봉 바이너리 경로를 모듈 위치(__dirname) 기준으로 계산한다.
  // 번들에 포함되면 __dirname이 .next/server로 재작성돼 바이너리 spawn이 ENOENT로 실패하므로,
  // 번들에서 제외해 런타임에 node_modules에서 직접 로드되도록 고정한다.
  serverExternalPackages: ["youtube-dl-exec", "ffmpeg-static"],
};

export default nextConfig;
