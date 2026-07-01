import fs from 'node:fs';
import { execFile } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

const output = fileURLToPath(new URL('../.svelte-kit/output', import.meta.url));

/** @param {string} file */
const read = (file) => fs.readFileSync(`${output}/${file}`, 'utf-8');

test.describe.configure({ mode: 'parallel' });

test.describe('env', () => {
	test('resolves upwards', async ({ page }) => {
		test.skip(!process.env.DYNAMIC_PUBLIC_ENV);

		await page.goto('/basepath/env');
		expect(await page.textContent('[data-testid="public"]')).toBe('public: hello');
		expect(await page.textContent('[data-testid="private-dynamic"]')).toBe(
			'private dynamic: secret resolved at runtime'
		);
		expect(await page.textContent('[data-testid="private-static"]')).toBe(
			'private static: secret resolved at build time'
		);
		expect(await page.textContent('[data-testid="private-validated-default"]')).toBe(
			'private validated default: foo'
		);
	});

	test('applies explicit env vars to %sveltekit.env%', async ({ page }) => {
		test.skip(!process.env.DYNAMIC_PUBLIC_ENV);

		await page.goto('/basepath');
		await expect(page.locator('body')).toHaveAttribute('data-message', 'hello');
	});

	test('does not import env.js from prerendered pages when there are no public dynamic environment variables', ({
		javaScriptEnabled
	}) => {
		test.skip(javaScriptEnabled || !!process.env.DEV || !!process.env.DYNAMIC_PUBLIC_ENV);

		const root_page = read('prerendered/pages/env/prerendered.html');
		expect(root_page).not.toContain('_app/env.js');
		expect(fs.existsSync(`${output}/prerendered/dependencies/_app/env.js`)).toBeFalsy();
	});
});

test.describe('$app/env', () => {
	test('correct values are exported from $app/env/*', async ({ page }) => {
		test.skip(!process.env.DYNAMIC_PUBLIC_ENV);

		await page.goto('/basepath/env/import-all');

		await expect(page.locator('[data-private]')).toHaveText(
			JSON.stringify({
				PRIVATE_EXPLICIT_ENV: 'secret resolved at runtime',
				PRIVATE_STATIC_EXPLICIT_ENV: 'secret resolved at build time',
				PRIVATE_VALIDATED_DEFAULT_ENV: 'foo',
				RUNTIME_ONLY: 'secret'
			})
		);

		await expect(page.locator('[data-public]')).toHaveText(JSON.stringify({ MESSAGE: 'hello' }));
	});

	test('loads dynamic public environment variables in the service worker', ({
		javaScriptEnabled
	}) => {
		test.skip(javaScriptEnabled || !!process.env.DEV || !process.env.DYNAMIC_PUBLIC_ENV);

		const content = read('/prerendered/dependencies/_app/env.js');
		expect(content).toContain('hello');

		const service_worker = read('/client/service-worker.js');
		expect(service_worker).toContain('import { env } from "/basepath/_app/env.js"');
	});

	test('does not load env.js in the service worker when there are no public dynamic environment variables', ({
		javaScriptEnabled
	}) => {
		test.skip(javaScriptEnabled || !!process.env.DEV || !!process.env.DYNAMIC_PUBLIC_ENV);

		const serviceWorker = read('/client/service-worker.js');
		expect(serviceWorker).not.toContain('import { env } from "/basepath/_app/env.js"');
		expect(fs.existsSync(`${output}/prerendered/dependencies/_app/env.js`)).toBeFalsy();
	});

	test('runtime-only validation', async ({ page, javaScriptEnabled }) => {
		test.skip(javaScriptEnabled);

		await page.goto('/basepath/env/runtime-only');
		await expect(page.locator('p')).toHaveText('runtime-only environment variable exists: true');

		// test validation runs at runtime
		if (!process.env.DEV) {
			const app_dir = fileURLToPath(new URL('..', import.meta.url));
			const output = await new Promise((resolve) => {
				execFile('pnpm', ['vite', 'preview'], { cwd: app_dir }, (_, stdout, stderr) =>
					resolve(stdout + stderr)
				);
			});
			expect(output).toContain('Invalid environment variables');
			expect(output).toContain('RUNTIME_ONLY');
		}
	});
});
