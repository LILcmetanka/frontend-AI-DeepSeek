import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_PREVIEW_KIND,
  PREVIEW_PALETTES,
  STILL_FRAME_SECONDS,
  drawPreviewFrame,
  gameHash,
  pickPreviewKind,
  previewImageUrl,
  sceneFor,
  spriteNames,
  type PreviewContext,
  type PreviewKind,
  type PreviewScene,
} from './game-preview.ts';

/** Поддельный контекст: запоминает вызовы, ничего не рисует. */
function fakeContext(): PreviewContext & { calls: string[] } {
  const calls: string[] = [];
  const ctx = {
    fillStyle: '#000',
    calls,
    fillRect: () => calls.push('fillRect'),
    beginPath: () => calls.push('beginPath'),
    arc: () => calls.push('arc'),
    fill: () => calls.push('fill'),
    moveTo: () => calls.push('moveTo'),
    lineTo: () => calls.push('lineTo'),
    closePath: () => calls.push('closePath'),
    save: () => calls.push('save'),
    restore: () => calls.push('restore'),
    translate: () => calls.push('translate'),
    rotate: () => calls.push('rotate'),
    roundRect: () => calls.push('roundRect'),
  };
  return ctx as unknown as PreviewContext & { calls: string[] };
}

const SUBWAYSURF = JSON.stringify({
  speed: 1,
  texts: { menuTitle: 'Night Runner', gameOver: 'Game over' },
  assets: {
    sprites: {
      player: { path: 'sprites/player.png', sliceX: 8, sliceY: 4 },
      coin: { path: 'sprites/coin.png', sliceX: 8, sliceY: 1 },
      'obstacle-low': { path: 'sprites/obstacle-low.png' },
    },
  },
});

test('gameHash: детерминированный и разный у разных id', () => {
  assert.equal(gameHash('game-a'), gameHash('game-a'));
  assert.notEqual(gameHash('game-a'), gameHash('game-b'));
  assert.equal(gameHash(''), 0);
});

test('spriteNames: перечисляет спрайты конфига', () => {
  const names = spriteNames(SUBWAYSURF);
  assert.ok(names.includes('player'));
  assert.ok(names.includes('coin'));
  assert.equal(spriteNames('{}'), '');
  assert.equal(spriteNames('не json'), '');
  assert.equal(spriteNames(null), '');
});

test('pickPreviewKind: явный вид в конфиге главнее догадок', () => {
  const config = JSON.stringify({
    preview: { kind: 'blocks' },
    assets: { sprites: { enemy: {} } },
  });
  assert.equal(pickPreviewKind(config), 'blocks');

  const flat = JSON.stringify({ kind: 'catcher', assets: { sprites: { enemy: {} } } });
  assert.equal(pickPreviewKind(flat), 'catcher');
});

test('pickPreviewKind: неизвестный явный вид не ломает выбор', () => {
  const config = JSON.stringify({ kind: 'puzzle-3d', assets: { sprites: { player: {} } } });
  assert.equal(pickPreviewKind(config), DEFAULT_PREVIEW_KIND);
});

test('pickPreviewKind: вид по спрайтам и текстам', () => {
  const shooter = JSON.stringify({ assets: { sprites: { enemy: {}, bullet: {} } } });
  const flappy = JSON.stringify({ texts: { menuTitle: 'Flappy Hookster' } });
  const catcher = JSON.stringify({ assets: { sprites: { basket: {}, fruit: {} } } });
  const blocks = JSON.stringify({ assets: { sprites: { brick: {}, paddle: {} } } });

  assert.equal(pickPreviewKind(shooter), 'shooter');
  assert.equal(pickPreviewKind(flappy), 'flappy');
  assert.equal(pickPreviewKind(catcher), 'catcher');
  assert.equal(pickPreviewKind(blocks), 'blocks');
});

test('pickPreviewKind: SubwaySurf и мусор — бегун', () => {
  assert.equal(pickPreviewKind(SUBWAYSURF), 'runner');
  assert.equal(pickPreviewKind(undefined), 'runner');
  assert.equal(pickPreviewKind(''), 'runner');
  assert.equal(pickPreviewKind('{"broken":'), 'runner');
  assert.equal(pickPreviewKind('[]'), 'runner');
  assert.equal(pickPreviewKind('"строка"'), 'runner');
});

