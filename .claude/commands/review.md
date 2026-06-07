이 프로젝트의 변경 사항을 리뷰한다. 이 절차는 리뷰의 **단일 소스**이며, harness 실행(E-3 리뷰 단계)도 이 절차를 호출한다.

핵심 원칙: **사용자가 직접 실행했을 때 의도한 바가 한 번에 동작해야 한다. 재검증이 필요한 상태로 PASS를 내지 않는다.**

먼저 가드레일을 읽어라: `/CLAUDE.md`, `/docs/ARCHITECTURE.md`, `/docs/ADR.md`, `/docs/UI_GUIDE.md`, (있으면) `/docs/API.md`.

---

## 1단계: 자동 게이트 (차단 — 하나라도 실패 시 PASS 불가)

```bash
node scripts/run-gates.mjs
```

- 인자 없이 1회 실행하면 `package.json`에 **존재하는 게이트만** 병렬 실행된다:
  - 항상: `typecheck`, `lint`
  - UI 프로젝트: `test`(RTL/단위), `test:e2e`(Playwright E2E)
  - 즉, UI 없는 백엔드/CLI/라이브러리에선 RTL/Playwright가 자동으로 빠진다.
- **압축 요약만 읽는다.** 실패한 게이트가 있으면 그 게이트의 `.gates/<name>.log`만 열어 원인을 파악한다.
- 실패 → 수정 → `node scripts/run-gates.mjs` 재실행. **모든 게이트가 green이 될 때까지 반복.**
- 게이트가 green이 아니면 다음 단계로 넘어가지 않는다.

## 2단계: superpowers 코드 리뷰

- `superpowers:requesting-code-review` 스킬로 변경 전체를 리뷰한다. 가드레일 준수도 점검한다:
  - 아키텍처(ARCHITECTURE.md) 디렉토리 구조 준수
  - 기술 스택(ADR) 이탈 없음
  - **디자인 토큰(UI_GUIDE.md): 컴포넌트에 raw/arbitrary 값 하드코딩이 있으면 blocker**
  - (API 프로젝트면) 구현이 `docs/API.md` 명세와 일치
  - CLAUDE.md CRITICAL 규칙 위반 없음
- **blocker / major** 발견 → **자동으로 수정**한 뒤 **1단계 게이트를 재실행**해 재검증한다.
- **minor** → 수정하지 않고 리포트에만 남긴다 (과잉수정 방지).

## 3단계: 산출

- 결과를 심각도별(blocker / major / minor)로 정리한다.
  - harness 흐름이면 `phases/{task}/review.md`에 작성.
  - 단독 `/review` 호출이면 콘솔에 출력.
- **마지막 줄에 verdict**를 적는다:
  - `VERDICT: PASS` — 게이트 전부 green **그리고** blocker/major 0개 (minor만 남았거나 없음).
  - `VERDICT: ISSUES_FOUND` — 그 외 (이 경우 무엇이 왜 막혔는지 명확히).
