import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

/** @typedef {import('@playwright/test').Response} Response */

test.describe.configure({ mode: 'parallel' });

test.describe('env', () => {
	test('resolves upwards', async ({ page }) => {
		await page.goto('/basepath/env');
		expect(await page.textContent('[data-testid="static"]')).toBe('static: resolves upwards!');
		expect(await page.textContent('[data-testid="dynamic"]')).toBe('dynamic: resolves upwards!');
	});
});

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

		let base = javaScriptEnabled ? '/basepath' : '.';
		expect(await page.textContent('[data-testid="base"]')).toBe(`base: ${base}`);
		expect(await page.textContent('[data-testid="assets"]')).toBe(`assets: ${base}`);

		await page.goto('/basepath/deeply/nested/page');

		base = javaScriptEnabled ? '/basepath' : '../..';
		expect(await page.textContent('[data-testid="base"]')).toBe(`base: ${base}`);
		expect(await page.textContent('[data-testid="assets"]')).toBe(`assets: ${base}`);
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
	if (!process.env.DEV) {
		test('trailing slash server prerendered without server load', async ({
			page,
			clicknav,
			javaScriptEnabled
		}) => {
			if (!javaScriptEnabled) return;

			await page.goto('/basepath/trailing-slash-server');

			await clicknav('a[href="/basepath/trailing-slash-server/prerender"]');
			expect(await page.textContent('h2')).toBe('/basepath/trailing-slash-server/prerender/');
		});
	}
});

test.describe('Service worker', () => {
	if (process.env.DEV) {
		test('import proxy /basepath/service-worker.js', async ({ request }) => {
			const __dirname = path.dirname(fileURLToPath(import.meta.url));
			const response = await request.get('/basepath/service-worker.js');
			const content = await response.text();
			expect(content).toEqual(
				`import '${path.join('/basepath', '/@fs', __dirname, '../src/service-worker.js')}';`
			);
		});

		return;
	}

	test('build /basepath/service-worker.js', async ({ baseURL, request }) => {
		const response = await request.get('/basepath/service-worker.js');
		const content = await response.text();

		const fn = new Function('self', 'location', content);

		const self = {
			addEventListener: () => {},
			base: null,
			build: null
		};

		const pathname = '/basepath/service-worker.js';

		fn(self, {
			href: baseURL + pathname,
			pathname
		});

		expect(self.base).toBe('/basepath');
		expect(self.build?.[0]).toMatch(/\/basepath\/_app\/immutable\/bundle\.[\w-]+\.js/);
		expect(self.image_src).toMatch(/\/basepath\/_app\/immutable\/assets\/image\.[\w-]+\.jpg/);
	});

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
