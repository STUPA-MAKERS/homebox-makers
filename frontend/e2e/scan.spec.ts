import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { api, createItem, createLocation, expect, login, test } from './fixtures';

test.describe('scanner', () => {
  test('a typed asset id opens the hit card and lands in the recent scans', async ({
    signedIn: page,
  }) => {
    const home = await createLocation(page, 'Werkstatt');
    const id = await createItem(page, 'Akkuschrauber', home);
    const item = (await api(page, 'get', `/entities/${id}`)) as { assetId: string };

    await page.goto('/scan');
    const pill = page.getByRole('searchbox', { name: 'Inventarnummer oder Code' });
    await pill.fill(item.assetId);
    await pill.press('Enter');

    const hit = page.getByRole('status').filter({ hasText: 'Akkuschrauber' });
    await expect(hit).toBeVisible();
    await expect(hit).toContainText('Werkstatt');
    await expect(page.locator('.sc__recent')).toContainText('Akkuschrauber');

    await hit.getByRole('link', { name: 'Öffnen' }).click();
    await page.waitForURL(`**/items/${id}`);
  });

  test('the hit moves the item and opens a new maintenance entry', async ({
    signedIn: page,
  }) => {
    const home = await createLocation(page, 'Werkstatt');
    await createLocation(page, 'Dachboden');
    const id = await createItem(page, 'Leiter', home);
    const item = (await api(page, 'get', `/entities/${id}`)) as { assetId: string };

    await page.goto('/scan');
    const pill = page.getByRole('searchbox', { name: 'Inventarnummer oder Code' });
    await pill.fill(item.assetId);
    await pill.press('Enter');
    const hit = page.getByRole('status').filter({ hasText: 'Leiter' });
    await hit.getByRole('button', { name: 'Verschieben' }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByRole('combobox', { name: /Neuer Ort/ }).click();
    await page.getByRole('option', { name: 'Dachboden' }).click();
    await dialog.getByRole('button', { name: 'Verschieben' }).click();
    await expect(hit).toContainText('Dachboden');
    const moved = (await api(page, 'get', `/entities/${id}`)) as { parent: { name: string } };
    expect(moved.parent.name).toBe('Dachboden');

    await hit.getByRole('button', { name: 'Wartung' }).click();
    await page.waitForURL(`**/items/${id}`);
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page).not.toHaveURL(/maintenance=new/);
  });

  test('an unknown code says so', async ({ signedIn: page }) => {
    await page.goto('/scan');
    const pill = page.getByRole('searchbox', { name: 'Inventarnummer oder Code' });
    await pill.fill('4006381333931');
    await pill.press('Enter');
    await expect(page.getByRole('status').filter({ hasText: 'Nichts gefunden' })).toBeVisible();
  });

  // The camera for real: Chromium's fake camera plays the printed label of an item, the
  // scanner reads its QR code and shows the item.
  test('the camera reads the QR code of a printed label', async ({ signedIn: page, account }) => {
    test.setTimeout(90_000);
    const home = await createLocation(page, 'Keller');
    const id = await createItem(page, 'Bohrmaschine', home);

    const label = await page.request.get(`/api/v1/labelmaker/item/${id}`);
    expect(label.ok()).toBeTruthy();
    const dir = mkdtempSync(join(tmpdir(), 'hb-scan-'));
    const png = join(dir, 'label.png');
    const video = join(dir, 'label.y4m');
    writeFileSync(png, await label.body());
    execFileSync('ffmpeg', [
      '-loglevel', 'error', '-y', '-loop', '1', '-i', png,
      '-vf', 'scale=560:-2,pad=640:480:(ow-iw)/2:(oh-ih)/2:white,format=yuv420p',
      '-t', '2', '-r', '10', video,
    ]);

    const browser = await chromium.launch({
      executablePath: process.env['PW_CHROMIUM_PATH'] || undefined,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        `--use-file-for-fake-video-capture=${video}`,
      ],
    });
    try {
      const context = await browser.newContext({
        baseURL: test.info().project.use.baseURL,
        locale: 'de-DE',
        permissions: ['camera'],
      });
      const cam = await context.newPage();
      await login(cam, account);
      await cam.goto('/scan');
      const hit = cam.getByRole('status').filter({ hasText: 'Bohrmaschine' });
      // The fake camera and the decoder share the CPU with the other workers: give it time.
      await expect(hit).toBeVisible({ timeout: 40_000 });
      await expect(hit).toContainText('Keller');
      await expect(cam.locator('video.sc__video')).toHaveJSProperty('paused', false);
    } finally {
      await browser.close();
    }
  });
});
