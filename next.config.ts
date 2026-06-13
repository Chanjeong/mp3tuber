import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const nextConfig: NextConfig = {
  // 홈 디렉터리의 부랑(stray) package-lock.json 때문에 Next가 워크스페이스 루트를 잘못 추론하는 것을
  // 막고, 변환 라우트의 file tracing을 이 프로젝트로 고정한다.
  outputFileTracingRoot: fileURLToPath(new URL(".", import.meta.url)),
  // 변환 라우트가 child_process/fs를 쓰므로 Node 런타임 기반. 추가 설정은 phase가 진행되며 보강한다.
};

export default nextConfig;
