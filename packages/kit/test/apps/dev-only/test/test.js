import { expect } from '../../../playwright-matchers.js';
import { test } from '../../../utils.js';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

/** @typedef {import('@playwright/test').Response} Response */

test.describe.serial('Illegal imports', () => {
	test.skip(({ javaScriptEnabled }) => !process.env.DEV || !javaScriptEnabled);

	for (const [location, module] of [
		['directory', '#lib/server/location.remote.js'],
		['filename', '#lib/location.server.remote.js']
	]) {
		test(`remote modules in a server-only ${location} report how to fix their location`, async ({
			page
		}) => {
			await page.goto(`/illegal-imports/remote-${location}`, { wait_for_started: false });
			const message = page.locator('vite-error-overlay .message-body');
			await expect(message).toBeVisible();
			expect(await message.innerText()).toContainKitDiagnostic('remote_module_server_only', {
				contains: [module]
			});
		});
	}

	test('$app/env/private is not importable from the client', async ({ page }) => {
		await page.goto('/illegal-imports/env/private', {
			wait_for_started: false
		});
		expect(await page.textContent('.message-body')).toBe(`server_only_import
Cannot import \`$app/env/private\` into code that runs in the browser, as this could leak sensitive information.

 src/routes/illegal-imports/env/private/+page.svelte imports
  $app/env/private

If you're only using the import as a type, change it to \`import type\`.
https://svelte.dev/e/kit/server_only_import`);
	});

	test('$app/server module is not importable from the client', async ({ page }) => {
		await page.goto('/illegal-imports/app-server', {
			wait_for_started: false
		});
		expect(await page.textContent('.message-body')).toBe(`server_only_import
Cannot import \`$app/server\` into code that runs in the browser, as this could leak sensitive information.

 src/routes/illegal-imports/app-server/+page.svelte imports
  $app/server

If you're only using the import as a type, change it to \`import type\`.
https://svelte.dev/e/kit/server_only_import`);
	});

	test('server-only module is not importable from the client', async ({ page }) => {
		await page.goto('/illegal-imports/server-only-modules/static-import', {
			wait_for_started: false
		});
		expect(await page.textContent('.message-body')).toBe(`server_only_import
Cannot import \`src/routes/illegal-imports/server-only-modules/illegal.server.js\` into code that runs in the browser, as this could leak sensitive information.

 src/routes/illegal-imports/server-only-modules/static-import/+page.svelte imports
  src/routes/illegal-imports/server-only-modules/static-import/foo.js imports
   src/routes/illegal-imports/server-only-modules/illegal.server.js

If you're only using the import as a type, change it to \`import type\`.
https://svelte.dev/e/kit/server_only_import`);
	});

	test('server-only folder is not importable from the client (relative import, nested server dir)', async ({
		page
	}) => {
		await page.goto('/illegal-imports/server-only-folder/relative-nested', {
			wait_for_started: false
		});
		expect(await page.textContent('.message-body')).toBe(`server_only_import
Cannot import \`#lib/nested/server/private.js\` into code that runs in the browser, as this could leak sensitive information.

 src/routes/illegal-imports/server-only-folder/relative-nested/+page.svelte imports
  #lib/nested/server/private.js

If you're only using the import as a type, change it to \`import type\`.
https://svelte.dev/e/kit/server_only_import`);
	});

	test('server-only folder is not importable from the client (path import, lib top level)', async ({
		page
	}) => {
		await page.goto('/illegal-imports/server-only-folder/path-top-level', {
			wait_for_started: false
		});
		expect(await page.textContent('.message-body')).toBe(`server_only_import
Cannot import \`#lib/server/blah/private.js\` into code that runs in the browser, as this could leak sensitive information.

 src/routes/illegal-imports/server-only-folder/path-top-level/+page.svelte imports
  #lib/server/blah/private.js

If you're only using the import as a type, change it to \`import type\`.
https://svelte.dev/e/kit/server_only_import`);
	});
});

