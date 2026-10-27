import { api, createItem, createLocation, expect, test } from './fixtures';

test('entity types and templates', async ({ signedIn: page }) => {
  await page.goto('/collection/templates');
  await page.getByRole('button', { name: 'Vorlage anlegen' }).click();
  await page.getByRole('dialog').getByLabel('Name').fill('Werkzeug-Vorlage');
  await page.getByRole('dialog').getByRole('button', { name: 'Anlegen' }).click();
  await page.waitForURL('**/collection/templates/*');
  await page.getByRole('button', { name: 'Speichern' }).click();
  await page.waitForURL('**/collection/templates');
  await expect(page.getByRole('link', { name: /Werkzeug-Vorlage/ })).toBeVisible();

  await page.goto('/collection/types');
  await page.getByRole('button', { name: 'Neuer Typ' }).first().click();
  await page.getByRole('dialog').getByLabel('Name').fill('Akkuschrauber');
  await page.getByRole('dialog').getByRole('button', { name: 'Speichern' }).click();
  await expect(page.getByText('Akkuschrauber')).toBeVisible();
});

test('notifiers and backups', async ({ signedIn: page }) => {
  await page.goto('/collection/notifiers');
  await page.getByRole('button', { name: 'Benachrichtigung anlegen' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name').fill('Telefon');
  // The server resolves the host of a notifier URL; an address needs no DNS in CI.
  await dialog.getByLabel('Shoutrrr-URL').fill('ntfy://93.184.215.14/homebox');
  await dialog.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.getByText('Telefon')).toBeVisible();

  await page.goto('/collection/tools');
  await page.getByRole('button', { name: 'Sicherung erstellen' }).click();
  await expect(page.getByText('Fertig').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('link', { name: 'Herunterladen' })).toBeVisible();
});

test('global search finds items, places and pages', async ({ signedIn: page }) => {
  const loc = await createLocation(page, 'Dachboden');
  await createItem(page, 'Christbaumschmuck', loc);
  await page.goto('/home');
  await page.getByRole('button', { name: 'Suche' }).click();
  const dialog = page.getByRole('dialog', { name: 'Suche' });
  await dialog.getByRole('combobox').fill('christ');
  await dialog.getByRole('option', { name: /Christbaumschmuck/ }).click();
  await expect(page).toHaveURL(/\/items\//);
  await expect(page.getByRole('heading', { name: 'Christbaumschmuck' })).toBeVisible();

  await page.keyboard.press('Control+k');
  await dialog.getByRole('combobox').fill('werkz');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/collection\/tools/);
});

test('create an item from a template', async ({ signedIn: page }) => {
  await createLocation(page, 'Werkstatt');
  await api(page, 'post', '/templates', {
    name: 'Bosch-Werkzeug',
    description: '',
    notes: '',
    fields: [],
    defaultName: 'Bosch ',
    defaultManufacturer: 'Bosch',
    defaultInsured: false,
    defaultLifetimeWarranty: false,
    defaultQuantity: 1,
    includePurchaseFields: false,
    includeSoldFields: false,
    includeWarrantyFields: false,
  });

  await page.goto('/items');
  await page.getByRole('button', { name: 'Gegenstand anlegen' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox', { name: 'Vorlage' }).click();
  await page.getByRole('option', { name: 'Bosch-Werkzeug' }).click();
  await expect(dialog.getByLabel('Name')).toHaveValue('Bosch ');
  await dialog.getByLabel('Name').fill('Bosch Stichsäge');
  await dialog.getByRole('combobox', { name: /Ort/ }).click();
  await page.getByRole('option', { name: 'Werkstatt' }).click();
  await dialog.getByRole('button', { name: 'Anlegen' }).click();
  await page.waitForURL('**/items/*');
  await expect(page.locator('app-item-detail')).toContainText('Bosch');
  await expect(page.getByRole('heading', { name: 'Bosch Stichsäge' })).toBeVisible();
});
