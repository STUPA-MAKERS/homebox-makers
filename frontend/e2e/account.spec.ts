import { expect, login, newAccount, register, test } from './fixtures';

test('create and revoke an API key', async ({ signedIn: page }) => {
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Neuer Schlüssel' }).click();
  await page.getByRole('dialog').getByLabel('Name').fill('Backup-Skript');
  await page.getByRole('dialog').getByRole('button', { name: 'Anlegen' }).click();
  await expect(page.getByRole('dialog').locator('code')).toHaveText(/\S{20,}/);
  await page.getByRole('dialog').getByRole('button', { name: 'Schließen' }).last().click();

  await expect(page.getByText('Backup-Skript')).toBeVisible();
  await page.getByRole('button', { name: 'Aktionen' }).click();
  await page.getByRole('menuitem', { name: 'Widerrufen' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Widerrufen' }).click();
  await expect(page.getByText('Backup-Skript')).toHaveCount(0);
});

test('invite a second user who joins the collection', async ({
  signedIn: page,
  account,
  browser,
}) => {
  await page.goto('/collection');
  await page.getByRole('button', { name: 'Einladung', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Anlegen' }).click();
  const link = (await page.getByRole('dialog').locator('code').textContent())!.trim();
  await page.getByRole('dialog').getByRole('button', { name: 'Schließen' }).last().click();
  expect(link).toContain('?token=');

  const guest = newAccount();
  const other = await browser.newContext({ locale: 'de-DE' });
  const guestPage = await other.newPage();
  await register(guestPage.request, guest);
  await login(guestPage, guest);
  await guestPage.goto(link.replace(/^https?:\/\/[^/]+/, ''));
  await guestPage.waitForURL('**/collection**');
  await guestPage.getByRole('dialog').getByRole('button', { name: 'Beitreten' }).click();
  // The app reloads in the joined collection.
  await expect(
    guestPage.locator('app-page-header').filter({ hasText: account.name }).first(),
  ).toBeVisible();
  await other.close();

  await page.reload();
  await expect(page.getByText(guest.email)).toBeVisible();
});
