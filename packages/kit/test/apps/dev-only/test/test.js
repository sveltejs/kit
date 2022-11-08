import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

/** @typedef {import('@playwright/test').Response} Response */

test.describe.configure({ mode: 'parallel' });

test.describe.serial.only('Illegal imports', () => {
	test.skip(() => !process.env.DEV);

	test.only('$env/dynamic/private is not statically importable from the client', async ({
		page
	}) => {
		await page.goto('/illegal-imports/env/dynamic-private');
		expect(await page.textContent('.message-body')).toBe(
			'Cannot import \0$env/dynamic/private into client-side code'
		);
	});

	test('$env/dynamic/private is not dynamically importable from the client', async ({ page }) => {
		await page.goto('/illegal-imports/env/dynamic-private-dynamic-import');
		expect(await page.textContent('.message-body')).toBe(
			'Cannot import \0$env/dynamic/private into client-side code'
		);
	});

	test('$env/static/private is not statically importable from the client', async ({ page }) => {
		await page.goto('/illegal-imports/env/static-private');
		expect(await page.textContent('.message-body')).toBe(
			'Cannot import \0$env/static/private into client-side code'
		);
	});

	test('$env/static/private is not dynamically importable from the client', async ({ page }) => {
		await page.goto('/illegal-imports/env/static-private-dynamic-import');
		expect(await page.textContent('.message-body')).toBe(
			'Cannot import \0$env/static/private into client-side code'
		);
	});

	test('server-only module is not statically importable from the client', async ({ page }) => {
		await page.goto('/illegal-imports/server-only-modules/static-import');
		expect(await page.textContent('.message-body')).toBe(
			'Cannot import src/routes/illegal-imports/server-only-modules/illegal.server.js into client-side code'
		);
	});

	test('server-only module is not dynamically importable from the client', async ({ page }) => {
		await page.goto('/illegal-imports/server-only-modules/dynamic-import');
		expect(await page.textContent('.message-body')).toBe(
			'Cannot import src/routes/illegal-imports/server-only-modules/illegal.server.js into client-side code'
		);
	});

	test('server-only folder is not statically importable from the client', async ({ page }) => {
		await page.goto('/illegal-imports/server-only-folder/static-import');
		expect(await page.textContent('.message-body')).toBe(
			'Cannot import $lib/server/blah/test.js into client-side code'
		);
	});

	test('server-only folder is not dynamically importable from the client', async ({ page }) => {
		await page.goto('/illegal-imports/server-only-folder/dynamic-import');
		expect(await page.textContent('.message-body')).toBe(
			'Cannot import $lib/server/blah/test.js into client-side code'
		);
	});
});
