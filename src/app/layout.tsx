import type { Metadata } from "next";
import "./globals.css";

// Phase 0 스텁 루트 레이아웃. 다크 테마·토큰·컨테이너는 Phase 1(app/layout.tsx)에서 확정한다.
export const metadata: Metadata = {
  title: "mp3tuber",
  description: "YouTube 영상을 mp3/mp4로 변환해 내려받는 로컬·개인용 웹앱",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
