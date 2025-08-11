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

	test('$env/dynamic/private is not statically importable from the client', async ({ page }) => {
		await page.goto('/illegal-imports/env/dynamic-private', {
			wait_for_started: false
		});
		expect(await page.textContent('.message-body'))
			.toBe(`Cannot import $env/dynamic/private into client-side code. This could leak sensitive information.
Imported by: src/routes/illegal-imports/env/dynamic-private/+page.svelte.
Tips:
 - To resolve this error, ensure that no exports from $env/dynamic/private are used, even transitively, in client-side code.
 - If you're only using the import as a type, change it to \`import type\`.
 - If you're not sure which module is causing this, try building your app -- it will create a more helpful error.`);
	});

	test('$env/dynamic/private is not dynamically importable from the client', async ({ page }) => {
		await page.goto('/illegal-imports/env/dynamic-private-dynamic-import', {
			wait_for_started: false
		});
		expect(await page.textContent('.message-body'))
			.toBe(`Cannot import $env/dynamic/private into client-side code. This could leak sensitive information.
Imported by: src/routes/illegal-imports/env/dynamic-private-dynamic-import/+page.svelte.
Tips:
 - To resolve this error, ensure that no exports from $env/dynamic/private are used, even transitively, in client-side code.
 - If you're only using the import as a type, change it to \`import type\`.
 - If you're not sure which module is causing this, try building your app -- it will create a more helpful error.`);
	});

	test('$env/static/private is not statically importable from the client', async ({ page }) => {
		await page.goto('/illegal-imports/env/static-private', {
			wait_for_started: false
		});
		expect(await page.textContent('.message-body'))
			.toBe(`Cannot import $env/static/private into client-side code. This could leak sensitive information.
Imported by: src/routes/illegal-imports/env/static-private/+page.svelte.
Tips:
 - To resolve this error, ensure that no exports from $env/static/private are used, even transitively, in client-side code.
 - If you're only using the import as a type, change it to \`import type\`.
 - If you're not sure which module is causing this, try building your app -- it will create a more helpful error.`);
	});

	test('$env/static/private is not dynamically importable from the client', async ({ page }) => {
		await page.goto('/illegal-imports/env/static-private-dynamic-import', {
			wait_for_started: false
		});
		expect(await page.textContent('.message-body'))
			.toBe(`Cannot import $env/static/private into client-side code. This could leak sensitive information.
Imported by: src/routes/illegal-imports/env/static-private-dynamic-import/+page.svelte.
Tips:
 - To resolve this error, ensure that no exports from $env/static/private are used, even transitively, in client-side code.
 - If you're only using the import as a type, change it to \`import type\`.
 - If you're not sure which module is causing this, try building your app -- it will create a more helpful error.`);
	});

	test('server-only module is not statically importable from the client', async ({ page }) => {
		await page.goto('/illegal-imports/server-only-modules/static-import', {
			wait_for_started: false
		});
		expect(await page.textContent('.message-body'))
			.toBe(`Cannot import src/routes/illegal-imports/server-only-modules/illegal.server.js into client-side code. This could leak sensitive information.
Tips:
 - To resolve this error, ensure that no exports from src/routes/illegal-imports/server-only-modules/illegal.server.js are used, even transitively, in client-side code.
 - If you're only using the import as a type, change it to \`import type\`.
 - If you're not sure which module is causing this, try building your app -- it will create a more helpful error.`);
	});

	test('$app/server module is not statically importable from the client', async ({ page }) => {
		await page.goto('/illegal-imports/server-only-modules/static-import-2', {
			wait_for_started: false
		});
		expect(await page.textContent('.message-body'))
			.toBe(`Cannot import $app/server into client-side code. This could leak sensitive information.
Tips:
 - To resolve this error, ensure that no exports from $app/server are used, even transitively, in client-side code.
 - If you're only using the import as a type, change it to \`import type\`.
 - If you're not sure which module is causing this, try building your app -- it will create a more helpful error.`);
	});

	test('server-only module is not dynamically importable from the client', async ({ page }) => {
		await page.goto('/illegal-imports/server-only-modules/dynamic-import', {
			wait_for_started: false
		});
		expect(await page.textContent('.message-body'))
			.toBe(`Cannot import src/routes/illegal-imports/server-only-modules/illegal.server.js into client-side code. This could leak sensitive information.
Tips:
 - To resolve this error, ensure that no exports from src/routes/illegal-imports/server-only-modules/illegal.server.js are used, even transitively, in client-side code.
 - If you're only using the import as a type, change it to \`import type\`.
 - If you're not sure which module is causing this, try building your app -- it will create a more helpful error.`);
	});

	test('server-only folder is not statically importable from the client', async ({ page }) => {
		await page.goto('/illegal-imports/server-only-folder/static-import', {
			wait_for_started: false
		});
		expect(await page.textContent('.message-body'))
			.toBe(`Cannot import $lib/server/blah/private.js into client-side code. This could leak sensitive information.
Tips:
 - To resolve this error, ensure that no exports from $lib/server/blah/private.js are used, even transitively, in client-side code.
 - If you're only using the import as a type, change it to \`import type\`.
 - If you're not sure which module is causing this, try building your app -- it will create a more helpful error.`);
	});

	test('server-only folder is not dynamically importable from the client', async ({ page }) => {
		await page.goto('/illegal-imports/server-only-folder/dynamic-import', {
			wait_for_started: false
		});
		expect(await page.textContent('.message-body'))
			.toBe(`Cannot import $lib/server/blah/private.js into client-side code. This could leak sensitive information.
Tips:
 - To resolve this error, ensure that no exports from $lib/server/blah/private.js are used, even transitively, in client-side code.
 - If you're only using the import as a type, change it to \`import type\`.
 - If you're not sure which module is causing this, try building your app -- it will create a more helpful error.`);
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
