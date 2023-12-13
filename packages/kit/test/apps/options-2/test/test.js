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
		expect(self.build[0]).toMatch(/\/basepath\/_app\/immutable\/entry\/start\.[\w-]+\.js/);
		expect(self.image_src).toMatch(/\/basepath\/_app\/immutable\/assets\/image\.[\w-]+\.jpg/);
	});

	test('does not register /basepath/service-worker.js', async ({ page }) => {
		await page.goto('/basepath');
		expect(await page.content()).not.toMatch(/navigator\.serviceWorker/);
	});
});
