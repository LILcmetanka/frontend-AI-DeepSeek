/**
 * Фон карточки игры. Превью геймплея API не отдаёт: в ответе ленты только
 * конфиг, готового кадра или canvas нет. Поэтому рисуем декоративную
 * «сцену» из палитры макета (силуэт города + сетка пола), а не
 * притворяемся скриншотом игры.
 *
 * Вынесено из карточки ленты, потому что та же сцена нужна сетке игр
 * в профиле: один рисунок на два экрана.
 */

/** Палитры «города» из макета: выбор детерминирован по id игры. */
const STAGES = [
  { bg: '#0D0D07', far: '#17170F', mid: '#26261F', accent: '#C6FF2E' },
  { bg: '#17170F', far: '#26261F', mid: '#3A3A32', accent: '#FFE23D' },
  { bg: '#060603', far: '#17170F', mid: '#26261F', accent: '#C6FF2E' },
  { bg: '#0D0D07', far: '#26261F', mid: '#3A3A32', accent: '#FFE23D' },
];

function hashGameId(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function StageBackdrop({
  gameId,
  className = '',
}: {
  gameId: string;
  className?: string;
}) {
  const seed = hashGameId(gameId);
  const palette = STAGES[seed % STAGES.length];

  const farBlocks = Array.from({ length: 9 }, (_, index) => ({
    key: `far-${index}`,
    left: (index * 12 + (seed % 5)) % 100,
    width: 9 + ((seed >> (index % 8)) % 7),
    height: 6 + (((seed >> (index % 7)) + index * 3) % 16),
  }));
  const midBlocks = Array.from({ length: 6 }, (_, index) => ({
    key: `mid-${index}`,
    left: (index * 18 + (seed % 9)) % 100,
    width: 13 + ((seed >> (index % 6)) % 8),
    height: 4 + (((seed >> (index % 5)) + index * 2) % 8),
  }));

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={{ background: palette.bg }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(120% 70% at 50% 72%, ${palette.accent}22 0%, rgba(6,6,3,0) 62%)`,
        }}
      />

      {farBlocks.map((block) => (
        <div
          key={block.key}
          className="absolute"
          style={{
            left: `${block.left}%`,
            bottom: '30%',
            width: `${block.width}%`,
            height: `${block.height}%`,
            background: palette.far,
          }}
        />
      ))}
      {midBlocks.map((block) => (
        <div
          key={block.key}
          className="absolute"
          style={{
            left: `${block.left}%`,
            bottom: '30%',
            width: `${block.width}%`,
            height: `${block.height}%`,
            background: palette.mid,
          }}
        />
      ))}

      <div
        className="absolute inset-x-0 bottom-0 h-[30%]"
        style={{ background: palette.mid }}
      />
      <div
        className="absolute inset-x-0 bottom-[30%] h-[3px]"
        style={{ background: palette.accent }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-[30%]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, rgba(242,242,232,0.08) 0 3px, transparent 3px 46px)',
        }}
      />
      <div
        className="absolute inset-x-[-25%] bottom-0 h-[30%] origin-bottom"
        style={{
          transform: 'perspective(240px) rotateX(58deg)',
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(242,242,232,0.08) 0 2px, transparent 2px 42px), repeating-linear-gradient(90deg, rgba(242,242,232,0.08) 0 2px, transparent 2px 42px)',
        }}
      />
    </div>
  );
}
