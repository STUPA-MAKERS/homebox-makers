import { expect, test } from './fixtures';

test('entity types and templates', async ({ signedIn: page }) => {
  await page.goto('/collection/templates');
  await page.getByRole('button', { name: 'Neue Vorlage' }).click();
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
  await page.getByRole('button', { name: 'Neue Benachrichtigung' }).click();
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