test.describe('Vite', () => {
	test.skip(({ javaScriptEnabled }) => !process.env.DEV || !javaScriptEnabled);

	test('optimizes +page.svelte dependencies', async ({ page }) => {
		await page.goto('/');
		await page.getByText('hello world!').waitFor();

		const manifest_path = path.join(
			import.meta.dirname,
			'../node_modules/.vite/deps/_metadata.json'
		);
		const manifest = JSON.parse(fs.readFileSync(manifest_path, 'utf-8'));

		expect(manifest).toHaveProperty('optimized.e2e-test-dep-page-svelte');
	});

	test('optimizes +page.js dependencies', async ({ page }) => {
		await page.goto('/');
		await page.getByText('hello world!').waitFor();

		const manifest_path = path.join(
			import.meta.dirname,
			'../node_modules/.vite/deps/_metadata.json'
		);
		const manifest = JSON.parse(fs.readFileSync(manifest_path, 'utf-8'));

		expect(manifest).toHaveProperty('optimized.e2e-test-dep-page-universal');
	});

	test('skips optimizing +page.server.js dependencies', async ({ page }) => {
		await page.goto('/');
		await page.getByText('hello world!').waitFor();

		const manifest_path = path.join(
			import.meta.dirname,
			'../node_modules/.vite/deps/_metadata.json'
		);
		const manifest = JSON.parse(fs.readFileSync(manifest_path, 'utf-8'));

		expect(manifest).not.toHaveProperty('optimized.e2e-test-dep-page-server');
	});

	test('optimizes +layout.svelte dependencies', async ({ page }) => {
		await page.goto('/');
		await page.getByText('hello world!').waitFor();

		const manifest_path = path.join(
			import.meta.dirname,
			'../node_modules/.vite/deps/_metadata.json'
		);
		const manifest = JSON.parse(fs.readFileSync(manifest_path, 'utf-8'));

		expect(manifest).toHaveProperty('optimized.e2e-test-dep-layout-svelte');
	});

	test('optimizes +layout.js dependencies', async ({ page }) => {
		await page.goto('/');
		await page.getByText('hello world!').waitFor();

		const manifest_path = path.join(
			import.meta.dirname,
			'../node_modules/.vite/deps/_metadata.json'
		);
		const manifest = JSON.parse(fs.readFileSync(manifest_path, 'utf-8'));

		expect(manifest).toHaveProperty('optimized.e2e-test-dep-layout-universal');
	});

	test('skips optimizing +layout.server.js dependencies', async ({ page }) => {
		await page.goto('/');
		await page.getByText('hello world!').waitFor();

		const manifest_path = path.join(
			import.meta.dirname,
			'../node_modules/.vite/deps/_metadata.json'
		);
		const manifest = JSON.parse(fs.readFileSync(manifest_path, 'utf-8'));

		expect(manifest).not.toHaveProperty('optimized.e2e-test-dep-layout-server');
	});

	test('optimizes +error.svelte dependencies', async ({ page }) => {
		await page.goto('/');
		await page.getByText('hello world!').waitFor();

		const manifest_path = path.join(
			import.meta.dirname,
			'../node_modules/.vite/deps/_metadata.json'
		);
		const manifest = JSON.parse(fs.readFileSync(manifest_path, 'utf-8'));

		expect(manifest).toHaveProperty('optimized.e2e-test-dep-error');
	});

	test('optimizes hooks.client.js dependencies', async ({ page }) => {
		await page.goto('/');
		await page.getByText('hello world!').waitFor();

		const manifest_path = path.join(
			import.meta.dirname,
			'../node_modules/.vite/deps/_metadata.json'
		);
		const manifest = JSON.parse(fs.readFileSync(manifest_path, 'utf-8'));

		expect(manifest).toHaveProperty('optimized.e2e-test-dep-hooks-client');
	});

	test('optimizes hooks.js dependencies', async ({ page }) => {
		await page.goto('/');
		await page.getByText('hello world!').waitFor();

		const manifest_path = path.join(
			import.meta.dirname,
			'../node_modules/.vite/deps/_metadata.json'
		);
		const manifest = JSON.parse(fs.readFileSync(manifest_path, 'utf-8'));

		expect(manifest).toHaveProperty('optimized.e2e-test-dep-hooks');
	});
});

test.describe('request abort', () => {
	test.skip(({ javaScriptEnabled }) => !process.env.DEV || !javaScriptEnabled);

	test('request.signal fires abort event', async ({ page }) => {
		await page.goto('/request-abort');
		// the abort + subsequent fetch can take longer than a fixed timeout on slow CI,
		// so use an auto-retrying assertion instead of `waitForTimeout`
		await expect(page.locator('pre')).toHaveText('{"aborted":true}');
	});
});

test.describe('Remote functions', () => {
	test.skip(({ javaScriptEnabled }) => !process.env.DEV || !javaScriptEnabled);

	test('exports that are not remote functions report a helpful error', async ({ request }) => {
		const response = await request.get('/remote/invalid-export');
		expect(response.status()).toBe(500);
		expect(await response.text()).toContain('remote_module_invalid_export');
	});
});

test('adapters can render requests themselves', async ({ request }) => {
	const response = await request.get('/adapter-respond');
	expect(await response.text()).toBe('rendered by the adapter');
});

test.describe('@sveltejs/kit/adapter/dev', () => {
	test('renders pages in another environment', async ({ page }) => {
		await page.goto('/other-environment');
		await expect(page.locator('p')).toHaveText('rendered in the other environment');
	});

	test('renders endpoints in another environment', async ({ request }) => {
		const response = await request.get('/other-environment/endpoint');
		expect(await response.text()).toBe('other');
	});

	test('shows the error overlay when a module fails to load', async ({
		page,
		javaScriptEnabled
	}) => {
		test.skip(!javaScriptEnabled, 'the overlay needs JavaScript');

		await page.goto('/other-environment/throws', { wait_for_started: false });
		await expect(page.locator('vite-error-overlay .message-body')).toHaveText(
			'thrown while the module loads'
		);
	});

	test('inlines styles', async ({ request }) => {
		const eager = await (await request.get('/other-environment/css')).text();
		expect(eager).toContain('rgb(1, 2, 3)');
		expect(eager).toContain('rgb(4, 5, 6)');

		// the same modules as before, which now depend on one more component
		const lazy = await (await request.get('/other-environment/css?lazy')).text();
		expect(lazy).toContain('rgb(7, 8, 9)');
	});

	test('reads imported assets', async ({ request }) => {
		for (const [query, file] of [
			['', 'file.bin'],
			['?svg', 'logo.svg']
		]) {
			const content = fs.readFileSync(
				path.join(import.meta.dirname, '../src/routes/other-environment/read', file)
			);

			const response = await request.get(`/other-environment/read${query}`);
			expect(response.headers()['content-length']).toBe(String(content.length));
			expect((await response.body()).equals(content)).toBe(true);
		}
	});

	test('runs remote functions', async ({ page, javaScriptEnabled }) => {
		test.skip(!javaScriptEnabled, 'remote functions are called from the browser');

		await page.goto('/other-environment/remote');
		await expect(page.locator('p')).toHaveText('other');

		await page.locator('button').click();
		await expect(page.locator('button')).toHaveText('1');
	});

	test('global fetch rejects relative URLs', async ({ request }) => {
		const response = await request.get('/other-environment/fetch-relative');
		expect(await response.text()).toContainKitDiagnostic('fetch_relative_url');
	});
});
