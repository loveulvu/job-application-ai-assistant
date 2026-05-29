import "./globals.css";

export const metadata = {
  title: "Job Application AI Assistant",
  description: "半自动简历投递辅助器 MVP",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
