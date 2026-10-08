import fs from 'node:fs';
import process from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from '../../../playwright-matchers.js';
import { test } from '../../../utils.js';

test.skip(({ javaScriptEnabled }) => javaScriptEnabled);

const root = path.resolve(fileURLToPath(import.meta.url), '..', '..');

test.describe('remote functions', () => {
	test('match preserves URL origins inside nested batched queries during SSR', async ({ page }) => {
		await page.goto('/remote/match');

		const hosts = [new URL(page.url()).host, 'string.example', 'url.example'];
		for (const [i, host] of hosts.entries()) {
			await expect(page.locator(`[data-id="batch-match-${i}"]`)).toHaveText(
				JSON.stringify({ id: '/fork/[index]', params: { index: host } })
			);
		}
	});

	test('production client output excludes remote diagnostic text and build dependencies', () => {
		test.skip(!!process.env.DEV, 'only applicable after build');
		const files = fs.globSync(`${root}/.svelte-kit/output/client/**/*.js`);
		expect(files.length).toBeGreaterThan(0);
		const code = files.map((file) => fs.readFileSync(file, 'utf-8')).join('\n');
		// minify:false retains JSDoc descriptions — only executable strings count here
		const executable = code.replace(/\/\*[^]*?\*\//g, '');
		expect(executable).toContain('https://svelte.dev/e/kit/remote_form_multiple_elements');
		for (const text of [
			'A form object can only be attached',
			'Form submission had invalid data',
			'Updates can only be sent once',
			'Regular expressions are not valid remote',
			'Form contained a field that',
			'Form cannot contain duplicated keys',
			'Invalid field name ',
			'This key is not allowed to prevent prototype pollution',
			'inputs must have a value',
			'Invalid validator passed to remote',
			'scripts/process-messages',
			'@sveltejs/message-box',
			'node:fs',
			'Cannot export `default` from a remote module'
		])
			expect(executable).not.toContain(text);
	});
	test("doesn't write bundle to disk when treeshaking prerendered remote functions", () => {
		test.skip(!!process.env.DEV, 'only applicable after build');
		expect(fs.existsSync(path.join(root, 'dist'))).toBe(false);
	});

	test('non-dynamic prerendered remote functions are treeshaken', () => {
		test.skip(!!process.env.DEV, 'only applicable after build');
		const code = fs.readFileSync(
			path.join(root, '.svelte-kit', 'output', 'server', 'chunks', 'prerender.remote.js')
		);
		expect(code.includes('const with_read = prerender(')).toBe(false);
	});

	test('treeshaken prerendered remote functions explain how to call them at runtime', () => {
		test.skip(!!process.env.DEV, 'only applicable after build');
		const code = fs.readFileSync(
			path.join(root, '.svelte-kit', 'output', 'server', 'chunks', 'prerender.remote.js'),
			'utf-8'
		);
		const thrown = /throw new Error\(("(?:[^"\\]|\\.)*")\)/.exec(code);
		expect(thrown).not.toBeNull();
		expect(String(JSON.parse(/** @type {RegExpExecArray} */ (thrown)[1]))).toContainKitDiagnostic(
			'remote_prerender_not_dynamic'
		);
	});

	test('non-dynamic prerendered remote functions with colliding basenames are treeshaken', () => {
		test.skip(!!process.env.DEV, 'only applicable after build');

		const chunks = path.join(root, '.svelte-kit', 'output', 'server', 'chunks');

		const code = fs
			.globSync(`${chunks}/*.js`)
			.map((file) => fs.readFileSync(file, 'utf-8'))
			.join('\n');

		const maps = fs
			.globSync(`${chunks}/*.js.map`)
			.map((file) => fs.readFileSync(file, 'utf-8'))
			.join('\n');

		expect(code).not.toContain('++invocations');
		expect(code).not.toContain("() => 'hello'");

		// check that we didn't accidentally delete the code we're treeshaking
		expect(maps).toContain('++invocations');
		expect(maps).toContain("() => 'hello'");
	});

	test("doesn't duplicate remote modules in the generated manifest", () => {
		test.skip(!!process.env.DEV, 'only applicable after build');
		const code = fs.readFileSync(
			path.join(root, '.svelte-kit', 'output', 'server', 'manifest.js'),
			'utf8'
		);
		const hashes = [
			...code.matchAll(/'([a-z0-9]+)': __memo\(\(\) => import\('\.\/chunks\/remote-/g)
		].map((match) => match[1]);

		expect(hashes.length).toBeGreaterThan(0);
		expect(new Set(hashes).size).toBe(hashes.length);
	});

	test("form doesn't refresh queries when not a remote request", async ({ page }) => {
		await page.goto(`/remote/form/noop-refresh-non-enhanced/${Date.now()}${Math.random()}`);

		const count = page.locator('#count');
		await expect(count).toHaveText('Count: 0');

		await page.click('button');

		// Should not have refreshed
		await expect(count).toHaveText('Count: 0');
	});

	test(".as('hidden', value) is correctly received on the server", async ({ page }) => {
		await page.goto('/remote/form/as-value');

		const form1 = page.locator('form').nth(0);
		await form1.locator('button').click();

		await expect(page.locator('#hidden-string')).toHaveText('hidden string: string');
		await expect(page.locator('#hidden-number')).toHaveText('hidden number: 1');
		await expect(page.locator('#hidden-boolean')).toHaveText('hidden boolean: true');
	});
});
