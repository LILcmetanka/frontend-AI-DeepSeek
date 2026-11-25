import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/layout/app-shell';
import { QueryProvider } from '@/shared/lib/query-provider';

export const metadata: Metadata = {
  title: 'Hookster',
  description: 'Лента мини-игр, которые можно менять текстом',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className="h-full bg-stage text-ink antialiased">
        <QueryProvider>
          {/* NF_013: каркас один на все маршруты. На телефоне сайдбар
              уезжает, вместо него — нижняя навигация. */}
          <AppShell>{children}</AppShell>
        </QueryProvider>
      </body>
    </html>
  );
}
