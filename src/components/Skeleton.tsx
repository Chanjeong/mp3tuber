import type { HTMLAttributes } from 'react';

/**
 * 정적 로딩 플레이스홀더. 펄스 애니메이션은 UI_GUIDE에서 금지하므로 움직이지 않는다.
 * 크기·radius는 className으로 지정(semantic 토큰/스케일만).
 */
export function Skeleton({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={`rounded-md bg-surface-raised ${className}`} {...rest} />;
}
