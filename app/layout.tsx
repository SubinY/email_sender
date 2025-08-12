import './globals.css';

export const metadata = {
  title: '批量发送邮件管理系统',
  description:
    '批量发送邮件管理系统 - 包含接收邮箱管理、发送邮箱管理和发送任务管理功能'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="flex min-h-screen w-full flex-col">{children}</body>
    </html>
  );
}
