import { expect, login, newAccount, register, test } from './fixtures';

test('register, sign out and sign in again', async ({ page }) => {
  const account = newAccount();
  await page.goto('/login');
  await page.getByRole('button', { name: 'Registrieren' }).click();
  await page.getByLabel('Name').fill(account.name);
  await page.getByLabel('E‑Mail').fill(account.email);
  await page.locator('input[type=password]').fill(account.password);
  await page.locator('form button[type=submit]').click();

  // Registration signs in right away.
  await page.waitForURL('**/home');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(account.name);

  await page.getByRole('button', { name: new RegExp(`Konto: ${account.name}`) }).click();
  await page.getByRole('button', { name: 'Abmelden' }).click();
  await page.waitForURL('**/login**');

  await login(page, account);
});

test('a wrong password is refused', async ({ page, request }) => {
  const account = newAccount();
  await register(request, account);
  await page.goto('/login');
  await page.getByLabel('E‑Mail').fill(account.email);
  await page.locator('input[type=password]').fill('wrong-password');
  await page.locator('form button[type=submit]').click();
  await expect(page.getByText('Anmeldung fehlgeschlagen')).toBeVisible();
});

test('a page behind the login redirects back after signing in', async ({ page, request }) => {
  const account = newAccount();
  await register(request, account);
  await page.goto('/tags');
  await page.waitForURL('**/login?redirect=%2Ftags');
  await page.getByLabel('E‑Mail').fill(account.email);
  await page.locator('input[type=password]').fill(account.password);
  await page.locator('form button[type=submit]').click();
  await page.waitForURL('**/tags');
});
