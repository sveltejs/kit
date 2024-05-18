import * as http from 'node:http';
import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

/** @typedef {import('@playwright/test').Response} Response */

test.describe.configure({ mode: 'parallel' });

test.describe('base path', () => {
	test('serves a useful 404 when visiting unprefixed path', async ({ request }) => {
		const html = await request.get('/slash/', { headers: { Accept: 'text/html' } });
		expect(html.status()).toBe(404);
		expect(await html.text()).toBe(
			'The server is configured with a public base URL of /path-base - did you mean to visit <a href="/path-base/slash/">/path-base/slash/</a> instead?'
		);

		const plain = await request.get('/slash/');
		expect(plain.status()).toBe(404);
		expect(await plain.text()).toBe(
			'The server is configured with a public base URL of /path-base - did you mean to visit /path-base/slash/ instead?'
		);
	});

	test('serves /', async ({ page, javaScriptEnabled }) => {
		await page.goto('/path-base/');

		expect(await page.textContent('h1')).toBe('I am in the template');
		expect(await page.textContent('h2')).toBe("We're on index.svelte");

		const mode = process.env.DEV ? 'dev' : 'prod';
		expect(await page.textContent('p')).toBe(
			`Hello from the ${javaScriptEnabled ? 'client' : 'server'} in ${mode} mode!`
		);
	});

	if (process.env.DEV) {
		test('serves files in source directory', async ({ request, javaScriptEnabled }) => {
			if (!javaScriptEnabled) return;

			const response = await request.get('/path-base/source/pages/test.txt');
			expect(response.ok()).toBe(true);
			expect(await response.text()).toBe('hello there world\n');
		});
	}

	test('paths available on server side', async ({ page }) => {
		await page.goto('/path-base/base/');
		expect(await page.textContent('[data-source="base"]')).toBe('/path-base');
		expect(await page.textContent('[data-source="assets"]')).toBe('/_svelte_kit_assets');
	});

	test('loads javascript', async ({ page, javaScriptEnabled }) => {
		await page.goto('/path-base/base/');
		expect(await page.textContent('button')).toBe('clicks: 0');

		if (javaScriptEnabled) {
			await page.click('button');
			expect(await page.innerHTML('h2')).toBe('button has been clicked 1 time');
		}
	});

	test('loads CSS', async ({ page, get_computed_style }) => {
		await page.goto('/path-base/base/');
		expect(await get_computed_style('p', 'color')).toBe('rgb(255, 0, 0)');
	});

	test('inlines CSS', async ({ page, javaScriptEnabled }) => {
		await page.goto('/path-base/base/');
		if (process.env.DEV) {
			const ssr_style = await page.$('style[data-sveltekit]');

			if (javaScriptEnabled) {
				// <style data-sveltekit> is removed upon hydration
				expect(ssr_style).toBeNull();
			} else {
				expect(ssr_style).not.toBeNull();
			}

			expect(await page.$('link[rel="stylesheet"]')).toBeNull();
		} else {
			expect(await page.$('style')).not.toBeNull();
			expect(await page.$('link[rel="stylesheet"][disabled]')).not.toBeNull();
			expect(await page.$('link[rel="stylesheet"]:not([disabled])')).not.toBeNull();
		}
	});

	test('sets params correctly', async ({ page, clicknav }) => {
		await page.goto('/path-base/base/one');

		expect(await page.textContent('h2')).toBe('one');

		await clicknav('[href="/path-base/base/two"]');
		expect(await page.textContent('h2')).toBe('two');
	});

	test('resolveRoute accounts for base path', async ({ baseURL, page, clicknav }) => {
		await page.goto('/path-base/resolve-route');
		await clicknav('[data-id=target]');
		expect(page.url()).toBe(`${baseURL}/path-base/resolve-route/resolved/`);
		expect(await page.textContent('h2')).toBe('resolved');
	});
});

test.describe('assets path', () => {
	test('serves static assets with correct prefix', async ({ page, request }) => {
		await page.goto('/path-base/');
		const href = await page.locator('link[rel="icon"]').getAttribute('href');

		const response = await request.get(href);
		expect(response.status()).toBe(200);
	});
});

test.describe('CSP', () => {
	test('blocks script from external site', async ({ page, start_server }) => {
		const { port } = await start_server((req, res) => {
			if (req.url === '/blocked.js') {
				res.writeHead(200, {
					'content-type': 'text/javascript'
				});

				res.end('window.pwned = true');
			} else {
				res.writeHead(404).end('not found');
			}
		});

		await page.goto(`/path-base/csp?port=${port}`);
		expect(await page.evaluate('window.pwned')).toBe(undefined);
	});

	test("quotes 'script'", async ({ page }) => {
		const response = await page.goto('/path-base');
		expect(response.headers()['content-security-policy']).toMatch(
			/require-trusted-types-for 'script'/
		);
	});
});

test.describe('Custom extensions', () => {
	test('works with arbitrary extensions', async ({ page }) => {
		await page.goto('/path-base/custom-extensions/');
		expect(await page.textContent('h2')).toBe('Great success!');
	});

	test('works with other arbitrary extensions', async ({ page }) => {
		await page.goto('/path-base/custom-extensions/const');
		expect(await page.textContent('h2')).toBe('Tremendous!');

		await page.goto('/path-base/custom-extensions/a');

		expect(await page.textContent('h2')).toBe('a');

		await page.goto('/path-base/custom-extensions/test-slug');

		expect(await page.textContent('h2')).toBe('TEST-SLUG');

		await page.goto('/path-base/custom-extensions/unsafe-replacement');

		expect(await page.textContent('h2')).toBe('Bazooom!');
	});
});

