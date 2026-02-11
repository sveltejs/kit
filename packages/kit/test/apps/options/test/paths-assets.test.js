import process from 'node:process';
import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

test.describe.configure({ mode: 'parallel' });

test.describe('base path', () => {
	test.skip(!process.env.PATHS_ASSETS);

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

	test('serves files in source directory', async ({ request, javaScriptEnabled }) => {
		test.skip(!process.env.DEV || !javaScriptEnabled);

		const response = await request.get('/path-base/source/pages/test.txt');
		expect(response.ok()).toBe(true);
		expect(await response.text()).toBe('hello there world\n');
	});

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

	test('fetch outside base path succeeds', async ({ page, baseURL }) => {
		await page.goto('/path-base/fetch/link-outside-base/');
		expect(await page.locator('[data-testid="fetch-url"]').textContent()).toContain(
			`${baseURL}/not-base-path/`
		);
		expect(await page.locator('[data-testid="fetch-response"]').textContent()).toContain(
			'did you mean to visit'
		);
	});

	test('fetch to root succeeds', async ({ page, baseURL }) => {
		await page.goto('/path-base/fetch/link-root/');
		// fetch to root with trailing slash
		expect(await page.locator('[data-testid="fetch1-url"]').textContent()).toContain(`${baseURL}/`);
		const fetch1Response = await page.locator('[data-testid="fetch1-response"]').textContent();
		const fetch1Redirect = await page.locator('[data-testid="fetch1-redirect"]').textContent();
		expect(
			// production
			fetch1Response?.includes('did you mean to visit') ||
				// dev
				fetch1Redirect === '/path-base'
		).toBe(true);

		// fetch to root without trailing slash should be relative
		expect(await page.locator('[data-testid="fetch2-url"]').textContent()).toBeFalsy();
		expect(await page.locator('[data-testid="fetch2-response"]').textContent()).toBe('relative');

		// fetch to root with custom base path with trailing slash
		expect(await page.locator('[data-testid="fetch3-url"]').textContent()).toBeFalsy();
		expect(await page.locator('[data-testid="fetch3-response"]').textContent()).toBe('root');

		// fetch to root with custom base path without trailing slash
		expect(await page.locator('[data-testid="fetch4-url"]').textContent()).toBeFalsy();
		expect(await page.locator('[data-testid="fetch4-redirect"]').textContent()).toBe('/path-base/');
	});
});

test.describe('assets path', () => {
	test.skip(!process.env.PATHS_ASSETS);

	test('serves static assets with correct prefix', async ({ page, request }) => {
		await page.goto('/path-base/');
		const href = await page.locator('link[rel="icon"]').getAttribute('href');

		const response = await request.get(href ?? '');
		expect(response.status()).toBe(200);
	});
});

test.describe('inlineStyleThreshold', () => {
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

	test('loads assets', async ({ page, javaScriptEnabled }) => {
		test.skip(!!process.env.DEV || javaScriptEnabled);

		let font_loaded = false;
		page.on('response', (response) => {
			if (response.url().endsWith('.woff2') || response.url().endsWith('.woff')) {
				font_loaded = response.ok();
			}
		});
		await page.goto('/path-base/inline-style');
		expect(font_loaded).toBeTruthy();
	});

	test('loads assets located in static directory', async ({ page, javaScriptEnabled }) => {
		test.skip(!!process.env.DEV || javaScriptEnabled);

		let image_loaded = false;
		page.on('response', (response) => {
			if (response.url().endsWith('favicon.png?v=1')) {
				image_loaded = response.ok();
			}
		});
		await page.goto('/path-base/inline-style/static-dir');
		expect(image_loaded).toBeTruthy();
	});

	test('loads assets with URL encoded characters', async ({ page, javaScriptEnabled }) => {
		test.skip(!!process.env.DEV || javaScriptEnabled);

		let image_loaded = false;
		page.on('response', (response) => {
			if (response.url().match(/%E6%84%9B\.\w+\.png$/)) {
				image_loaded = response.ok();
			}
		});
		await page.goto('/path-base/inline-style/url-encoded');
		expect(image_loaded).toBeTruthy();
	});

	test('includes components dynamically imported in universal load', async ({
		page,
		get_computed_style
	}) => {
		test.skip(!!process.env.DEV);

		let loaded_css = false;
		page.on('response', (response) => {
			if (response.url().endsWith('.css')) {
				loaded_css = true;
			}
		});
		await page.goto('/path-base/inline-style/dynamic-import');
		await expect(page.locator('p')).toHaveText("I'm dynamically imported");
		expect(loaded_css).toBe(false);
		expect(await get_computed_style('p', 'color')).toEqual('rgb(0, 0, 255)');
	});

	test('includes conditionally rendered component styles', async ({
		page,
		get_computed_style,
		javaScriptEnabled
	}) => {
		test.skip(!!process.env.DEV || !javaScriptEnabled);

		await page.goto('/path-base/inline-style/conditional-rendering');
		await expect(page.locator('#always')).toBeVisible();
		expect(await get_computed_style('#always', 'color')).toBe('rgb(255, 0, 0)');

		await page.locator('button', { hasText: 'show component' }).click();
		await expect(page.locator('#conditionally')).toBeVisible();
		expect(await get_computed_style('#conditionally', 'color')).toBe('rgb(0, 0, 255)');
	});

	test('places preload links before inlined styles', async ({ request }) => {
		// Skip in dev mode since inlineStyleThreshold works differently there
		test.skip(!!process.env.DEV);

		const response = await request.get('/path-base/base/');
		const html = await response.text();

		const preloadMatch = html.match(/<link[^>]+rel="preload"/);
		const styleMatch = html.match(/<style[^>]*>/);

		expect(preloadMatch).not.toBeNull();
		expect(styleMatch).not.toBeNull();

		const preloadIndex = html.indexOf(preloadMatch[0]);
		const styleIndex = html.indexOf(styleMatch[0]);

		expect(preloadIndex).toBeLessThan(styleIndex);
	});
});
