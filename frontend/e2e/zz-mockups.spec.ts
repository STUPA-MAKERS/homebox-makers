import { test } from './fixtures';
const S = '/tmp/claude-0/-home-claude/6efb55cf-be65-5ed7-82eb-bf9fbc727d32/scratchpad/mock';
test('mockup shots', async ({ signedIn: page }) => {
  page.on('pageerror', (e) => console.log('PAGEERR', e.message));
  await page.emulateMedia({ colorScheme: 'dark' });
  for (const [w, h, n] of [
    [1440, 900, 'wide'],
    [390, 844, 'phone'],
  ] as const) {
    await page.setViewportSize({ width: w, height: h });
    for (const p of ['maintenance-a', 'maintenance-b', 'scanner', 'scanner-hit']) {
      await page.goto(`/mockups/${p}`);
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${S}/${p}-${n}.png`, fullPage: n === 'wide' && p === 'maintenance-b' });
    }
  }
});
