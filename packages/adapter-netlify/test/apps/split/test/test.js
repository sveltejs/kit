import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('routes to routes with dynamic params', async ({ page }) => {
	await page.goto('/dynamic/123');
	await expect(page.locator('p')).toHaveText('Hello world!');
});

test('split generates multiple function files', () => {
	const functions_dir = path.resolve(__dirname, '../.netlify/v1/functions');
	const files = fs.readdirSync(functions_dir).filter((f) => f.startsWith('sveltekit-'));
	expect(files.length).toBeGreaterThan(1);
});

test('_redirects are copied to publish directory', () => {
	const redirects = fs.readFileSync(path.resolve(__dirname, '../build/_redirects'), 'utf-8');
	expect(redirects).toContain('/redirect-me /greeting/redirected 301');
});
