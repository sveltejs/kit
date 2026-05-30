import process from 'node:process';
import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

test.skip(({ javaScriptEnabled }) => javaScriptEnabled);

test.describe.configure({ mode: 'parallel' });

test('styles are loaded before CSR starts for non-prerendered routes', async ({ page }) => {
	test.skip(!!process.env.DEV);

	/** @type {string[]} */
	const requests = [];
	page.on('request', (request) => {
		const url = request.url();
		if (url.endsWith('.css')) requests.push(url);
	});
	await page.goto('/styles');
	expect(requests.length).toBe(1);
});

test('styles are loaded before CSR starts for prerendered routes', async ({ page }) => {
	test.skip(!!process.env.DEV);

	/** @type {string[]} */
	const requests = [];
	page.on('request', (request) => {
		const url = request.url();
		if (url.endsWith('.css')) requests.push(url);
	});
	await page.goto('/styles/prerendered');
	expect(requests.length).toBe(1);
});

test('does not include route node modulepreloads in the Link response header when SSR is disabled', async ({
	request
}) => {
	test.skip(!!process.env.DEV);

	const response = await request.get('/');
	const link = response.headers()['link'] ?? '';

	// client.imports (entry/start, entry/app, shared chunks) may still appear,
	// but route-specific nodes/N.js chunks must not — they bloat the header
	// and can overflow reverse-proxy buffers (e.g. nginx default
	// proxy_buffer_size). The page shell is empty when SSR is off, so route
	// chunks load lazily via CSR.
	expect(link).not.toMatch(/\/nodes\/\d+\.[\w-]+\.js/);
});
