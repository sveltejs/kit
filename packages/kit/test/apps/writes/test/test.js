import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { test } from '../../../utils.js';

/** @typedef {import('@playwright/test').Response} Response */

test.describe.configure({ mode: 'serial' });

test.describe('Filesystem updates', () => {
	if (process.env.DEV) {
		test('New route is immediately available in dev', async ({ page }) => {
			await page.goto('/new-route');

			// hash the filename so that it won't conflict with
			// future test file that has the same name
			const route = 'zzzz' + Date.now();
			const content = 'Hello new route';
			const __dirname = path.dirname(fileURLToPath(import.meta.url));
			const filepath = path.join(__dirname, `../src/routes/new-route/${route}/+page.svelte`);
			const dir = path.dirname(filepath);

			try {
				fs.mkdirSync(dir);
				fs.writeFileSync(filepath, `<h1>${content}</h1>`);
				await page.waitForTimeout(500); // this is the rare time we actually need waitForTimeout; we have no visibility into whether the module graph has been invalidated
				await page.goto(`/new-route/${route}`);

				expect(await page.textContent('h1')).toBe(content);
			} finally {
				fs.rmSync(dir, { recursive: true });
			}
		});
	}

	test('Components are not double-mounted', async ({ page, javaScriptEnabled }) => {
		const file = fileURLToPath(new URL('../src/routes/double-mount/+page.svelte', import.meta.url));
		const contents = fs.readFileSync(file, 'utf-8');

		const mounted = javaScriptEnabled ? 1 : 0;

		try {
			// we write to the file, to trigger HMR invalidation
			fs.writeFileSync(file, contents.replace(/PLACEHOLDER:\d+/, `PLACEHOLDER:${Date.now()}`));
			await page.goto('/double-mount');
			expect(await page.textContent('h1')).toBe(`mounted: ${mounted}`);
			await page.click('button');
			await page.waitForTimeout(100);
			expect(await page.textContent('h1')).toBe(`mounted: ${mounted}`);
		} finally {
			fs.writeFileSync(file, contents.replace(/PLACEHOLDER:\d+/, 'PLACEHOLDER:0'));
		}
	});

	test('Universal node is updated when page options change', async ({
		page,
		javaScriptEnabled,
		get_computed_style
	}) => {
		test.skip(!process.env.DEV || !javaScriptEnabled);

		const file = fileURLToPath(new URL('../src/routes/universal/+page.js', import.meta.url));
		const contents = fs.readFileSync(file, 'utf-8');

		try {
			fs.writeFileSync(file, contents.replace(/export const ssr = false;\n/, ''));
			await page.goto('/universal', { wait_for_started: false });
			expect(await get_computed_style('body', 'background-color')).not.toBe('rgb(255, 0, 0)');
			await expect(page.locator('h1')).toHaveText('Internal Error');
		} finally {
			fs.writeFileSync(file, contents);
		}

		await page.waitForTimeout(500); // this is the rare time we actually need waitForTimeout; we have no visibility into whether the module graph has been invalidated
		// a reload is required because Vite HMR doesn't trigger if the page has never loaded successfully
		await page.reload();
		expect(await get_computed_style('body', 'background-color')).toBe('rgb(255, 0, 0)');

		try {
			fs.writeFileSync(file, contents.replace(/export const ssr = .*;/, 'export const ssr = !1;'));
			await page.waitForTimeout(500); // this is the rare time we actually need waitForTimeout; we have no visibility into whether the module graph has been invalidated
			expect(await get_computed_style('body', 'background-color')).not.toBe('rgb(255, 0, 0)');
			await expect(page.locator('h1')).toHaveText('Internal Error');
		} finally {
			fs.writeFileSync(file, contents.replace(/\\nexport const ssr = false;\\n/, ''));
		}
	});

	test('Universal node is updated when parent page options change', async ({
		page,
		javaScriptEnabled,
		get_computed_style
	}) => {
		test.skip(!process.env.DEV || !javaScriptEnabled);

		const file = fileURLToPath(
			new URL('../src/routes/universal/parent-changed/+layout.js', import.meta.url)
		);
		const contents = fs.readFileSync(file, 'utf-8');

		try {
			await page.goto('/universal/parent-changed');
			expect(await get_computed_style('body', 'background-color')).toBe('rgb(255, 0, 0)');

			fs.writeFileSync(file, contents.replace(/export const ssr = false;/, ''));
			await page.waitForTimeout(500); // this is the rare time we actually need waitForTimeout; we have no visibility into whether the module graph has been invalidated
			expect(await get_computed_style('body', 'background-color')).not.toBe('rgb(255, 0, 0)');
			await expect(page.locator('h1')).toHaveText('Internal Error');
		} finally {
			fs.writeFileSync(file, contents);
		}
	});
});
