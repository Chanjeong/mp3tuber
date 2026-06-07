# 프로젝트: {프로젝트명}

## 기술 스택
- {프레임워크 (예: Next.js 15)}
- {언어 (예: TypeScript strict mode)}
- {스타일링 (예: Tailwind CSS)}

## 아키텍처 규칙
- CRITICAL: {절대 지켜야 할 규칙 1 (예: 모든 API 로직은 app/api/ 라우트 핸들러에서만 처리)}
- CRITICAL: {절대 지켜야 할 규칙 2 (예: 클라이언트 컴포넌트에서 직접 외부 API를 호출하지 말 것)}
- CRITICAL: 모든 디자인은 semantic token으로만 한다 (docs/UI_GUIDE.md). 색·타이포·간격·radius·그림자를 컴포넌트에 하드코딩(raw hex, `rounded-2xl`, `text-[13px]`, arbitrary `[..]`)하지 말 것. 새 값은 토큰을 먼저 정의해 쓴다.
- CRITICAL: 서버에서 데이터를 가져오는 자체 API 엔드포인트가 필요한 (규모 있는) 프로젝트는, docs/API.md에 명세를 **먼저 작성·검증**한 뒤에만 harness를 실행한다. (정적/UI-only/소규모 프로젝트는 불필요)
- {일반 규칙 (예: 컴포넌트는 components/ 폴더에, 타입은 types/ 폴더에 분리)}

## 개발 프로세스
- CRITICAL: 새 기능 구현 시 반드시 테스트를 먼저 작성하고, 테스트가 통과하는 구현을 작성할 것 (TDD)
- CRITICAL: phase 완료 전 리뷰 게이트를 통과해야 한다. typecheck/lint는 작업 중 필요한 부분에 수시로, RTL/Playwright E2E는 phase마다(UI 프로젝트 한정) 실행한다. 게이트 실패는 차단이며, 발견된 blocker/major는 자동 수정 후 재검증한다. 사용자가 직접 실행했을 때 의도가 한 번에 동작하도록 — 재검증이 필요한 상태로 완료하지 않는다. 절차는 `/review` 참조.
- 커밋 메시지는 conventional commits 형식을 따를 것 (feat:, fix:, docs:, refactor:)

## 명령어
npm run dev        # 개발 서버
npm run build      # 프로덕션 빌드
npm run lint       # ESLint
npm run typecheck  # 타입 체크 (tsc --noEmit)
npm run test       # 단위/컴포넌트 테스트 (RTL)
npm run test:e2e   # E2E 테스트 (Playwright)
node scripts/run-gates.mjs   # 위 게이트들을 병렬 실행 (리뷰가 호출). 인자로 부분 실행 가능
