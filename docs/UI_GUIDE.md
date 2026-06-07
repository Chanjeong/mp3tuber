# UI 디자인 가이드

## CRITICAL: 모든 디자인은 semantic token으로만

- **하드코딩 금지.** 색/타이포/간격/radius/그림자/모션 값을 컴포넌트에 직접 박지 마라.
  - 금지: `bg-[#141414]`, `text-[13px]`, `rounded-2xl`, `gap-[7px]`, `text-neutral-400`, `#22c55e`, `shadow-[0_0_20px...]`
  - 허용: 토큰을 소비하는 semantic 클래스/변수 — `bg-surface`, `text-text-muted`, `rounded-card`, `gap-card`, `text-success`
- **단일 소스.** 모든 토큰은 `src/styles/tokens.css`(CSS custom properties)에 정의하고, Tailwind에 매핑해 semantic 유틸로 쓴다.
  - Tailwind v4: `@theme { --color-surface: var(--surface); ... }` 로 매핑.
  - Tailwind v3: `tailwind.config`의 `theme.extend.colors/spacing/borderRadius`에 토큰 변수 매핑.
- **새 값이 필요하면 토큰을 먼저 정의**하고 그 토큰을 쓴다. 컴포넌트에서 raw 값을 즉석으로 만들지 않는다. 이유: 한 곳만 바꾸면 전체가 일관되게 바뀌고, 디자인 표류(drift)를 원천 차단한다.
- 리뷰 시 컴포넌트 코드에 raw/arbitrary 값이 있으면 **blocker**로 간주한다.

## 디자인 원칙
1. 도구처럼 보여야 한다. 마케팅 페이지가 아니라 매일 쓰는 대시보드.
2. 정보 밀도와 가독성 우선. 장식보다 데이터.
3. 일관성은 토큰으로 강제한다 — 같은 역할엔 항상 같은 토큰.

## AI 슬롭 안티패턴 — 하지 마라
| 금지 사항 | 이유 |
|-----------|------|
| backdrop-filter: blur() | glass morphism은 AI 템플릿의 가장 흔한 징후 |
| gradient-text (배경 그라데이션 텍스트) | AI가 만든 SaaS 랜딩의 1번 특징 |
| "Powered by AI" 배지 | 기능이 아니라 장식. 사용자에게 가치 없음 |
| box-shadow 글로우 애니메이션 | 네온 글로우 = AI 슬롭 |
| 보라/인디고 브랜드 색상 | "AI = 보라색" 클리셰 |
| 모든 카드에 동일한 rounded-2xl | 균일한 둥근 모서리는 템플릿 느낌 → radius도 역할별 토큰으로 |
| 배경 gradient orb (blur-3xl 원형) | 모든 AI 랜딩 페이지에 있는 장식 |

---

## 토큰 정의 (`src/styles/tokens.css`)

아래는 기본값(다크 테마)이다. 프로젝트는 **역할명(토큰 이름)은 유지**하고 **값만** 바꾼다.

```css
:root {
  /* --- Color: surface --- */
  --color-bg:             #0a0a0a;  /* 페이지 배경 */
  --color-surface:        #141414;  /* 카드/패널 */
  --color-surface-raised: #1c1c1c;  /* 떠 있는 표면(드롭다운, 모달) */

  /* --- Color: border --- */
  --color-border:         #262626;  /* 기본 경계선 */
  --color-border-strong:  #404040;  /* 강조 경계선 */

  /* --- Color: text --- */
  --color-text:           #ffffff;  /* 주 텍스트 */
  --color-text-secondary: #d4d4d4;  /* 본문 */
  --color-text-muted:     #a3a3a3;  /* 보조/라벨 */
  --color-text-disabled:  #525252;  /* 비활성 */
  --color-text-inverse:   #0a0a0a;  /* 밝은 배경 위 텍스트 */

  /* --- Color: accent (브랜드/주요 액션) — 보라/인디고 금지 --- */
  --color-accent:         #ffffff;
  --color-accent-hover:   #e5e5e5;
  --color-accent-fg:      #0a0a0a;  /* accent 위 텍스트 */

  /* --- Color: state --- */
  --color-success:        #22c55e;
  --color-error:          #ef4444;
  --color-warning:        #eab308;
  --color-info:           #3b82f6;

  /* --- Radius (역할별) --- */
  --radius-sm:     4px;
  --radius-md:     8px;
  --radius-lg:     12px;
  --radius-pill:   9999px;
  --radius-card:   var(--radius-lg);
  --radius-input:  var(--radius-md);
  --radius-button: var(--radius-md);

  /* --- Spacing (4px 베이스 스케일) --- */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-card:    var(--space-6);  /* 카드 내부 패딩 */
  --space-section: var(--space-8);  /* 섹션 간 간격 */
  --space-inline:  var(--space-3);  /* 인라인 요소 간 gap */

  /* --- Elevation (subtle — 네온 글로우 금지) --- */
  --elevation-0: none;
  --elevation-1: 0 1px 2px rgb(0 0 0 / 0.4);
  --elevation-2: 0 4px 12px rgb(0 0 0 / 0.5);

  /* --- Motion (fade-in / slide-up 만 허용) --- */
  --duration-fast: 150ms;
  --duration-base: 250ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
}
```

## 타이포그래피 (역할 = size + weight + leading 묶음)

각 역할을 하나의 토큰/유틸로 정의해 쓴다 (`text-title`, `text-body` …). 컴포넌트에서 `text-4xl font-semibold`를 조합하지 말 것.

| 역할(유틸) | size / weight / leading | 용도 |
|-----------|--------------------------|------|
| `text-display` | 32px / 600 / 1.1 | 대형 헤드라인 |
| `text-title`   | 24px / 600 / 1.2 | 페이지 제목 |
| `text-heading` | 18px / 600 / 1.3 | 섹션/카드 제목 |
| `text-body`    | 14px / 400 / 1.6 | 본문 |
| `text-body-sm` | 13px / 400 / 1.5 | 보조 본문 |
| `text-caption` | 12px / 500 / 1.4 | 라벨/캡션 |
| `text-code`    | 13px / 400 / 1.5 (mono) | 코드/숫자 |

## 컴포넌트 (토큰 소비 예시)

```
카드:    bg-surface text-text-secondary rounded-card border border-border p-card
버튼:
  Primary: bg-accent text-accent-fg rounded-button hover:bg-accent-hover px-4 h-9
  Text:    text-text-muted hover:text-text-secondary
입력:    bg-surface-raised text-text border border-border rounded-input px-3 h-9
         focus:border-border-strong
```

## 레이아웃
- 전체 너비: 콘텐츠 컨테이너는 일관된 max-width 토큰(예: `max-w-5xl`) 사용.
- 정렬: 좌측 정렬 기본. 중앙 정렬 금지(대시보드 성격).
- 간격: 요소 간 `gap-inline`, 섹션 간 `space-section` 토큰만 사용. 임의 `gap-[..]` 금지.

## 애니메이션
- 허용: `fade-in`(`--duration-base`), `slide-up`(`--duration-base`). `--ease-standard` 사용.
- 그 외 모든 애니메이션 금지. 특히 글로우/펄스/무한 루프 장식 금지.

## 아이콘
- SVG 인라인, `strokeWidth={1.5}`. 색은 `currentColor`로 텍스트 토큰을 상속.
- 아이콘 컨테이너(둥근 배경 박스)로 감싸지 않는다.
