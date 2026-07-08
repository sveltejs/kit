import * as fs from 'node:fs';
import process from 'node:process';
import { expect, test } from '@playwright/test';

const cwd = process.cwd();

test('generates a fallback page', async ({ page }) => {
	expect(fs.existsSync(`${cwd}/build/200.html`)).toBeTruthy();

	await page.goto('/fallback/a/b/c');
	expect(await page.textContent('h1')).toEqual('the fallback page was rendered');
});

test('does not prerender pages without prerender=true', () => {
	expect(fs.existsSync(`${cwd}/build/index.html`)).toBeFalsy();
});

test('prerenders page with prerender=true', () => {
	expect(fs.existsSync(`${cwd}/build/about.html`)).toBeTruthy();
});

test('renders content in fallback page when JS runs', async ({ page }) => {
	await page.goto('/');
	expect(await page.textContent('h1')).toEqual('This page was not prerendered');
});

test('renders error page for missing page', async ({ page }) => {
	await page.goto('/nosuchpage');
	expect(await page.textContent('h1')).toEqual('404');
});

test('uses correct environment variables for fallback page (mode = staging)', async ({ page }) => {
	await page.goto('/fallback/x/y/z');
	expect(await page.textContent('b')).toEqual('42');
});

test.describe(() => {
	// this has to be inside a test.describe block or at the top-level of the module
	test.use({ javaScriptEnabled: false });

	test('fallback page includes root layout styles before CSR starts', async ({ page }) => {
		/** @type {string[]} */
		const requests = [];
		page.on('request', (request) => {
			const url = request.url();
			if (url.endsWith('.css')) requests.push(url);
		});
		await page.goto('/');
		expect(requests.length).toBe(1);
	});
});
