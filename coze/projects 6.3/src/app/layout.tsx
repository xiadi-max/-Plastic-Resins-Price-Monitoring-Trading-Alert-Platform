import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '塑料价格监控',
    template: '%s | 塑料价格监控',
  },
  description: '监控普拉司网塑料原料价格变动，智能提醒，不错过最佳交易时机',
  keywords: ['塑料', '价格监控', '普拉司网', '原料价格', '提醒'],
  authors: [{ name: '塑料价格监控' }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.COZE_PROJECT_ENV === 'DEV';

  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {isDev && <Inspector />}
        {children}
      </body>
    </html>
  );
}
