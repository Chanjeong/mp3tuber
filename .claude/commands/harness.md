이 프로젝트는 Harness 프레임워크를 사용한다. 아래 워크플로우에 따라 작업을 진행하라.

이 커맨드는 인자에 따라 **세 모드**로 동작한다.

- **인자 없음** → **자동 오케스트레이션 모드**. docs로부터 전체 phase를 분할(1회 승인)한 뒤, 각 phase의 세부 계획 생성·실행·커밋을 모든 phase가 끝날 때까지 자동 반복한다. 워크플로우 **O**를 따른다.
- **`plan`** → **세부 계획(레벨 2) 설계 모드**. 한 task의 step을 설계하고 파일만 생성한 뒤 멈춘다. 워크플로우 **A~D**를 따른다.
- **`execute {task-name}`** → **실행 모드**. 이미 만들어진 한 task의 step을 실행한다. 워크플로우 **E**를 따른다.

전달된 인자: `$ARGUMENTS`

> **두 "레벨" 구분(설계 핵심)**:
> - **레벨 1 (전체 계획)**: 프로젝트를 여러 phase로 분할 → `phases/index.json`. (워크플로우 O-1에서만 자동 생성)
> - **레벨 2 (세부 계획)**: 한 phase를 step0/step1/...로 분할 → `phases/{phase}/index.json` + `step{N}.md`. (워크플로우 A~D)
>
> 자동 모드(O)는 레벨 1을 만들고, 각 phase에 대해 레벨 2 설계(C·D)와 실행(E)을 반복 호출하는 오케스트레이터다.

---

## O. 자동 오케스트레이션 (인자 없음 = `/harness`)

`$ARGUMENTS`가 비어 있으면, 메인 Claude가 아래 절차로 **전체 계획 → 각 phase 세부계획·실행·커밋**을 자동 반복한다. 이 모드는 기존 C·D(레벨 2 설계)와 E(실행)를 **재사용**한다 — 절차를 새로 중복 서술하지 말고 해당 섹션을 그대로 호출하라.

핵심 원칙:

- **사용자 게이트는 O-1의 전체 계획 승인 1회뿐.** 각 phase의 세부 계획(레벨 2)은 피드백 요청 없이 자동 생성·실행한다.
- 글로벌 CLAUDE.md "오류 자동 해결 금지" 규칙을 지킨다: `error`/`blocked`이거나 리뷰가 자동 수정으로도 통과하지 못하면 **멈추고 원인을 상세 보고**한다.

### O-1. 전체 계획 수립 (레벨 1) + 유일한 게이트

1. `docs/` 전체(PRD·ARCHITECTURE·ADR·UI_GUIDE·있으면 API)를 읽는다. 필요시 Explore 에이전트를 병렬로 사용한다.
2. 프로젝트를 phase들로 분할한다. 각 phase는 **독립적으로 실행·리뷰 가능한 단위**여야 하며, kebab-case slug와 `goal`(한두 줄 목표/스코프)을 갖는다.
3. `phases/index.json` **초안**(아래 D-1 스키마)을 사용자에게 제시하고 **승인을 요청**한다. → 이것이 이 모드의 유일한 사용자 게이트다.
4. 승인 전에는 어떤 파일도 생성하지 않고 실행도 하지 않는다. 승인되면 `phases/index.json`을 기록한다.
5. **전용 브랜치 준비**: 현재 기본 브랜치(main)이면 작업 브랜치 `harness/{slug}`를 생성·체크아웃한다(slug는 전체 작업을 대표하는 한두 단어). 이미 작업 브랜치 위면 그대로 사용한다.

### O-2. Phase 루프 (pending phase가 없을 때까지 반복)

