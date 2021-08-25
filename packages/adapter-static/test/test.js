import fs from 'fs';
import * as assert from 'uvu/assert';
import { run } from './utils.js';

run('prerendered', (test) => {
	test('generates HTML files', ({ cwd }) => {
		assert.ok(fs.existsSync(`${cwd}/build/index.html`));
	});

	test('prerenders content', async ({ base, page }) => {
		await page.goto(base);
		assert.equal(await page.textContent('h1'), 'This page was prerendered');
	});

	test('prerenders a streaming CSV file', async ({ cwd }) => {
		assert.equal(String(fs.readFileSync(`${cwd}/build/test.csv`)), '1,one\n2,two\n');
	});
});

run('spa', (test) => {
	test('generates a fallback page', ({ cwd }) => {
		assert.ok(fs.existsSync(`${cwd}/build/200.html`));
	});

	test('does not prerender pages without prerender=true', ({ cwd }) => {
		assert.ok(!fs.existsSync(`${cwd}/build/index.html`));
	});

	test('prerenders page with prerender=true', ({ cwd }) => {
		assert.ok(fs.existsSync(`${cwd}/build/about/index.html`));
	});

	test('renders content in fallback page when JS runs', async ({ base, page }) => {
		await page.goto(base);
		assert.equal(await page.textContent('h1'), 'This page was not prerendered');
	});

	test('renders error page for missing page', async ({ base, page }) => {
		await page.goto(`${base}/nosuchpage`);
		assert.equal(await page.textContent('h1'), '404');
	});

	test('prerenders a streaming text file', async ({ cwd }) => {
		assert.equal(String(fs.readFileSync(`${cwd}/build/test.txt`)), 'foobar');
	});

	test('renders a streaming text file', async ({ base, page }) => {
		const response = await page.goto(`${base}/test.txt`);
		assert.equal(String(await response.body()), 'foobar');
	});
});
