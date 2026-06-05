import fs from 'node:fs';
import process from 'node:process';
import { expect, test } from '@playwright/test';

const cwd = process.cwd();

test('custom worker entry point', async ({ request }) => {
	const response = await request.get('/');
	expect(await response.text()).toContain('hello world!');
	expect(response.headers()).toHaveProperty('x-custom-worker', 'true');
});

test('environment variables', async ({ page }) => {
	await page.goto('/env');
	const prod_string = !process.env.DEV ? 'PROD_' : '';
	await expect(page.locator('#secret')).toHaveText(`Secret: ${prod_string}SECRET`);
	await expect(page.locator('#var')).toHaveText(`Var: ${prod_string}VAR`);
});

test('serves static assets with assets path prefix', async ({ page, request }) => {
	await page.goto('/');
	const href = await page.locator('link[rel="icon"]').getAttribute('href');

	const response = await request.get(href ?? '');
	expect(response.status()).toBe(200);
});

test.describe('after build', () => {
	test.skip(!!process.env.DEV);

	test('prerendered page', async ({ page }) => {
		expect(fs.existsSync(`${cwd}/.svelte-kit/output/client/prerendered.html`)).toBeTruthy();

		await page.goto('/prerendered');
		await expect(page.locator('p')).toHaveText('this page is prerendered at build-time');
	});

	test('prerendered remote function', async ({ page }) => {
		expect(
			fs.existsSync(`${cwd}/.svelte-kit/output/client/_app/remote/158xbtz/get_text`)
		).toBeTruthy();

		await page.goto('/remotes/prerender');
		await expect(page.locator('p')).toHaveText('this text is prerendered at build-time');
	});
});
