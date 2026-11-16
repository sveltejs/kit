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

test.describe('Devtools channel', () => {
	test.skip(({ javaScriptEnabled }) => !process.env.DEV || !javaScriptEnabled);

	/** @param {string} base_url */
	async function subscribe_to_devtools(base_url) {
		const client = await (await fetch(`${base_url}/@vite/client`)).text();
		const token = /const wsToken = "([^"]+)"/.exec(client)?.[1];
		const ws = new WebSocket(`${base_url.replace(/^http/, 'ws')}/?token=${token}`, 'vite-hmr');

		/** @type {Array<{ event: string, data: any }>} */
		const events = [];
		ws.addEventListener('message', ({ data }) => {
			const message = JSON.parse(data);
			if (message.type === 'custom') events.push(message);
		});

		await new Promise((resolve) => ws.addEventListener('open', resolve));
		ws.send(
			JSON.stringify({
				type: 'custom',
				event: 'sveltekit:devtools:subscribe',
				data: { token: 'devtools-e2e-token' }
			})
		);
		await expect
			.poll(() => events.some((e) => e.event === 'sveltekit:devtools:subscribed'))
			.toBe(true);

		/** @param {(event: { event: string, data: any }) => boolean} predicate */
		const find = async (predicate) => {
			await expect.poll(() => events.some(predicate)).toBe(true);
			return /** @type {{ event: string, data: any }} */ (events.find(predicate)).data;
		};

		return { ws, find };
	}

	test('sends the spans and logs of a request', async ({ baseURL }) => {
		const { ws, find } = await subscribe_to_devtools(/** @type {string} */ (baseURL));

		try {
			const response = await fetch(`${baseURL}/devtools`);
			expect(response.status).toBe(200);
			const id = /sveltekit;desc="([^"]+)"/.exec(response.headers.get('server-timing') ?? '')?.[1];
			expect(id).toBeTruthy();

			const request = await find(
				(e) => e.data?.type === 'request:completed' && e.data.request_id === id
			);
			expect(request.status).toBe(200);

			/** @param {string} name */
			const span = (name) => request.spans.find((/** @type {any} */ s) => s.name === name);
			const root = span('sveltekit.handle.root');
			const resolve = span('sveltekit.resolve');
			const load = span('sveltekit.load');
			expect(root.parent_id).toBe(null);
			expect(root.attributes['http.route']).toBe('/devtools');
			expect(resolve.parent_id).toBe(root.id);
			expect(load.parent_id).toBe(resolve.id);
			expect(load.end).toBeGreaterThanOrEqual(load.start);

			const log = await find((e) => e.data?.type === 'log:written');
			expect(log).toMatchObject({ request_id: id, level: 'log', message: 'loading /devtools' });
		} finally {
			ws.close();
		}
	});

	test('sends validation issues without changing the response', async ({ baseURL }) => {
		const module = await (await fetch(`${baseURL}/src/routes/devtools/data.remote.js`)).text();
		const remote_id = /'([^']+\/greet)'/.exec(module)?.[1];
		// devalue stringify of 1, which the schema rejects
		const url = `${baseURL}/_app/remote/${remote_id}?payload=${Buffer.from('[1]').toString('base64url')}`;

		const without_devtools = await (await fetch(url)).text();

		const { ws, find } = await subscribe_to_devtools(/** @type {string} */ (baseURL));

		try {
			const response = await fetch(url);
			expect(await response.text()).toBe(without_devtools);
			expect(without_devtools).toBe(
				JSON.stringify({ type: 'error', error: { status: 400, message: 'Bad Request' } })
			);

			const id = /sveltekit;desc="([^"]+)"/.exec(response.headers.get('server-timing') ?? '')?.[1];
			const validation = await find((e) => e.data?.type === 'validation:failed');
			expect(validation).toMatchObject({
				request_id: id,
				id: remote_id,
				name: 'greet',
				file: 'src/routes/devtools/data.remote.js',
				issues: [{ message: 'Expected a string', path: ['name'] }]
			});
		} finally {
			ws.close();
		}
	});
});
