import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppShell } from '@/components/layout/app-shell';
import { QueryProvider } from '@/shared/lib/query-provider';
import { DEFAULT_THEME, themeBootScript } from '@/shared/lib/theme';

export const metadata: Metadata = {
  title: 'hookster',
  description: 'Лента мини-игр, которые можно менять текстом',
};

export const viewport: Viewport = {
  // Светлая тема — тоже продукт: браузерная полоса и формы красятся по теме.
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0D0D07' },
    { media: '(prefers-color-scheme: light)', color: '#FBFBF4' },
  ],
  colorScheme: 'dark light',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // data-theme ставится скриптом до первой отрисовки: иначе светлая тема
    // мигнёт тёмным. Значение по умолчанию — ровно то же, что в токенах.
    <html lang="ru" data-theme={DEFAULT_THEME} suppressHydrationWarning>
      <head>
        <script
          // Скрипт короткий и статичный, внешних данных не принимает.
          dangerouslySetInnerHTML={{ __html: themeBootScript }}
        />
      </head>
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