1. **(a) 다음 `pending` phase 선택** — `phases/index.json`에서 가장 앞선 pending 항목.
2. **(b) 세부 계획 자동 생성 (레벨 2)** — 워크플로우 C의 설계 원칙대로 그 phase의 step을 설계하고, D-2·D-3에 따라 `phases/{phase}/index.json`과 `step{N}.md`들을 생성한다. **피드백을 요청하지 말고 진행한다**(O-1에서 이미 승인됨). 이전에 완료된 phase들의 `summary`를 컨텍스트로 참고해 인터페이스를 일관되게 맞춘다.
3. **(c) 실행** — 그 phase에 대해 워크플로우 **E 전체**(E-1 준비 → E-2 step 루프 → E-3 리뷰 → E-4 마무리)를 수행한다.
4. **(d) 결과 분기**:
   - 리뷰 `VERDICT: PASS`로 phase 완료 → **(e) git 처리** 후 다음 phase로.
   - `error` / `blocked` / 리뷰가 자동 수정으로도 `ISSUES_FOUND` → **커밋하지 않고 즉시 중단**하고, 원인(의존성 체인 + 근본 원인)을 상세 보고한다. (이전까지 완료된 phase의 커밋은 이미 보존되어 있다.)
5. **(e) git commit → push** (PASS인 phase에 한해):
   - 변경된 파일을 **명시적으로 add**한다. **`git add -A` 금지**(글로벌 룰) — `.env`/credentials/큰 바이너리가 staged되는 사고를 막는다. `phases/{phase}/**`와 그 phase가 생성/수정한 소스 파일만 add한다.
   - conventional commit으로 기록한다(예: `feat({phase}): {goal 요약}`). 메시지 본문에 "왜"를 적고, 마지막에 글로벌 규약대로 `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>` 트레일러를 붙인다.
   - `git push`한다(작업 브랜치 첫 push면 `-u origin {branch}`). **일반 push만 — `--force`/`--no-verify` 사용 금지**(PreToolUse 훅이 force push를 차단한다).

### O-3. 마무리

1. 모든 phase가 `completed`가 되면 전체 완료를 보고한다(작업 브랜치명 안내).
2. **PR 생성은 자동으로 하지 않는다** — 필요하면 사용자가 직접 한다.
3. 루프가 중단된 뒤 `/harness`를 다시 호출하면, `phases/index.json`의 디스크 상태를 기준으로 남은 `pending` phase부터 재개된다.

---

> **A~D는 레벨 2(단일 task의 step 설계)다.** `/harness plan`으로 직접 호출하거나, 자동 모드(O-2b)가 phase마다 호출한다. 프로젝트 전체를 phase로 쪼개는 레벨 1은 O-1에서만 다룬다.

## A. 탐색

`/docs/` 하위 문서(PRD, ARCHITECTURE, ADR, 있으면 API.md 등)를 읽고 프로젝트의 기획·아키텍처·설계 의도를 파악한다. 필요시 Explore 에이전트를 병렬로 사용한다.

> **API 선행 규칙**: 이 task가 서버에서 데이터를 가져오는 자체 API 엔드포인트를 포함한다면, `docs/API.md` 명세를 **먼저 작성·검증**해야 한다(CLAUDE.md CRITICAL). 명세 없이 step 설계로 넘어가지 마라 — 이유: step 간 인터페이스(요청/응답 스키마)가 어긋난다.

## B. 논의

구현을 위해 구체화하거나 기술적으로 결정해야 할 사항이 있으면 사용자에게 제시하고 논의한다.

## C. Step 설계

사용자가 구현 계획 작성을 지시하면 여러 step으로 나뉜 초안을 작성해 피드백을 요청한다.

설계 원칙:

1. **Scope 최소화** — 하나의 step에서 하나의 레이어 또는 모듈만 다룬다. 여러 모듈을 동시에 수정해야 하면 step을 쪼갠다.
2. **자기완결성** — 각 step 파일은 독립된 subagent 세션에서 실행된다. "이전 대화에서 논의한 바와 같이" 같은 외부 참조는 금지한다. 필요한 정보는 전부 파일 안에 적는다.
3. **사전 준비 강제** — 관련 문서 경로와 이전 step에서 생성/수정된 파일 경로를 명시한다. 세션이 코드를 읽고 맥락을 파악한 뒤 작업하도록 유도한다.
4. **시그니처 수준 지시** — 함수/클래스의 인터페이스만 제시하고 내부 구현은 에이전트 재량에 맡긴다. 단, 설계 의도에서 벗어나면 안 되는 핵심 규칙(멱등성, 보안, 데이터 무결성 등)은 반드시 명시한다.
5. **AC는 실행 가능한 커맨드** — "~가 동작해야 한다" 같은 추상적 서술이 아닌 `npm run build && npm test` 같은 실제 실행 가능한 검증 커맨드를 포함한다.
6. **주의사항은 구체적으로** — "조심해라" 대신 "X를 하지 마라. 이유: Y" 형식으로 적는다.
7. **네이밍** — step name은 kebab-case slug로, 해당 step의 핵심 모듈/작업을 한두 단어로 표현한다 (예: `project-setup`, `api-layer`, `auth-flow`).

