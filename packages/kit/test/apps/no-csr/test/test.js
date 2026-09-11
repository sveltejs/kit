import fs from 'node:fs';
import process from 'node:process';
import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

test.skip(({ javaScriptEnabled }) => javaScriptEnabled);

test.describe.configure({ mode: 'parallel' });

test.describe('Skipped client build', () => {
	test.skip(!!process.env.DEV);

	test('omits client build output', async () => {
		const files = fs.existsSync('.svelte-kit/output/client/_app/immutable/nodes');
		expect(files).toBe(false);
	});

	test('copies Vite imported assets', async ({ page, request }) => {
		await page.goto('/assets');
		const src = await page.locator('img').getAttribute('src');
		if (!src) throw new Error('Image src not found on /assets page');

		const img_response = await request.get(src);
		expect(img_response.status()).toBe(200);
	});

	test('copies static assets', async ({ request }) => {
		const public_asset_response = await request.get('/asset.json');
		expect(public_asset_response.status()).toBe(200);
	});

	test('copies web workers', async ({ page, request }) => {
		await page.goto('/assets');

		const worker_url = await page.getByTestId('worker').getAttribute('href');
		if (!worker_url) throw new Error('Worker href not found on /assets page');

		const worker_response = await request.get(worker_url);
		expect(worker_response.status()).toBe(200);
	});
});
