import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

/** @typedef {import('@playwright/test').Response} Response */

test.describe.parallel('Service worker', () => {
	test('serves /', async ({ page }) => {
		await page.goto('/');
		expect(await page.textContent('h1')).toBe('Hello');
	});

	if (!process.env.DEV) {
		test('build /service-worker.js', async ({ request }) => {
			const response = await request.get('/service-worker.js');
			const content = await response.text();

			expect(content).toMatch(/\/_app\/start-[a-z0-9]+\.js/);
		});

		test('does not register /service-worker.js', async ({ page }) => {
			await page.goto('/');
			expect(await page.content()).not.toMatch(/navigator\.serviceWorker/);
		});
	}
});
