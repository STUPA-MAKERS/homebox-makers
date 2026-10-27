#!/usr/bin/env node
// Render the app icons from public/favicon.svg (the Homebox mark, a square viewBox
// around the hexagon) with Chromium through Playwright.
//
//   icons/icon-<n>.png           purpose "any": the mark on transparent, edge to edge
//   icons/icon-maskable-<n>.png  purpose "maskable": the mark at 80 % on an opaque tile,
//                                so the hexagon stays inside the 40 % safe circle
//   apple-touch-icon.png         180 px, opaque (iOS fills transparent areas with black)
//
// Run from frontend/ after a change of the mark, then python3 scripts/make-splash.py:
//
//     node scripts/make-icons.mjs

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const MARK = readFileSync(join(PUBLIC, 'favicon.svg'), 'utf8');

// The tile behind the maskable and the iOS icon: the light page background (--color-bg).
const TILE = '#f6f7f5';

const ICONS = [
  ...[72, 96, 128, 144, 152, 192, 384, 512].map((n) => [`icons/icon-${n}x${n}.png`, n, 1, null]),
  ...[192, 512].map((n) => [`icons/icon-maskable-${n}x${n}.png`, n, 0.8, TILE]),
  ['apple-touch-icon.png', 180, 0.84, TILE],
];

const browser = await chromium.launch();
for (const [file, size, scale, tile] of ICONS) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const mark = Math.round(size * scale);
  await page.setContent(
    `<body style="margin:0;height:${size}px;display:grid;place-items:center;background:${tile ?? 'transparent'}">` +
      MARK.replace('<svg ', `<svg width="${mark}" height="${mark}" `) +
      '</body>',
  );
  await page.screenshot({ path: join(PUBLIC, file), omitBackground: !tile });
  await page.close();
  console.log(file);
}
await browser.close();
