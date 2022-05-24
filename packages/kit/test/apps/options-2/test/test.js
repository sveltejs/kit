import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

/** @typedef {import('@playwright/test').Response} Response */

test.describe.parallel('paths.base', () => {
	test('serves /basepath', async ({ page }) => {
		await page.goto('/basepath');
		expect(await page.textContent('h1')).toBe('Hello');
	});

	test('serves assets from /basepath', async ({ request }) => {
		const response = await request.get('/basepath/answer.txt');
		expect(await response.text()).toBe('42');
	});
});

test.describe.parallel('Service worker', () => {
	if (!process.env.DEV) {
		test('build /basepath/service-worker.js', async ({ request }) => {
			const response = await request.get('/basepath/service-worker.js');
			const content = await response.text();

			expect(content).toMatch(/\/_app\/immutable\/start-[a-z0-9]+\.js/);
		});

		test('does not register /basepath/service-worker.js', async ({ page }) => {
			await page.goto('/basepath');
			expect(await page.content()).not.toMatch(/navigator\.serviceWorker/);
		});
	}
});
