import process from 'node:process';
import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

/** @typedef {import('@playwright/test').Response} Response */

test.skip(({ javaScriptEnabled }) => javaScriptEnabled);

test.describe.configure({ mode: 'parallel' });

test.describe('Endpoints', () => {
	test('Prerendered +server.js called from a non-prerendered +server.js works', async ({
		baseURL
	}) => {
		const res = await fetch(`${baseURL}/prerendering/prerendered-endpoint/proxy`);

		expect(res.status).toBe(200);
		expect(await res.json()).toStrictEqual({
			message: 'Im prerendered and called from a non-prerendered +page.server.js'
		});
	});

	test('Partially Prerendered +server.js called from a non-prerendered +server.js works', async ({
		baseURL
	}) => {
		for (const [description, url] of [
			['direct', `${baseURL}/prerendering/prerendered-endpoint/api-with-param/prerendered`],
			[
				'proxied',
				`${baseURL}/prerendering/prerendered-endpoint/proxy?api-with-param-option=prerendered`
			]
		]) {
			await test.step(description, async () => {
				const res = await fetch(url);

				expect(res.status).toBe(200);
				expect(await res.json()).toStrictEqual({
					message: 'Im prerendered and called from a non-prerendered +page.server.js'
				});
			});
		}
	});

	// TODO all the remaining tests in this section are really only testing
	// setResponse, since we're not otherwise changing anything on the response.
	// might be worth making these unit tests instead
	// TODO see above
});

test.describe('Errors', () => {
	test('returns 400 when accessing a malformed URI', async ({ page }) => {
		const response = await page.goto('/%c0%ae%c0%ae/etc/passwd');
		if (process.env.DEV) {
			// Vite will return a 500 error code
			// We mostly want to make sure malformed requests don't bring down the whole server
			expect(/** @type {Response} */ (response).status()).toBeGreaterThanOrEqual(400);
		} else {
			expect(/** @type {Response} */ (response).status()).toBe(400);
		}
	});
});

test.describe('Routing', () => {
	test('Vite trailing slash redirect for prerendered pages retains URL query string', async ({
		request
	}) => {
		if (process.env.DEV) return;

		let response = await request.get('/routing/prerendered/trailing-slash/always?a=1');
		expect(new URL(response.url()).search).toBe('?a=1');

		response = await request.get('/routing/prerendered/trailing-slash/never/?a=1');
		expect(new URL(response.url()).search).toBe('?a=1');

		response = await request.get('/routing/prerendered/trailing-slash/ignore/?a=1');
		expect(new URL(response.url()).search).toBe('?a=1');
	});
});

test.describe('Static files', () => {
	test('static files', async ({ request }) => {
		let response = await request.get('/static.json');
		expect(await response.json()).toBe('static file');

		response = await request.get('/subdirectory/static.json');
		expect(await response.json()).toBe('subdirectory file');

		expect(response.headers()['access-control-allow-origin']).toBe('*');

		response = await request.get('/favicon.ico');
		expect(response.status()).toBe(200);

		// .ico files should be served with the correct Content-Type
		// https://github.com/sveltejs/kit/issues/13753
		response = await request.get('/test.ico');
		expect(response.status()).toBe(200);
		expect(response.headers()['content-type']).toBe('image/x-icon');
	});

	test('does not use Vite to serve contents of static directory', async ({ request }) => {
		const response = await request.get('/static/static.json');
		expect(response.status()).toBe(process.env.DEV ? 403 : 404);
	});

	test('Vite serves assets in allowed directories', async ({ page, request }) => {
		await page.goto('/asset-import');
		const path = await page.getAttribute('img[alt=potatoes]', 'src');
		if (!path) throw new Error('Could not determine path');

		const r1 = await request.get(path);
		expect(r1.status()).toBe(200);
		expect(await r1.text()).toBeTruthy();

		// check that we can fetch a route which overlaps with the name of a file
		const r2 = await request.get('/package.json');
		expect(r2.status()).toBe(200);
		expect(await r2.json()).toEqual({ works: true });
	});

	if (process.platform !== 'win32') {
		test('Serves symlinked asset', async ({ request }) => {
			const response = await request.get('/symlink-from/hello.txt');
			expect(response.status()).toBe(200);
			expect(await response.text()).toBe('hello');
		});
	}

	test('returns 404 for Chrome DevTools workspaces request', async ({ request }) => {
		const response = await request.get('/.well-known/appspecific/com.chrome.devtools.json');
		expect(response.status()).toBe(404);
		expect(await response.text()).toBe('not found');
	});
});

test.describe('Miscellaneous', () => {
	test('does not serve version.json with an immutable cache header', async ({ request }) => {
		// this isn't actually a great test, because caching behaviour is down to adapters.
		// but it's better than nothing
		const response = await request.get('/_app/version.json');
		const headers = response.headers();
		expect(headers['cache-control'] || '').not.toContain('immutable');
	});

	test('serves prerendered non-latin pages', async ({ request }) => {
		const response = await request.get('/prerendering/中文');
		expect(response.status()).toBe(200);
	});
});

test.describe('reroute', () => {
	test('Apply async prerendered reroute when directly accessing a page', async ({ page }) => {
		await page.goto('/reroute/async/c');
		expect(await page.textContent('h1')).toContain(
			'Successfully rewritten, URL should still show a: /reroute/async/c'
		);
	});

	test('Apply reroute to prerendered page when directly accessing a page', async ({ page }) => {
		await page.goto('/reroute/prerendered/to-destination');
		expect(await page.textContent('h1')).toContain('reroute that points to prerendered page works');
	});
});
