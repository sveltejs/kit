import * as http from 'node:http';
import process from 'node:process';
import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

test.describe.configure({ mode: 'parallel' });

test.skip(!!process.env.PATHS_ASSETS);

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

	test('ensure CSP header in stream response', async ({ page, javaScriptEnabled }) => {
		if (!javaScriptEnabled) return;
		const response = await page.goto('/path-base/csp-with-stream');
		expect(response?.headers()['content-security-policy']).toMatch(
			/require-trusted-types-for 'script'/
		);
		expect(await page.textContent('h2')).toBe('Moo Deng!');
	});

	test("quotes 'script'", async ({ page }) => {
		const response = await page.goto('/path-base');
		expect(response?.headers()['content-security-policy']).toMatch(
			/require-trusted-types-for 'script'/
		);
	});

	test('allows hydratable scripts with CSP', async ({ request }) => {
		const response = await request.get('/path-base/csp-hydratable');
		const html = await response.text();

		const csp_header = response.headers()['content-security-policy'];
		expect(csp_header).toBeDefined();

		// Extract nonce from CSP header (e.g., 'nonce-ABC123')
		const nonce_match = csp_header.match(/'nonce-([^']+)'/);
		expect(nonce_match).not.toBeNull();
		const nonce = nonce_match?.[1];

		// Find the hydratable script in the raw HTML - it sets up (window.__svelte ??= {}).h
		const hydratable_script_match = html.match(
			/<script\s+nonce="([^"]+)"[^>]*>[^<]*\(window\.__svelte \?\?= \{\}\)\.h/
		);
		expect(hydratable_script_match).not.toBeNull();
		expect(hydratable_script_match?.[1]).toBe(nonce);
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
		page.on('request', (r) => {
			const url = r.url();
			// Headless Chrome re-requests the favicon.png on every URL change
			if (url.endsWith('/favicon.png')) return;
			return requests.push(new URL(url).pathname);
		});

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

test.describe('serviceWorker', () => {
	test.skip(!!process.env.DEV);

	test('does not register service worker if none created', async ({ page }) => {
		await page.goto('/path-base/');
		expect(await page.content()).not.toMatch('navigator.serviceWorker');
	});
});

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

test.describe('Async', () => {
	test("updates the DOM before onNavigate's promise is resolved", async ({
		page,
		javaScriptEnabled
	}) => {
		test.skip(!javaScriptEnabled);

		await page.goto('/path-base/on-navigate/a');

		/** @type {string[]} */
		const logs = [];
		page.on('console', (msg) => {
			logs.push(msg.text());
		});

		await page.getByRole('link', { name: 'b' }).click();

		await expect(page.locator('h1', { hasText: 'Page B' })).toBeVisible();
		expect(logs).toEqual(['mounted', 'navigated']);
	});
});
