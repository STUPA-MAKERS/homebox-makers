import { api, createItem, createLocation, expect, test } from './fixtures';

function isoDay(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

test('maintenance groups entries by due date and marks one done from its sheet', async ({
  signedIn: page,
}) => {
  const home = await createLocation(page, 'Küche');
  const id = await createItem(page, 'Kaffeemaschine', home);
  const entry = (body: object) =>
    api(page, 'post', `/entities/${id}/maintenance`, {
      description: '',
      cost: '0',
      completedDate: '',
      ...body,
    });
  await entry({ name: 'Entkalken', scheduledDate: isoDay(-3), description: 'Mit Zitronensäure' });
  await entry({ name: 'Dichtung prüfen', scheduledDate: isoDay(10) });
  await entry({ name: 'Filter getauscht', scheduledDate: isoDay(-40), completedDate: isoDay(-38) });

  await page.goto('/maintenance');
  const overdue = page.getByRole('region', { name: /Überfällig/ });
  await expect(overdue).toContainText('Entkalken');
  await expect(overdue).toContainText('seit 3 Tagen');
  await expect(page.getByRole('region', { name: /Nächste 30 Tage/ })).toContainText(
    'Dichtung prüfen',
  );
  // Done entries only under "Erledigt" or "Alle".
  await expect(page.getByText('Filter getauscht')).toHaveCount(0);

  await overdue.getByRole('link', { name: /Entkalken/ }).click();
  await page.waitForURL(/\/maintenance\/[0-9a-f-]+$/);
  const sheet = page.locator('app-maintenance-detail');
  await expect(sheet.getByRole('heading', { name: 'Entkalken' })).toBeVisible();
  await expect(sheet).toContainText('Mit Zitronensäure');
  await expect(sheet).toContainText('Filter getauscht');

  await page.getByRole('button', { name: 'Als erledigt markieren' }).click();
  await expect(page.getByRole('button', { name: 'Als erledigt markieren' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: /Überfällig/ })).toHaveCount(0);
});

test('plan maintenance for an item from the list', async ({ signedIn: page }) => {
  const home = await createLocation(page, 'Garage');
  await createItem(page, 'Fahrrad', home);

  await page.goto('/maintenance');
  await expect(page.getByText('Noch keine Wartung geplant').first()).toBeVisible();
  await page.getByRole('button', { name: 'Wartung planen' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox', { name: 'Gegenstand' }).fill('Fahr');
  await page.getByRole('option', { name: /Fahrrad/ }).click();
  await dialog.getByLabel('Name').fill('Kette ölen');
  await dialog.getByRole('button', { name: 'Planen' }).click();

  await page.waitForURL(/\/maintenance\/[0-9a-f-]+$/);
  await expect(page.locator('app-maintenance-detail')).toContainText('Fahrrad');
  await expect(page.getByRole('region', { name: /Nächste 30 Tage/ })).toContainText('Kette ölen');
});
