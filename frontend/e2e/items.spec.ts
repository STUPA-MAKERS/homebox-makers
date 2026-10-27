import { createItem, createLocation, expect, test } from './fixtures';

test('create an item in a location from the dialog', async ({ signedIn: page }) => {
  await createLocation(page, 'Keller');
  await page.goto('/items');
  await page.getByRole('button', { name: 'Gegenstand' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name').fill('Bohrmaschine');
  await dialog.getByRole('combobox', { name: /Ort/ }).click();
  await page.getByRole('option', { name: 'Keller' }).click();
  await dialog.getByRole('button', { name: 'Anlegen' }).click();

  // The new item opens.
  await expect(page.getByRole('heading', { level: 1, name: 'Bohrmaschine' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Ablageort' })).toContainText('Keller');
});

test('edit an item and see the change on its page', async ({ signedIn: page }) => {
  const loc = await createLocation(page, 'Werkstatt');
  const id = await createItem(page, 'Akkuschrauber', loc);
  await page.goto(`/items/${id}`);
  await expect(page.getByRole('heading', { name: 'Akkuschrauber' })).toBeVisible();

  await page.getByRole('link', { name: 'Bearbeiten' }).click();
  await page.getByLabel('Hersteller').fill('Makita');
  await page.getByLabel('Seriennummer').fill('SN-42');
  await page.getByRole('button', { name: 'Speichern' }).click();

  await page.waitForURL(`**/items/${id}`);
  await expect(page.getByText('Makita')).toBeVisible();
  await expect(page.getByText('SN-42')).toBeVisible();
});

test('search the list and open the result', async ({ signedIn: page }) => {
  const loc = await createLocation(page, 'Dachboden');
  await createItem(page, 'Weihnachtsdeko', loc);
  await createItem(page, 'Campingzelt', loc);
  await page.goto('/items');
  await expect(page.getByRole('link', { name: 'Campingzelt' })).toBeVisible();

  await page.getByRole('searchbox').fill('zelt');
  await expect(page).toHaveURL(/q=zelt/);
  await expect(page.getByRole('link', { name: 'Weihnachtsdeko' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Campingzelt' }).click();
  await expect(page.getByRole('heading', { name: 'Campingzelt' })).toBeVisible();
});

test('delete an item', async ({ signedIn: page }) => {
  const loc = await createLocation(page, 'Garage');
  const id = await createItem(page, 'Altreifen', loc);
  await page.goto(`/items/${id}`);
  await page.getByRole('button', { name: 'Aktionen' }).click();
  await page.getByRole('menuitem', { name: 'Löschen' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Löschen' }).click();
  await page.waitForURL('**/items');
  await expect(page.getByRole('link', { name: 'Altreifen' })).toHaveCount(0);
});
