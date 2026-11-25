import Link from 'next/link';
import { HooksterLockup, Mascot } from '@/components/brand/brand';

/**
 * Корень `/` — витрина продукта, а не служебная страница каркаса.
 * Сделана по content fundamentals дизайн-системы: строчные буквы, «на ты»,
 * глагол в начале, заголовок ≤ 5 слов, одна лаймовая кнопка на экран,
 * без эмодзи. Мускот — один, обрезан краем, наклон из токена `--tilt-a`.
 */
export default function HomePage() {
  return (
    <section className="relative flex min-h-[70dvh] flex-col items-start justify-center gap-6 overflow-hidden px-1 py-6">
      <Mascot
        size={196}
        tilt="a"
        className="absolute top-[-24px] right-[-40px] max-dt:hidden"
      />

      <HooksterLockup size={34} />

      <h1 className="type-display-1 m-0 max-w-[620px] text-balance text-ink">
        ломай игры текстом
      </h1>

      <p className="type-body-lg m-0 max-w-[520px] text-ink-soft">
        лента мини-игр: листай свайпом, меняй правила одной строкой —
        «сделай врагов огромными», «убери гравитацию» — и играй сразу
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/feed"
          className="inline-flex h-[54px] items-center justify-center rounded-pill bg-acid px-6 text-body font-extrabold text-on-acid transition-[background,transform,box-shadow] duration-[var(--dur-fast)] hover:-translate-y-0.5 hover:bg-acid-hi hover:shadow-glow active:scale-[0.94]"
        >
          открыть ленту
        </Link>
        <Link
          href="/create"
          className="inline-flex h-[54px] items-center justify-center rounded-pill border-2 border-line-strong px-6 text-body font-bold text-ink transition-[border-color,transform] duration-[var(--dur-fast)] hover:-translate-y-0.5 hover:border-accent-line hover:text-accent active:scale-[0.94]"
        >
          собрать свою
        </Link>
      </div>

      <p className="type-label m-0 text-ink-mute">
        ↑ ↓ или колесо — следующая игра
      </p>
    </section>
  );
}