## D. 파일 생성

사용자가 승인하면 아래 파일들을 생성한다.

#### D-1. `phases/index.json` (전체 현황)

여러 task를 관리하는 top-level 인덱스. 이미 존재하면 `phases` 배열에 새 항목을 추가한다.

```json
{
  "phases": [
    {
      "dir": "0-mvp",
      "goal": "한두 줄 목표/스코프",
      "status": "pending"
    }
  ]
}
```

- `dir`: task 디렉토리명.
- `goal`: 이 phase가 무엇을 만드는지 한두 줄 요약. 자동 모드(O-1)가 기록하고, 레벨 2 세부 설계(O-2b)가 step 설계의 입력으로 사용한다. (수동 `plan` 모드에서도 적어두면 좋다.)
- `status`: `"pending"` | `"completed"` | `"error"` | `"blocked"`. 실행 모드(E)에서 자동으로 업데이트된다.
- 타임스탬프(`completed_at`, `failed_at`, `blocked_at`)는 실행 모드(E)에서 상태 변경 시 자동 기록한다. 생성 시 넣지 않는다.

#### D-2. `phases/{task-name}/index.json` (task 상세)

```json
{
  "project": "<프로젝트명>",
  "phase": "<task-name>",
  "steps": [
    { "step": 0, "name": "project-setup", "status": "pending" },
    { "step": 1, "name": "core-types", "status": "pending" },
    { "step": 2, "name": "api-layer", "status": "pending" }
  ]
}
```

필드 규칙:

- `project`: 프로젝트명 (CLAUDE.md 참조).
- `phase`: task 이름. 디렉토리명과 일치시킨다.
- `steps[].step`: 0부터 시작하는 순번.
- `steps[].name`: kebab-case slug.
- `steps[].status`: 초기값은 모두 `"pending"`.

상태 전이와 자동 기록 필드:

| 전이 | 기록되는 필드 | 기록 주체 |
|------|-------------|----------|
| → `completed` | `completed_at`, `summary` | summary는 step subagent가 반환, timestamp는 harness 실행기(메인 Claude) |
| → `error` | `failed_at`, `error_message` | message는 step subagent가 반환, timestamp는 harness 실행기 |
| → `blocked` | `blocked_at`, `blocked_reason` | reason은 step subagent가 반환, timestamp는 harness 실행기 |

`summary`는 step 완료 시 산출물을 한 줄로 요약한 것으로, harness 실행기가 다음 step subagent 프롬프트에 컨텍스트로 누적 전달한다. 따라서 다음 step에 유용한 정보(생성된 파일, 핵심 결정 등)를 담아야 한다.

`created_at`은 harness 실행기가 최초 실행 시 task 레벨에 한 번만 기록한다. step 레벨의 `started_at`도 harness 실행기가 각 step 시작 시 자동 기록한다. 생성 시 넣지 않는다.

#### D-3. `phases/{task-name}/step{N}.md` (각 step마다 1개)

```markdown
# Step {N}: {이름}

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md`
- {이전 step에서 생성/수정된 파일 경로}

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

{구체적인 구현 지시. 파일 경로, 클래스/함수 시그니처, 로직 설명을 포함.
코드 스니펫은 인터페이스/시그니처 수준만 제시하고, 구현체는 에이전트에게 맡겨라.
단, 설계 의도에서 벗어나면 안 되는 핵심 규칙은 명확히 박아넣어라.}

