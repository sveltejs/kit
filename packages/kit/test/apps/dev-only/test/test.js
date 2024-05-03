import { expect } from '@playwright/test';
import { test } from '../../../utils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @typedef {import('@playwright/test').Response} Response */

test.describe.serial('Illegal imports', () => {
	test.skip(({ javaScriptEnabled }) => !process.env.DEV || !javaScriptEnabled);

	test('$env/dynamic/private is not statically importable from the client', async ({ page }) => {
		await page.goto('/illegal-imports/env/dynamic-private', {
			wait_for_started: false
		});
		expect(await page.textContent('.message-body')).toBe(
			'Cannot import $env/dynamic/private into client-side code'
		);
	});

	test('$env/dynamic/private is not dynamically importable from the client', async ({ page }) => {
		await page.goto('/illegal-imports/env/dynamic-private-dynamic-import', {
			wait_for_started: false
		});
		expect(await page.textContent('.message-body')).toBe(
			'Cannot import $env/dynamic/private into client-side code'
		);
	});

	test('$env/static/private is not statically importable from the client', async ({ page }) => {
		await page.goto('/illegal-imports/env/static-private', {
			wait_for_started: false
		});
		expect(await page.textContent('.message-body')).toBe(
			'Cannot import $env/static/private into client-side code'
		);
	});

	test('$env/static/private is not dynamically importable from the client', async ({ page }) => {
		await page.goto('/illegal-imports/env/static-private-dynamic-import', {
			wait_for_started: false
		});
		expect(await page.textContent('.message-body')).toBe(
			'Cannot import $env/static/private into client-side code'
		);
	});

	test('server-only module is not statically importable from the client', async ({ page }) => {
		await page.goto('/illegal-imports/server-only-modules/static-import', {
			wait_for_started: false
		});
		expect(await page.textContent('.message-body')).toBe(
			'Cannot import src/routes/illegal-imports/server-only-modules/illegal.server.js into client-side code'
		);
	});

	test('server-only module is not dynamically importable from the client', async ({ page }) => {
		await page.goto('/illegal-imports/server-only-modules/dynamic-import', {
			wait_for_started: false
		});
		expect(await page.textContent('.message-body')).toBe(
			'Cannot import src/routes/illegal-imports/server-only-modules/illegal.server.js into client-side code'
		);
	});

	test('server-only folder is not statically importable from the client', async ({ page }) => {
		await page.goto('/illegal-imports/server-only-folder/static-import', {
			wait_for_started: false
		});
		expect(await page.textContent('.message-body')).toBe(
			'Cannot import $lib/server/blah/private.js into client-side code'
		);
	});

	test('server-only folder is not dynamically importable from the client', async ({ page }) => {
		await page.goto('/illegal-imports/server-only-folder/dynamic-import', {
			wait_for_started: false
		});
		expect(await page.textContent('.message-body')).toBe(
			'Cannot import $lib/server/blah/private.js into client-side code'
		);
	});
});

test.describe('Vite', () => {
	test.skip(({ javaScriptEnabled }) => !process.env.DEV || !javaScriptEnabled);

	test('optimizes dependencies', async ({ page }) => {
		await page.goto('/');
		expect(page.locator('p')).toHaveText('hello world!');

		const manifest_path = path.join(__dirname, '../node_modules/.vite/deps/_metadata.json');
		const manifest = JSON.parse(fs.readFileSync(manifest_path, 'utf-8'));

		expect(manifest).toHaveProperty('optimized.e2e-test-dep-cjs-only');
	});
});
