import fs from 'node:fs';
import process from 'node:process';
import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

test.skip(({ javaScriptEnabled }) => javaScriptEnabled);

test.describe.configure({ mode: 'parallel' });

test('skips client build if every node has CSR disabled', async ({ page, request }) => {
	test.skip(!!process.env.DEV);

	const files = fs.existsSync('.svelte-kit/output/client/_app/immutable/nodes');
	expect(files).toBe(false);

	await page.goto('/assets');
	const src = await page.locator('img').getAttribute('src');
	if (!src) throw new Error('Image src not found on /assets page');

	const img_response = await request.get(src);
	expect(img_response.status()).toBe(200);

	const public_asset_response = await request.get('/asset.json');
	expect(public_asset_response.status()).toBe(200);
});
