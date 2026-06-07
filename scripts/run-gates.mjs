#!/usr/bin/env node
/**
 * 리뷰 게이트 병렬 러너.
 *
 * typecheck / lint / RTL(test) / Playwright(test:e2e) 게이트를 **병렬로** 실행하고,
 * 콘솔에는 압축 요약만 출력한다. 상세 출력은 `.gates/<gate>.log`에 저장하므로,
 * 호출자(Claude)는 요약만 읽고 실패한 게이트의 로그만 열어보면 된다 → 토큰·시간 절약.
 *
 * 동작:
 *   - package.json의 scripts에 **존재하는 게이트만** 실행한다.
 *     (UI 없는 프로젝트엔 test:e2e/test가 없으므로 자동 skip → "필요할 때만" 분기가 코드로 해결됨)
 *   - 인자로 부분 실행: `node scripts/run-gates.mjs typecheck lint`
 *     인자 없음 = 가용 게이트 전부.
 *   - 하나라도 실패하면 exit 1 (차단), 전부 통과면 exit 0.
 *
 * Usage:
 *   node scripts/run-gates.mjs                 # 가용 게이트 전부 (phase 리뷰)
 *   node scripts/run-gates.mjs typecheck lint  # 일부만 (step 작업 중 수시)
 *
 * 주의: test:e2e(Playwright)는 자체 서버가 필요하면 playwright.config의 webServer로
 *       서버를 띄우도록 전제한다(다른 게이트와 포트 충돌 없음).
 */

import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const GATES_DIR = join(ROOT, ".gates");

// 게이트 키 → package.json scripts 이름. 출력 순서이기도 하다.
const GATE_SCRIPTS = ["typecheck", "lint", "test", "test:e2e"];

function readPackageScripts() {
  const pkgPath = join(ROOT, "package.json");
  if (!existsSync(pkgPath)) return null;
  try {
    return JSON.parse(readFileSync(pkgPath, "utf8")).scripts ?? {};
  } catch (e) {
    console.error(`run-gates: package.json 파싱 실패 — ${e.message}`);
    return {};
  }
}

function sanitize(name) {
  // Windows 파일명에 ':' 불가 → '-'로 치환 (test:e2e → test-e2e.log)
  return name.replace(/[:/\\]/g, "-");
}

function runGate(name) {
  const t0 = Date.now();
  return new Promise((resolve) => {
    // Windows에서 npm은 npm.cmd이며 Node 18+ 보안 정책상 shell:true 필요.
    const child = spawn("npm", ["run", name], { cwd: ROOT, shell: true });
    const chunks = [];
    child.stdout.on("data", (d) => chunks.push(d));
    child.stderr.on("data", (d) => chunks.push(d));
    child.on("error", (err) => {
      chunks.push(Buffer.from(`\n[spawn error] ${err.message}\n`));
      finish(1);
    });
    child.on("close", (code) => finish(code ?? 1));

    function finish(code) {
      const elapsed = (Date.now() - t0) / 1000;
      const logPath = join(GATES_DIR, `${sanitize(name)}.log`);
      writeFileSync(logPath, Buffer.concat(chunks));
      resolve({ name, ok: code === 0, elapsed, logPath });
    }
  });
}

async function main() {
  const scripts = readPackageScripts();
  if (scripts === null) {
    console.log("run-gates: package.json 없음 — 실행할 게이트가 없습니다 (skip).");
    process.exit(0);
  }

  const requested = process.argv.slice(2);
  const selected = (requested.length ? requested : GATE_SCRIPTS).filter((g) => {
    if (!GATE_SCRIPTS.includes(g)) {
      console.error(`run-gates: 알 수 없는 게이트 '${g}' — 무시합니다.`);
      return false;
    }
    return g in scripts; // package.json에 정의된 것만
  });

  if (selected.length === 0) {
    console.log("run-gates: 실행할 게이트가 없습니다 (package.json에 해당 script 없음).");
    process.exit(0);
  }

  mkdirSync(GATES_DIR, { recursive: true });
  console.log(`run-gates: ${selected.join(", ")} 병렬 실행...\n`);

  const results = await Promise.all(selected.map(runGate));

  const pad = Math.max(...results.map((r) => r.name.length));
  let failed = 0;
  for (const r of results) {
    const mark = r.ok ? "✓" : "✗";
    const time = `${r.elapsed.toFixed(1)}s`;
    const tail = r.ok ? "" : `  → ${r.logPath}`;
    console.log(`${mark} ${r.name.padEnd(pad)}  ${time.padStart(6)}${tail}`);
    if (!r.ok) failed++;
  }

  console.log();
  if (failed > 0) {
    console.error(`run-gates: ${failed}/${results.length} 게이트 실패. 위 로그를 확인하세요.`);
    process.exit(1);
  }
  console.log(`run-gates: 전체 ${results.length} 게이트 통과.`);
  process.exit(0);
}

main();
