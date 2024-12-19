import process from 'node:process';
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
});

test.describe('Service worker', () => {
	if (process.env.DEV) return;

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
		expect(self.build[0]).toMatch(/\/basepath\/_app\/immutable\/bundle\.[\w-]+\.js/);
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
});
