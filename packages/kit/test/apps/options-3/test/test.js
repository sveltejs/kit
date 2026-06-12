import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

/** @typedef {import('@playwright/test').Response} Response */

test.describe.configure({ mode: 'parallel' });

test.describe("bundleStrategy: 'inline'", () => {
	test.skip(({ javaScriptEnabled }) => !javaScriptEnabled || !!process.env.DEV);

	test('serialization works with streaming', async ({ page }) => {
		await page.goto('/serialization-stream');
		await expect(page.locator('h1', { hasText: 'It works!' })).toBeVisible();
	});
});

test.describe("bundleStrategy: 'inline' build output", () => {
	test.skip(() => !!process.env.DEV);

	const client = fileURLToPath(new URL('../.svelte-kit/output/client', import.meta.url));

	const emitted = () =>
		fs.existsSync(`${client}/_app/immutable`)
			? fs.readdirSync(`${client}/_app/immutable`, { recursive: true }).map(String)
			: [];

	test('does not emit the inlined bundle and stylesheet files', () => {
		const files = emitted();
		expect(files.some((file) => file.includes('bundle.'))).toBe(false);
		expect(files.some((file) => file.includes('style.'))).toBe(false);
	});

	test('omits inlined files from the service worker build list', () => {
		const content = fs.readFileSync(`${client}/service-worker.js`, 'utf-8');
		expect(content).not.toMatch('immutable');
	});

	test('still emits version.json', () => {
		expect(fs.existsSync(`${client}/_app/version.json`)).toBe(true);
	});
});
