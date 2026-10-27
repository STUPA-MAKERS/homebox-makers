import { createItem, createLocation, expect, test } from './fixtures';

/** Every main page loads without an error in the console, also on a phone. */
test('main pages load cleanly', async ({ signedIn: page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  const loc = await createLocation(page, 'Keller');
  const item = await createItem(page, 'Werkzeugkiste', loc);
  for (const path of [
    '/home',
    '/items',
    `/items/${item}`,
    '/locations',
    `/locations/${loc}`,
    '/tags',
    '/profile',
    '/collection',
  ]) {
    await page.goto(path);
    // A list page beside its detail has two headings; on a phone one of them is hidden.
    await expect(page.locator('h1, h2').filter({ visible: true }).first()).toBeAttached();
  }
  expect(errors).toEqual([]);
});
