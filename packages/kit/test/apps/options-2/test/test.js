import process from 'node:process';
import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

test.skip(() => !!process.env.REGISTER_SERVICE_WORKER);

test.describe.configure({ mode: 'parallel' });

test.describe('paths', () => {
	test('serves /basepath', async ({ page }) => {
		await page.goto('/basepath');
		expect(await page.textContent('h1')).toBe('Hello');
	});

	test('serves assets from /basepath', async ({ request }) => {
		const response = await request.get('/basepath/answer.txt');
		expect(await response.text()).toBe('42');
	});

	test('uses relative paths during SSR', async ({ page, javaScriptEnabled }) => {
		await page.goto('/basepath');

		let base = javaScriptEnabled ? '/basepath/' : './';
		expect(await page.textContent('[data-testid="base"]')).toBe(`base: ${base}`);
		expect(await page.textContent('[data-testid="assets"]')).toBe(`assets: ${base}`);

		await page.goto('/basepath/deeply/nested/page');

		base = javaScriptEnabled ? '/basepath/' : '../../';
		expect(await page.textContent('[data-testid="base"]')).toBe(`base: ${base}`);
		expect(await page.textContent('[data-testid="assets"]')).toBe(`assets: ${base}`);
	});

	test('uses correct relative paths when rendering an error page for a missing __data.json', async ({
		page,
		javaScriptEnabled
	}) => {
		// a non-existent page requested with the data suffix renders the error page. Its relative
		// paths must be resolved against the requested URL (including the `__data.json` suffix),
		// otherwise they end up one directory too shallow and fail to load the app's assets
		await page.goto('/basepath/this/does/not/exist/__data.json');

		const expected = javaScriptEnabled ? '/basepath/' : '../../../../';

		expect(await page.textContent('[data-testid="base"]')).toBe(`base: ${expected}`);
		expect(await page.textContent('[data-testid="assets"]')).toBe(`assets: ${expected}`);
	});

	test('serves /basepath with trailing slash always', async ({ page }) => {
		await page.goto('/basepath');
		expect(new URL(page.url()).pathname).toBe('/basepath/');
	});

	test('respects trailing slash option when navigating from /basepath', async ({
		page,
		clicknav
	}) => {
		await page.goto('/basepath');
		expect(new URL(page.url()).pathname).toBe('/basepath/');
		await clicknav('[data-testid="link"]');
		expect(new URL(page.url()).pathname).toBe('/basepath/hello');
	});

	test('query remote function from client accounts for base path', async ({
		page,
		javaScriptEnabled
	}) => {
		test.skip(!javaScriptEnabled);

		await page.goto('/basepath/remote');
		await expect(page.locator('#count')).toHaveText('');
		await page.locator('button', { hasText: 'get count' }).click();
		await expect(page.locator('#count')).toHaveText('0');
	});

	test('prerender remote function from client accounts for base path', async ({
		page,
		javaScriptEnabled
	}) => {
		test.skip(!javaScriptEnabled);

		await page.goto('/basepath/remote');
		await expect(page.locator('#prerendered')).toHaveText('');
		await page.locator('button', { hasText: 'get prerendered' }).click();
		await expect(page.locator('#prerendered')).toHaveText('yes');
	});

	test('command remote function from client accounts for base path', async ({
		page,
		javaScriptEnabled
	}) => {
		test.skip(!javaScriptEnabled);

		await page.goto('/basepath/remote');
		await expect(page.locator('#count')).toHaveText('');
		await page.locator('button', { hasText: 'reset' }).click();
		await expect(page.locator('#count')).toHaveText('0');
	});

	test('form remote function from client accounts for base path', async ({
		page,
		javaScriptEnabled
	}) => {
		test.skip(!javaScriptEnabled);

		await page.goto('/basepath/remote');
		await expect(page.locator('#count')).toHaveText('');
		await page.locator('input').fill('1');
		await page.locator('button', { hasText: 'submit' }).click();
		await expect(page.locator('#count')).toHaveText('1');
	});
});

test.describe('trailing slash', () => {
	test('trailing slash server prerendered without server load', async ({
		page,
		clicknav,
		javaScriptEnabled
	}) => {
		test.skip(!javaScriptEnabled || !!process.env.DEV);

		await page.goto('/basepath/trailing-slash-server');

		await clicknav('a[href="/basepath/trailing-slash-server/prerender"]');
		await expect(page.locator('h2')).toHaveText('/basepath/trailing-slash-server/prerender/');
	});
});

