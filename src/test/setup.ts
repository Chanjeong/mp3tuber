// RTL용 커스텀 매처(`toBeInTheDocument` 등) 등록. 각 테스트 후 DOM 정리는 vitest globals + RTL auto-cleanup이 처리.
import "@testing-library/jest-dom/vitest";
