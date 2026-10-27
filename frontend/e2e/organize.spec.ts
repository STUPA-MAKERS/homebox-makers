import { createItem, createLocation, expect, test } from './fixtures';

test('locations nest and show their items', async ({ signedIn: page }) => {
  const house = await createLocation(page, 'Haus');
  const room = await createLocation(page, 'Arbeitszimmer', house);
  await createItem(page, 'Monitor', room);

  await page.goto('/locations');
  await page.getByRole('link', { name: 'Haus' }).click();
  // The detail opens beside the tree of all locations.
  const detail = page.locator('app-location-detail');
  await expect(detail.getByRole('link', { name: 'Arbeitszimmer' })).toBeVisible();
  await expect(detail.getByText('Hier liegt noch nichts.')).toBeVisible();

  await detail.getByRole('link', { name: 'Arbeitszimmer' }).click();
  await expect(detail.getByRole('navigation', { name: 'Ablageort' })).toContainText('Haus');
  await expect(detail.getByRole('link', { name: 'Monitor' })).toBeVisible();
});

test('create a tag, give it to an item and find the item under the tag', async ({
  signedIn: page,
}) => {
  const loc = await createLocation(page, 'Regal');
  const item = await createItem(page, 'Lötstation', loc);

  await page.goto('/tags');
  await page.getByRole('button', { name: 'Tag anlegen' }).click();
  await page.getByRole('dialog').getByLabel('Name').fill('Elektronik');
  await page.getByRole('dialog').getByRole('button', { name: 'Anlegen' }).click();
  await page.waitForURL('**/tags/*');
  await expect(page.getByRole('heading', { name: 'Elektronik' })).toBeVisible();

  await page.goto(`/items/${item}`);
  await page.getByRole('button', { name: 'Bearbeiten' }).first().click();
  const pane = page.getByRole('dialog', { name: 'Gegenstand bearbeiten' });
  await pane.getByRole('button', { name: /^Tag hinzufügen/ }).click();
  await page.getByRole('option', { name: 'Elektronik' }).click();
  await page.keyboard.press('Escape');
  await pane.getByRole('button', { name: 'Speichern' }).click();
  await expect(pane).toHaveCount(0);

  await page.getByRole('link', { name: 'Elektronik' }).click();
  await expect(page.getByRole('link', { name: 'Lötstation' })).toBeVisible();
});
