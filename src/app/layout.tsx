import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { AuthNav } from '@/shared/lib/auth-nav';
import { QueryProvider } from '@/shared/lib/query-provider';

export const metadata: Metadata = {
  title: 'Hookster',
  description: 'Лента мини-игр, которые можно менять текстом',
};

const nav = [
  { href: '/', label: 'Главная' },
  { href: '/feed', label: 'Лента' },
  { href: '/create', label: 'AI Studio' },
  { href: '/profile', label: 'Профиль' },
];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-zinc-950 text-zinc-100">
        <QueryProvider>
          <header className="border-b border-zinc-800">
            <nav className="mx-auto flex max-w-5xl gap-6 px-4 py-4 text-sm">
              <span className="font-semibold text-emerald-400">Hookster</span>
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-zinc-400 transition-colors hover:text-zinc-100"
                >
                  {item.label}
                </Link>
              ))}
              <AuthNav />
            </nav>
          </header>
          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        </QueryProvider>
      </body>
    </html>
  );
}