test.describe('Service worker', () => {
	test.skip(({ javaScriptEnabled }) => !javaScriptEnabled);

	test('does not register /basepath/service-worker.js', async ({ page }) => {
		await page.goto('/basepath');
		expect(await page.content()).not.toMatch(/navigator\.serviceWorker/);
	});
});

test.describe("bundleStrategy: 'single'", () => {
	test.skip(({ javaScriptEnabled }) => !javaScriptEnabled || !!process.env.DEV);

	test('loads a single js file and a single css file', async ({ page }) => {
		/** @type {string[]} */
		const requests = [];
		page.on('request', (r) => requests.push(new URL(r.url()).pathname));

		await page.goto('/basepath');

		await Promise.all([
			page.waitForTimeout(100), // wait for preloading to start
			page.waitForLoadState('networkidle') // wait for preloading to finish
		]);

		expect(requests.filter((req) => req.endsWith('.js')).length).toBe(1);
		expect(requests.filter((req) => req.endsWith('.css')).length).toBe(1);
	});

	test('app.decoders is accessed only after app has been initialised', async ({ page }) => {
		await page.goto('/basepath/deserialize');
		await expect(page.locator('p')).toHaveText('Hello world!');
	});

	test('serialization works with streaming', async ({ page }) => {
		await page.goto('/basepath/serialization-stream');
		await expect(page.locator('h1', { hasText: 'It works!' })).toBeVisible();
	});
});

test.describe('Link header preload', () => {
	test.skip(({ javaScriptEnabled }) => javaScriptEnabled || !!process.env.DEV);

	test('injects Link headers', async ({ request }) => {
		const response = await request.get('/basepath/asset-preload');

		const header = response.headers()['link'];

		expect(header).toContain('rel="modulepreload"');
		expect(header).toContain('as="font"');
	});

	test('does not inject Link headers on prerendered pages', async ({ request }) => {
		const response = await request.get('/basepath/asset-preload/prerendered');

		const header = response.headers()['link'];
		expect(header).toBeUndefined();
	});

	test('injects <link> tags on prerendered pages', async ({ request }) => {
		const response = await request.get('/basepath/asset-preload/prerendered');

		const body = await response.text();

		expect(body).toContain('rel="modulepreload"');
		expect(body).toContain('as="font"');
	});

	test('does not inject <link> tags on non-prerendered pages', async ({ request }) => {
		const response = await request.get('/basepath/asset-preload');

		const body = await response.text();

		expect(body).not.toContain('rel="modulepreload"');
		expect(body).not.toContain('as="font"');
	});
});

test.describe('$app/env', () => {
	// regression test for https://github.com/sveltejs/kit/issues/15971:
	// importing `$app/env` before the router is initialized (e.g. in
	// hooks.client.js) must not throw `__SVELTEKIT_APP_VERSION__ is not defined`
	test('version is defined when imported during client init', async ({
		page,
		javaScriptEnabled
	}) => {
		test.skip(!javaScriptEnabled || !process.env.DEV);

		await page.goto('/basepath', { wait_for_started: false });
		await expect(page.locator('body.started')).toBeVisible();
		expect(await page.pageErrors()).toHaveLength(0);
	});
});

test.describe('Vite', () => {
	// regression test for https://github.com/sveltejs/kit/issues/13249:
	// user `define`s referenced at the top level of hooks.client.js must be
	// available during client init
	test('global constant replacements are available during client init', async ({
		page,
		javaScriptEnabled
	}) => {
		test.skip(!javaScriptEnabled);

		await page.goto('/basepath', { wait_for_started: false });
		await expect(page.locator('body.started')).toBeVisible();
		expect(await page.evaluate(() => window.__test_user_define__)).toBe('works');
		expect(await page.pageErrors()).toHaveLength(0);
	});
});

test.describe('Disabled link option preload', () => {
	test.skip(({ javaScriptEnabled }) => !javaScriptEnabled);

	test('link option preload does nothing', async ({ page }) => {
		await page.goto('/basepath/navigation-preload');

		/** @type {string[]} */
		const requests = [];
		page.on('request', (req) => {
			requests.push(req.url());
		});

		await page.locator('a').hover();
		await page.locator('a').dispatchEvent('touchstart');
		await Promise.all([
			page.waitForTimeout(100), // wait for preloading to start
			page.waitForLoadState('networkidle') // wait for preloading to finish
		]);
		expect(requests.length).toBe(0);
	});

	test('programmatic preload still works', async ({ page }) => {
		await page.goto('/basepath/navigation-preload');

		/** @type {string[]} */
		const requests = [];
		page.on('request', (req) => {
			requests.push(req.url());
		});

		await page.locator('button').click();

		expect(requests.length).toBe(1);
	});
});
