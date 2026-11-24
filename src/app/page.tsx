import Link from 'next/link';

export default function HomePage() {
  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold">Hookster</h1>
      <p className="max-w-2xl text-zinc-400">
        Платформа мини-игр в формате ленты: играешь подряд, а любую игру можно
        поменять обычным текстом — «сделай быстрее», «добавь врагов».
      </p>
      <div className="flex flex-wrap gap-3 text-sm">
        <Link
          className="rounded bg-emerald-500 px-4 py-2 font-medium text-zinc-950"
          href="/feed"
        >
          Открыть ленту
        </Link>
        <Link
          className="rounded border border-zinc-700 px-4 py-2"
          href="/create"
        >
          Создать игру
        </Link>
      </div>
    </section>
  );
}
