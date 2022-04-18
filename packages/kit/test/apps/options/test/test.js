import { expect } from '@playwright/test';
import { start_server, test } from '../../../utils.js';

/** @typedef {import('@playwright/test').Response} Response */

test.describe.parallel('base path', () => {
	test('serves /', async ({ page, javaScriptEnabled }) => {
		await page.goto('/path-base/');

		expect(await page.textContent('h1')).toBe('I am in the template');
		expect(await page.textContent('h2')).toBe("We're on index.svelte");

		const mode = process.env.DEV ? 'dev' : 'prod';
		expect(await page.textContent('p')).toBe(
			`Hello from the ${javaScriptEnabled ? 'client' : 'server'} in ${mode} mode!`
		);
	});

	test('sets_paths', async ({ page }) => {
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

	test('loads CSS', async ({ page }) => {
		await page.goto('/path-base/base/');
		expect(
			await page.evaluate(() => {
				const el = document.querySelector('p');
				return el && getComputedStyle(el).color;
			})
		).toBe('rgb(255, 0, 0)');
	});

	test('inlines CSS', async ({ page, javaScriptEnabled }) => {
		await page.goto('/path-base/base/');
		if (process.env.DEV) {
			const ssr_style = await page.evaluate(() => document.querySelector('style[data-sveltekit]'));

			if (javaScriptEnabled) {
				// <style data-sveltekit> is removed upon hydration
				expect(ssr_style).toBeNull();
			} else {
				expect(ssr_style).not.toBeNull();
			}

			expect(
				await page.evaluate(() => document.querySelector('link[rel="stylesheet"]'))
			).toBeNull();
		} else {
			expect(await page.evaluate(() => document.querySelector('style'))).not.toBeNull();
			expect(
				await page.evaluate(() => document.querySelector('link[rel="stylesheet"][disabled]'))
			).not.toBeNull();
			expect(
				await page.evaluate(() => document.querySelector('link[rel="stylesheet"]:not([disabled])'))
			).not.toBeNull();
		}
	});

	test('sets params correctly', async ({ page, clicknav }) => {
		await page.goto('/path-base/base/one');

		expect(await page.textContent('h2')).toBe('one');

		await clicknav('[href="/path-base/base/two"]');
		expect(await page.textContent('h2')).toBe('two');
	});
});

test.describe.parallel('CSP', () => {
	test('blocks script from external site', async ({ page }) => {
		const { server, port } = await start_server((req, res) => {
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

		server.close();
	});
});

test.describe.parallel('Custom extensions', () => {
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

test.describe.parallel('Headers', () => {
	test('enables floc', async ({ page }) => {
		const response = await page.goto('/path-base');
		const headers = /** @type {Response} */ (response).headers();
		expect(headers['permissions-policy']).toBeUndefined();
	});
});

test.describe.parallel('trailingSlash', () => {
	test('adds trailing slash', async ({ baseURL, page, clicknav }) => {
		await page.goto('/path-base/slash');

		expect(page.url()).toBe(`${baseURL}/path-base/slash/`);
		expect(await page.textContent('h2')).toBe('/slash/');

		await clicknav('[href="/path-base/slash/child"]');
		expect(page.url()).toBe(`${baseURL}/path-base/slash/child/`);
		expect(await page.textContent('h2')).toBe('/slash/child/');
	});
});

test.describe.parallel('serviceWorker', () => {
	if (!process.env.DEV) {
		test('does not register service worker if none created', async ({ page }) => {
			await page.goto('/path-base/');
			expect(await page.content()).not.toMatch('navigator.serviceWorker');
		});
	}
});