## Acceptance Criteria

```bash
npm run build                              # 컴파일 에러 없음
node scripts/run-gates.mjs typecheck lint  # 이 step 스코프의 타입/린트 게이트
```

전체 테스트(RTL/Playwright E2E)는 step마다 돌리지 않고 phase 리뷰(E-3)에서 일괄 실행한다.

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md 디렉토리 구조를 따르는가?
   - ADR 기술 스택을 벗어나지 않았는가?
   - UI 작업이면 모든 디자인 값이 semantic token인가? (raw/arbitrary 값 금지 — UI_GUIDE.md)
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?

## 금지사항

- {이 step에서 하지 말아야 할 것. "X를 하지 마라. 이유: Y" 형식}
- 기존 테스트를 깨뜨리지 마라
```

> 참고: step 파일에는 status 업데이트 지시를 적지 않는다. 상태 기록은 실행 모드(E)의 harness 실행기가 subagent 반환값을 보고 일괄 처리한다.

---

## E. 실행 (`/harness execute {task-name}`)

`$ARGUMENTS`가 `execute {task-name}` 형태면, 메인 Claude(= harness 실행기)가 아래 절차를 직접 수행한다. 별도 스크립트나 서브프로세스를 쓰지 않는다.

핵심 원칙:

- 각 step은 **독립된 subagent(Task/Agent 툴, `general-purpose`)로 격리 실행**한다. subagent마다 새 컨텍스트를 받으므로 step 간 컨텍스트 오염이 없다.
- `index.json`은 **메인 Claude만 쓴다(single-writer)**. subagent는 작업 후 결과를 JSON으로 반환만 하고, 파일 상태 기록은 메인 Claude가 담당한다.
- 타임스탬프는 Asia/Seoul 기준 `YYYY-MM-DDTHH:MM:SS+0900` 포맷. Windows에서는 PowerShell `Get-Date -Format "yyyy-MM-ddTHH:mm:ssK"`로 생성하거나 동등한 값을 만든다.

### E-1. 준비

1. `phases/{task}/index.json`을 읽는다. 없으면 중단하고 사용자에게 알린다.
2. **API 선행 게이트**: 이 phase가 서버 API 엔드포인트를 포함하면 `docs/API.md`가 존재하고 검증(API.md의 "검증 체크리스트" 통과)되었는지 확인한다. 없거나 미검증이면 **중단**하고, API.md 작성·검증을 먼저 하도록 안내한다. (UI-only/소규모 프로젝트는 해당 없음 — 건너뛴다.)
3. **블로커 검사**: `steps`를 역순으로 보아, 가장 최근 비-pending step이 `error` 또는 `blocked`면 사유를 출력하고 중단한다. (사용자가 원인을 해결한 뒤 해당 step의 `status`를 `"pending"`으로 되돌리고 `error_message`/`blocked_reason`을 지운 후 재실행하도록 안내.)
4. **가드레일 로드**: `CLAUDE.md`와 `docs/*.md`(API.md 포함)를 Read로 읽어 하나의 가드레일 텍스트로 합친다(섹션 사이 `---` 구분).
5. `index.json`에 `created_at`이 없으면 현재 시각을 기록한다.

### E-2. Step 루프 (pending step이 없을 때까지 반복)

1. 다음 `pending` step을 고르고, 해당 step에 `started_at`이 없으면 기록한다.
2. 그 step을 **subagent로 격리 실행**한다. subagent 프롬프트에 아래를 모두 주입한다:
   - 가드레일 전체 (CLAUDE.md + docs)
   - 완료된 step들의 `summary` 누적 컨텍스트 (`- Step N (name): summary` 형식)
   - `phases/{task}/step{N}.md` 파일 내용 전체
   - **재시도일 경우**: 직전 시도의 에러 메시지("⚠ 이전 시도 실패 — 아래 에러를 반드시 참고하여 수정하라")
   - 작업 규칙:
     1. 이전 step에서 작성된 코드를 확인하고 일관성을 유지하라.
     2. 이 step에 명시된 작업만 수행하라. 추가 기능이나 파일을 만들지 마라.
     3. 기존 테스트를 깨뜨리지 마라.
     4. AC(Acceptance Criteria) 검증 커맨드를 직접 실행하라.
   - **반환 형식**: 작업을 마치면 마지막에 아래 JSON **한 줄**만 출력하라.
     ```json
     {"status": "completed", "summary": "산출물 한 줄 요약"}
     ```
     - AC 통과 → `{"status":"completed","summary":"..."}`
     - 3회 수정 시도 후에도 AC 실패 → `{"status":"error","error_message":"구체적 에러"}`
     - 사용자 개입 필요(API 키, 외부 인증, 수동 설정 등) → `{"status":"blocked","blocked_reason":"구체적 사유"}`
3. subagent 반환 JSON을 받아 메인 Claude가 `index.json`을 갱신한다:
   - **completed** → 해당 step에 `status="completed"`, `summary`, `completed_at` 기록 후 다음 step으로.
   - **blocked** → `status="blocked"`, `blocked_reason`, `blocked_at` 기록하고 top index도 `blocked`로 갱신 후 **즉시 중단**.
   - **error** → 직전 에러를 다음 시도에 피드백하며 **최대 3회** 재시도. 3회 후에도 error면 `status="error"`, `error_message`, `failed_at` 기록, top index `error`로 갱신 후 **중단**.

### E-3. 리뷰 (모든 step 완료 후 1회)

모든 step이 완료되면 **`/review` 절차를 실행**한다(리뷰의 단일 소스 = `.claude/commands/review.md`). 요약:

1. **자동 게이트(차단)**: `node scripts/run-gates.mjs` 1회 — 가용 게이트(typecheck/lint, UI면 RTL/Playwright E2E) 병렬 실행. 실패 시 `.gates/<name>.log`로 원인 파악 → 수정 → green 될 때까지 재실행.
2. **superpowers 코드 리뷰**: `superpowers:requesting-code-review`로 가드레일(CLAUDE.md/ARCHITECTURE/ADR/UI_GUIDE/API.md) 준수 포함 리뷰. **blocker/major는 자동 수정 후 1단계 게이트 재검증**, minor는 리포트만.
3. 결과를 `phases/{task}/review.md`에 심각도별로 작성하고 **마지막 줄에 `VERDICT: PASS` 또는 `VERDICT: ISSUES_FOUND`**. `index.json`에 `review = {"verdict": "...", "reviewed_at": "..."}` 기록.

**차단 정책**: 게이트가 green이고 blocker/major가 0이어야 phase를 완료(VERDICT: PASS)로 본다. 즉 사용자가 직접 실행했을 때 의도가 한 번에 동작하는 상태에서만 완료한다. (minor만 남은 코드리뷰 의견은 비차단 — 리포트로 보고.)

### E-4. 마무리

1. `index.json`에 `completed_at`을 기록한다.
2. `phases/index.json`(top)의 해당 phase를 `status="completed"` + `completed_at`으로 갱신한다.
3. **(수동 execute 모드 기준) 브랜치 생성·커밋은 자동으로 하지 않는다.** 변경사항 커밋은 사용자가 직접 하거나 `/tdd-loop`가 처리한다. 진행 상황은 `index.json`의 디스크 상태로 보존되므로, 중단 후 `/harness execute {task}`를 다시 호출하면 남은 pending step부터 재개된다.
   - 단, **자동 오케스트레이션 모드(O)** 에서는 phase가 리뷰 PASS로 끝날 때마다 O-2e가 전용 브랜치에 commit→push를 수행한다(자동 git은 O가 책임).

### E-5. 에러 복구

- **error 발생 시**: `phases/{task}/index.json`에서 해당 step의 `status`를 `"pending"`으로 바꾸고 `error_message`를 삭제한 뒤 `/harness execute {task}`를 다시 실행한다.
- **blocked 발생 시**: `blocked_reason`에 적힌 사유를 해결한 뒤, `status`를 `"pending"`으로 바꾸고 `blocked_reason`을 삭제한 뒤 재실행한다.
