import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Phase 0엔 테스트가 0건 — 부재 자체로 게이트를 실패시키지 않는다(Phase 2부터 실제 테스트 추가).
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      // tsconfig의 `@/*` → `src/*` alias와 동기화
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
