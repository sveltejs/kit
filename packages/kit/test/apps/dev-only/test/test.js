import { expect } from '@playwright/test';
import { test } from '../../../utils.js';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @typedef {import('@playwright/test').Response} Response */

test.describe.serial('Illegal imports', () => {
	test.skip(({ javaScriptEnabled }) => !process.env.DEV || !javaScriptEnabled);

	test('$env/dynamic/private is not importable from the client', async ({ page }) => {
		await page.goto('/illegal-imports/env/dynamic-private', {
			wait_for_started: false
		});
		expect(await page.textContent('.message-body'))
			.toBe(`Cannot import $env/dynamic/private into code that runs in the browser, as this could leak sensitive information.

 src/routes/illegal-imports/env/dynamic-private/+page.svelte imports
  $env/dynamic/private

If you're only using the import as a type, change it to \`import type\`.`);
	});

	test('$env/static/private is not importable from the client', async ({ page }) => {
		await page.goto('/illegal-imports/env/static-private', {
			wait_for_started: false
		});
		expect(await page.textContent('.message-body'))
			.toBe(`Cannot import $env/static/private into code that runs in the browser, as this could leak sensitive information.

 src/routes/illegal-imports/env/static-private/+page.svelte imports
  $env/static/private

If you're only using the import as a type, change it to \`import type\`.`);
	});

	test('server-only module is not importable from the client', async ({ page }) => {
		await page.goto('/illegal-imports/server-only-modules/static-import', {
			wait_for_started: false
		});
		expect(await page.textContent('.message-body'))
			.toBe(`Cannot import src/routes/illegal-imports/server-only-modules/illegal.server.js into code that runs in the browser, as this could leak sensitive information.

 src/routes/illegal-imports/server-only-modules/static-import/+page.svelte imports
  src/routes/illegal-imports/server-only-modules/static-import/foo.js imports
   src/routes/illegal-imports/server-only-modules/illegal.server.js

If you're only using the import as a type, change it to \`import type\`.`);
	});

	test('$app/server module is not importable from the client', async ({ page }) => {
		await page.goto('/illegal-imports/server-only-modules/static-import-2', {
			wait_for_started: false
		});
		expect(await page.textContent('.message-body'))
			.toBe(`Cannot import $app/server into code that runs in the browser, as this could leak sensitive information.

 src/routes/illegal-imports/server-only-modules/static-import-2/+page.svelte imports
  $app/server

If you're only using the import as a type, change it to \`import type\`.`);
	});

	test('server-only folder is not importable from the client', async ({ page }) => {
		await page.goto('/illegal-imports/server-only-folder/static-import', {
			wait_for_started: false
		});
		expect(await page.textContent('.message-body'))
			.toBe(`Cannot import $lib/server/blah/private.js into code that runs in the browser, as this could leak sensitive information.

 src/routes/illegal-imports/server-only-folder/static-import/+page.svelte imports
  $lib/server/blah/private.js

If you're only using the import as a type, change it to \`import type\`.`);
	});
});

test.describe('Vite', () => {
	test.skip(({ javaScriptEnabled }) => !process.env.DEV || !javaScriptEnabled);

	test('optimizes +page.svelte dependencies', async ({ page }) => {
		await page.goto('/');
		await page.getByText('hello world!').waitFor();

		const manifest_path = path.join(__dirname, '../node_modules/.vite/deps/_metadata.json');
		const manifest = JSON.parse(fs.readFileSync(manifest_path, 'utf-8'));

		expect(manifest).toHaveProperty('optimized.e2e-test-dep-page-svelte');
	});

	test('optimizes +page.js dependencies', async ({ page }) => {
		await page.goto('/');
		await page.getByText('hello world!').waitFor();

		const manifest_path = path.join(__dirname, '../node_modules/.vite/deps/_metadata.json');
		const manifest = JSON.parse(fs.readFileSync(manifest_path, 'utf-8'));

		expect(manifest).toHaveProperty('optimized.e2e-test-dep-page-universal');
	});

	test('skips optimizing +page.server.js dependencies', async ({ page }) => {
		await page.goto('/');
		await page.getByText('hello world!').waitFor();

		const manifest_path = path.join(__dirname, '../node_modules/.vite/deps/_metadata.json');
		const manifest = JSON.parse(fs.readFileSync(manifest_path, 'utf-8'));

		expect(manifest).not.toHaveProperty('optimized.e2e-test-dep-page-server');
	});

	test('optimizes +layout.svelte dependencies', async ({ page }) => {
		await page.goto('/');
		await page.getByText('hello world!').waitFor();

		const manifest_path = path.join(__dirname, '../node_modules/.vite/deps/_metadata.json');
		const manifest = JSON.parse(fs.readFileSync(manifest_path, 'utf-8'));

		expect(manifest).toHaveProperty('optimized.e2e-test-dep-layout-svelte');
	});

	test('optimizes +layout.js dependencies', async ({ page }) => {
		await page.goto('/');
		await page.getByText('hello world!').waitFor();

		const manifest_path = path.join(__dirname, '../node_modules/.vite/deps/_metadata.json');
		const manifest = JSON.parse(fs.readFileSync(manifest_path, 'utf-8'));

		expect(manifest).toHaveProperty('optimized.e2e-test-dep-layout-universal');
	});

	test('skips optimizing +layout.server.js dependencies', async ({ page }) => {
		await page.goto('/');
		await page.getByText('hello world!').waitFor();

		const manifest_path = path.join(__dirname, '../node_modules/.vite/deps/_metadata.json');
		const manifest = JSON.parse(fs.readFileSync(manifest_path, 'utf-8'));

		expect(manifest).not.toHaveProperty('optimized.e2e-test-dep-layout-server');
	});

	test('optimizes +error.svelte dependencies', async ({ page }) => {
		await page.goto('/');
		await page.getByText('hello world!').waitFor();

		const manifest_path = path.join(__dirname, '../node_modules/.vite/deps/_metadata.json');
		const manifest = JSON.parse(fs.readFileSync(manifest_path, 'utf-8'));

		expect(manifest).toHaveProperty('optimized.e2e-test-dep-error');
	});

	test('optimizes hooks.client.js dependencies', async ({ page }) => {
		await page.goto('/');
		await page.getByText('hello world!').waitFor();

		const manifest_path = path.join(__dirname, '../node_modules/.vite/deps/_metadata.json');
		const manifest = JSON.parse(fs.readFileSync(manifest_path, 'utf-8'));

		expect(manifest).toHaveProperty('optimized.e2e-test-dep-hooks-client');
	});

	test('optimizes hooks.js dependencies', async ({ page }) => {
		await page.goto('/');
		await page.getByText('hello world!').waitFor();

		const manifest_path = path.join(__dirname, '../node_modules/.vite/deps/_metadata.json');
		const manifest = JSON.parse(fs.readFileSync(manifest_path, 'utf-8'));

		expect(manifest).toHaveProperty('optimized.e2e-test-dep-hooks');
	});
});

test.describe('request abort', () => {
	test.skip(({ javaScriptEnabled }) => !process.env.DEV || !javaScriptEnabled);

	test('request.signal fires abort event', async ({ page }) => {
		await page.goto('/request-abort');
		await page.waitForTimeout(200);
		expect(await page.innerText('pre')).toBe('{"aborted":true}');
	});
});
