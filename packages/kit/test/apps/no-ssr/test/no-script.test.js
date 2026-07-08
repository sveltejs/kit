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