test.describe('env', () => {
	test('resolves downwards', async ({ page }) => {
		await page.goto('/path-base/env');
		expect(await page.textContent('#public')).toBe('and thank you');
	});
	test('respects private prefix', async ({ page }) => {
		await page.goto('/path-base/env');
		expect(await page.textContent('#private')).toBe('shhhh');
		expect(await page.textContent('#neither')).toBe('');
	});
});

test.describe('trailingSlash', () => {
	test('adds trailing slash', async ({ baseURL, page, clicknav }) => {
		// we can't use Playwright's `request` here, because it resolves redirects
		const status = await new Promise((fulfil, reject) => {
			const request = http.get(`${baseURL}/path-base/slash`);
			request.on('error', reject);
			request.on('response', (response) => {
				fulfil(response.statusCode);
			});
		});
		expect(status).toBe(308);

		await page.goto('/path-base/slash');

		expect(page.url()).toBe(`${baseURL}/path-base/slash/`);
		expect(await page.textContent('h2')).toBe('/path-base/slash/');

		await clicknav('[data-testid="child"]');
		expect(page.url()).toBe(`${baseURL}/path-base/slash/child/`);
		expect(await page.textContent('h2')).toBe('/path-base/slash/child/');
	});

	test('removes trailing slash on endpoint', async ({ baseURL, request }) => {
		const r1 = await request.get('/path-base/endpoint/');
		expect(r1.url()).toBe(`${baseURL}/path-base/endpoint`);
		expect(await r1.text()).toBe('hi');

		const r2 = await request.get('/path-base/endpoint');
		expect(r2.url()).toBe(`${baseURL}/path-base/endpoint`);
		expect(await r2.text()).toBe('hi');
	});

	test('adds trailing slash to endpoint', async ({ baseURL, request }) => {
		const r1 = await request.get('/path-base/endpoint-with-slash');
		expect(r1.url()).toBe(`${baseURL}/path-base/endpoint-with-slash/`);
		expect(await r1.text()).toBe('hi');

		const r2 = await request.get('/path-base/endpoint-with-slash/');
		expect(r2.url()).toBe(`${baseURL}/path-base/endpoint-with-slash/`);
		expect(await r2.text()).toBe('hi');
	});

	test('can fetch data from page-endpoint', async ({ request }) => {
		const r = await request.get('/path-base/page-endpoint/__data.json');
		const data = await r.json();

		expect(data).toEqual({
			type: 'data',
			nodes: [
				{ type: 'data', data: [null], uses: {}, slash: 'always' },
				{ type: 'data', data: [{ message: 1 }, 'hi'], uses: {} }
			]
		});
	});

	test('accounts for trailingSlash when preloading', async ({ app, page, javaScriptEnabled }) => {
		if (!javaScriptEnabled) return;

		await page.goto('/path-base/preloading');

		/** @type {string[]} */
		let requests = [];
		page.on('request', (r) => requests.push(new URL(r.url()).pathname));

		// also wait for network processing to complete, see
		// https://playwright.dev/docs/network#network-events
		await app.preloadCode('/path-base/preloading/preloaded');

		// svelte request made is environment dependent
		if (process.env.DEV) {
			expect(requests.filter((req) => req.endsWith('.svelte')).length).toBe(1);
		} else {
			expect(requests.filter((req) => req.endsWith('.mjs')).length).toBeGreaterThan(0);
		}

		requests = [];
		await app.preloadData('/path-base/preloading/preloaded');

		expect(requests.includes('/path-base/preloading/preloaded/__data.json')).toBe(true);

		requests = [];
		await app.goto('/path-base/preloading/preloaded');
		expect(requests).toEqual([]);
	});

	test('accounts for base path when running data-sveltekit-preload-code', async ({
		page,
		javaScriptEnabled
	}) => {
		if (!javaScriptEnabled) return;

		await page.goto('/path-base/preloading');

		/** @type {string[]} */
		let requests = [];
		page.on('request', (r) => requests.push(new URL(r.url()).pathname));

		await page.hover('a[href="/path-base/preloading/code"]');
		await page.waitForTimeout(100);

		// svelte request made is environment dependent
		if (process.env.DEV) {
			expect(requests.filter((req) => req.endsWith('.svelte')).length).toBe(1);
		} else {
			expect(requests.filter((req) => req.endsWith('.mjs')).length).toBeGreaterThan(0);
		}

		requests = [];
		await page.click('a[href="/path-base/preloading/code"]');
		expect(requests).toEqual([]);
	});
});

if (!process.env.DEV) {
	test.describe('serviceWorker', () => {
		test('does not register service worker if none created', async ({ page }) => {
			await page.goto('/path-base/');
			expect(await page.content()).not.toMatch('navigator.serviceWorker');
		});
	});
}

test.describe('Vite options', () => {
	test('Respects --mode', async ({ page }) => {
		await page.goto('/path-base/mode');

		const mode = process.env.DEV ? 'development' : 'custom';
		expect(await page.textContent('h2')).toBe(`${mode} === ${mode} === ${mode}`);
	});
});

test.describe('Routing', () => {
	test('ignores clicks outside the app target', async ({ page }) => {
		await page.goto('/path-base/routing/link-outside-app-target/source/');

		await page.click('[href="/path-base/routing/link-outside-app-target/target/"]');
		await expect(page.locator('h2')).toHaveText('target: 0');
	});
});
