import fs from 'node:fs';
import process from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

test.skip(({ javaScriptEnabled }) => javaScriptEnabled);

const root = path.resolve(fileURLToPath(import.meta.url), '..', '..');

test.describe('remote functions', () => {
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
	test("form doesn't refresh queries when not a remote request", async ({ page }) => {
		await page.goto(`/remote/form/noop-refresh-non-enhanced/${Date.now()}${Math.random()}`);

		const count = page.locator('#count');
		await expect(count).toHaveText('Count: 0');

		await page.click('button');

		// Should not have refreshed
		await expect(count).toHaveText('Count: 0');
	});
});
