import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "mp3tuber",
  description: "YouTube 영상을 mp3/mp4로 변환해 내려받는 로컬·개인용 웹앱",
};

// 다크 도구형 셸. 콘텐츠는 max-width 컨테이너에 좌측 정렬(대시보드 성격 — 중앙 정렬 금지).
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-bg text-text text-body antialiased">
        <div className="max-w-5xl px-section py-section">{children}</div>
      </body>
    </html>
  );
}