test('sceneFor: палитра и зерно только из id, вид — из конфига', () => {
  const first = sceneFor('6cb7c591-632f-4b86-9ef3-c0732f11f66f', SUBWAYSURF);
  const again = sceneFor('6cb7c591-632f-4b86-9ef3-c0732f11f66f', SUBWAYSURF);
  const other = sceneFor('3f8c1430-cd2b-41b3-8765-74403fefc698', SUBWAYSURF);

  assert.deepEqual(first, again);
  assert.ok(PREVIEW_PALETTES.includes(first.palette));
  assert.ok(first.seed >= 1 && first.seed <= 9);
  assert.equal(first.kind, 'runner');
  // У другой игры палитра или зерно другие — карточки не выглядят близнецами.
  assert.ok(
    other.palette !== first.palette || other.seed !== first.seed,
    'сцены двух игр совпали полностью',
  );
});

test('drawPreviewFrame: каждый вид рисует кадр и не падает', () => {
  const kinds: PreviewKind[] = ['runner', 'flappy', 'shooter', 'catcher', 'blocks'];
  for (const kind of kinds) {
    const ctx = fakeContext();
    const scene: PreviewScene = { kind, seed: 3, palette: PREVIEW_PALETTES[0] };

    drawPreviewFrame(ctx, 360, 640, STILL_FRAME_SECONDS, scene);

    const fills = ctx.calls.filter((call) => call === 'fillRect').length;
    assert.ok(fills > 0, `вид ${kind} ничего не нарисовал`);
  }
});

test('drawPreviewFrame: сначала заливка фона, нулевой размер — ничего', () => {
  const ctx = fakeContext();
  const scene: PreviewScene = { kind: 'runner', seed: 1, palette: PREVIEW_PALETTES[2] };

  drawPreviewFrame(ctx, 100, 200, 1, scene);
  assert.equal(ctx.calls[0], 'fillRect');

  const empty = fakeContext();
  drawPreviewFrame(empty, 0, 200, 1, scene);
  drawPreviewFrame(empty, 100, 0, 1, scene);
  assert.deepEqual(empty.calls, []);
});

test('drawPreviewFrame: одинаковый вход — одинаковый кадр', () => {
  const scene: PreviewScene = { kind: 'shooter', seed: 5, palette: PREVIEW_PALETTES[1] };
  const left = fakeContext();
  const right = fakeContext();

  drawPreviewFrame(left, 200, 300, 4.2, scene);
  drawPreviewFrame(right, 200, 300, 4.2, scene);

  assert.deepEqual(left.calls, right.calls);
});

test('previewImageUrl: берёт кадр генерации из конфига', () => {
  const config = JSON.stringify({
    preview: { kind: 'runner', url: 'http://localhost:8090/videos/abc/player-base.png' },
  });
  assert.equal(
    previewImageUrl(config),
    'http://localhost:8090/videos/abc/player-base.png',
  );
  const https = JSON.stringify({ preview: { url: ' https://cdn.example.com/videos/x/p-base.png ' } });
  assert.equal(previewImageUrl(https), 'https://cdn.example.com/videos/x/p-base.png');
});

test('previewImageUrl: нет кадра — null, а не выдуманный адрес', () => {
  assert.equal(previewImageUrl(undefined), null);
  assert.equal(previewImageUrl(null), null);
  assert.equal(previewImageUrl(''), null);
  assert.equal(previewImageUrl('{'), null);
  assert.equal(previewImageUrl('юю'), null);
  assert.equal(previewImageUrl('[1,2]'), null);
  // Только вид без кадра: карточка рисует сцену.
  assert.equal(previewImageUrl(JSON.stringify({ preview: { kind: 'runner' } })), null);
  assert.equal(previewImageUrl(JSON.stringify({ preview: {} })), null);
  // Не строка.
  assert.equal(previewImageUrl(JSON.stringify({ preview: { url: 42 } })), null);
  // Относительный путь и чужие схемы не принимаем.
  assert.equal(previewImageUrl(JSON.stringify({ preview: { url: '/videos/x/p.png' } })), null);
  assert.equal(previewImageUrl(JSON.stringify({ preview: { url: 'javascript:alert(1)' } })), null);
  assert.equal(previewImageUrl(JSON.stringify({ preview: { url: 'data:image/png;base64,AAA' } })), null);
});
