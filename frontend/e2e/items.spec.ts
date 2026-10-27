import { createItem, createLocation, expect, test } from './fixtures';

test('create an item in a location from the dialog', async ({ signedIn: page }) => {
  await createLocation(page, 'Keller');
  await page.goto('/items');
  await page.getByRole('button', { name: 'Gegenstand anlegen' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name').fill('Bohrmaschine');
  await dialog.getByRole('combobox', { name: /Ort/ }).click();
  await page.getByRole('option', { name: 'Keller' }).click();
  await dialog.getByRole('button', { name: 'Anlegen' }).click();

  // The new item opens.
  await expect(page.getByRole('heading', { name: 'Bohrmaschine' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Ablageort' })).toContainText('Keller');
});

test('edit an item and see the change on its page', async ({ signedIn: page }) => {
  const loc = await createLocation(page, 'Werkstatt');
  const id = await createItem(page, 'Akkuschrauber', loc);
  await page.goto(`/items/${id}`);
  await expect(page.getByRole('heading', { name: 'Akkuschrauber' })).toBeVisible();

  await page.getByRole('button', { name: 'Bearbeiten' }).first().click();
  const pane = page.getByRole('dialog', { name: 'Gegenstand bearbeiten' });
  await expect(pane.getByRole('button', { name: 'Speichern' })).toHaveCount(0);
  await pane.getByLabel('Hersteller').fill('Makita');
  await pane.getByLabel('Seriennummer').fill('SN-42');
  await pane.getByRole('button', { name: 'Speichern' }).click();
  await expect(pane).toHaveCount(0);
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
  await page.getByRole('button', { name: 'Aktionen', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Löschen' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Löschen' }).click();
  await page.waitForURL('**/items');
  await expect(page.getByRole('link', { name: 'Altreifen' })).toHaveCount(0);
});

test('assign tags from the item and from the tag', async ({ signedIn: page }) => {
  const loc = await createLocation(page, 'Werkbank');
  const id = await createItem(page, 'Lötkolben', loc);
  await createItem(page, 'Multimeter', loc);
  await page.goto(`/items/${id}`);
  await page.getByRole('button', { name: /^Tag hinzufügen/ }).click();
  await page.getByRole('option', { name: 'Electronics' }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('app-item-detail app-tag-chip')).toContainText('Electronics');
  // The change is saved: it is still there after a reload.
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(page.locator('app-item-detail app-tag-chip')).toContainText('Electronics');

  await page.goto('/tags');
  await page.getByRole('link', { name: 'Electronics' }).click();
  await page.getByRole('button', { name: 'Zuweisen' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: /Multimeter/ }).click();
  await expect(dialog.getByRole('button', { name: /Multimeter/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await dialog.getByRole('button', { name: 'Fertig' }).click();
  await expect(page.locator('app-tag-detail').getByRole('link', { name: 'Multimeter' })).toBeVisible();
});

test('row menu of the list deletes an item', async ({ signedIn: page }) => {
  const loc = await createLocation(page, 'Schuppen');
  await createItem(page, 'Rasenmäher', loc);
  await page.goto('/items');
  await page.getByRole('button', { name: 'Aktionen: Rasenmäher' }).click();
  await page.getByRole('menuitem', { name: 'Löschen' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Löschen' }).click();
  await expect(page.getByRole('link', { name: 'Rasenmäher' })).toHaveCount(0);
});

test('the trailing area of a list row opens the item', async ({ signedIn: page }) => {
  const loc = await createLocation(page, 'Flur');
  await createItem(page, 'Staubsauger', loc);
  await page.goto('/items');
  const link = page.getByRole('link', { name: 'Staubsauger' });
  await expect(link).toBeVisible();
  // Click left of the row menu, in the trailing slot where tags and quantity sit.
  const menu = page.getByRole('button', { name: /Aktionen: Staubsauger/ });
  const box = (await menu.boundingBox())!;
  await page.mouse.click(box.x - 30, box.y + box.height / 2);
  await expect(page).toHaveURL(/\/items\/[0-9a-f-]+/);
});

test('a sub-item shows under its parent item and keeps both in its editor', async ({
  signedIn: page,
}) => {
  const home = await createLocation(page, 'Downstairs');
  const parent = await createItem(page, 'Ecolink Sensor', home);
  const child = await createItem(page, 'Batterie', parent);

  await page.goto(`/items/${parent}`);
  const subs = page.getByRole('region', { name: 'Enthaltene Gegenstände' });
  await expect(subs.getByRole('link', { name: /Batterie/ })).toBeVisible();

  await page.goto(`/items/${child}`);
  const facts = page.locator('app-item-detail app-field-group').first();
  await expect(facts).toContainText('Downstairs');
  await expect(facts).toContainText('Übergeordneter Gegenstand');
  await page.getByRole('button', { name: 'Bearbeiten' }).first().click();
  const editor = page.locator('app-item-edit');
  await expect(editor.getByRole('combobox', { name: /^Ort/ })).toContainText('Downstairs');
  await expect(editor).toContainText('Ecolink Sensor');
});
