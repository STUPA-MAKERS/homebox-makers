import { type APIRequestContext, type Page, expect, test as base } from '@playwright/test';

export interface Account {
  name: string;
  email: string;
  password: string;
}

/** A fresh account per test, so the tests run in parallel without sharing data. */
export function newAccount(): Account {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return { name: `E2E ${id}`, email: `e2e-${id}@example.com`, password: 'password1234' };
}

export async function register(
  request: APIRequestContext,
  account: Account,
  token = '',
): Promise<void> {
  const res = await request.post('/api/v1/users/register', {
    data: { name: account.name, email: account.email, password: account.password, token },
  });
  expect(res.ok(), `register ${account.email}: ${res.status()}`).toBeTruthy();
}

export async function login(page: Page, account: Account): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('E‑Mail').fill(account.email);
  await page.locator('input[type=password]').fill(account.password);
  await page.locator('form button[type=submit]').click();
  await page.waitForURL('**/home');
}

/** The API cookie of the page's context, for requests that set up test data. */
export async function api(
  page: Page,
  method: 'get' | 'post' | 'put',
  path: string,
  data?: unknown,
) {
  const res = await page.request[method](`/api/v1${path}`, data === undefined ? {} : { data });
  expect(res.ok(), `${method.toUpperCase()} ${path}: ${res.status()}`).toBeTruthy();
  return res.status() === 204 ? null : res.json();
}

/** A signed-in page with an empty collection of its own. */
export const test = base.extend<{ account: Account; signedIn: Page }>({
  // eslint-disable-next-line no-empty-pattern -- Playwright fixtures take their dependencies as the first argument.
  account: async ({}, use) => {
    await use(newAccount());
  },
  signedIn: async ({ page, request, account }, use) => {
    await register(request, account);
    await login(page, account);
    await use(page);
  },
});

export { expect };

/** Create a location through the API and return its id. */
export async function createLocation(
  page: Page,
  name: string,
  parentId: string | null = null,
): Promise<string> {
  const types = (await api(page, 'get', '/entity-types')) as { id: string; isLocation: boolean }[];
  const type = types.find((t) => t.isLocation)!;
  const loc = (await api(page, 'post', '/entities', {
    name,
    description: '',
    entityTypeId: type.id,
    parentId,
    quantity: 1,
  })) as { id: string };
  return loc.id;
}

/** Create an item in a location through the API and return its id. */
export async function createItem(
  page: Page,
  name: string,
  parentId: string,
  extra: object = {},
): Promise<string> {
  const types = (await api(page, 'get', '/entity-types')) as { id: string; isLocation: boolean }[];
  const type = types.find((t) => !t.isLocation)!;
  const item = (await api(page, 'post', '/entities', {
    name,
    description: '',
    entityTypeId: type.id,
    parentId,
    quantity: 1,
    ...extra,
  })) as { id: string };
  return item.id;
}
