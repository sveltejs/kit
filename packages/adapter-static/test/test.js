import fs from 'fs';
import * as assert from 'uvu/assert';
import { run } from './utils.js';

run('prerendered', (test) => {
	test('generates HTML files', ({ cwd }) => {
		assert.ok(fs.existsSync(`${cwd}/build/index.html`));
	});

	test('prerenders a page', async ({ base, page }) => {
		await page.goto(base);
		assert.equal(await page.textContent('h1'), 'This page was prerendered');
		assert.equal(await page.textContent('p'), 'answer: 42');
	});

	test('prerenders an unreferenced endpoint with explicit `prerender` setting', async ({ cwd }) => {
		assert.ok(fs.existsSync(`${cwd}/build/endpoint/explicit.json`));
	});

	test('prerenders a referenced endpoint with implicit `prerender` setting', async ({ cwd }) => {
		assert.ok(fs.existsSync(`${cwd}/build/endpoint/implicit.json`));
	});
});

run('spa', (test) => {
	test('generates a fallback page', async ({ base, cwd, page }) => {
		assert.ok(fs.existsSync(`${cwd}/build/200.html`));

		await page.goto(`${base}/fallback/a/b/c`);
		assert.equal(await page.textContent('h1'), 'the fallback page was rendered');
	});

	test('does not prerender pages without prerender=true', ({ cwd }) => {
		assert.ok(!fs.existsSync(`${cwd}/build/index.html`));
	});

	test('prerenders page with prerender=true', ({ cwd }) => {
		assert.ok(fs.existsSync(`${cwd}/build/about.html`));
	});

	test('renders content in fallback page when JS runs', async ({ base, page }) => {
		await page.goto(base);
		assert.equal(await page.textContent('h1'), 'This page was not prerendered');
	});

	test('renders error page for missing page', async ({ base, page }) => {
		await page.goto(`${base}/nosuchpage`);
		assert.equal(await page.textContent('h1'), '404');
	});
});
