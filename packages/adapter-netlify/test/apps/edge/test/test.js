import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

// TODO: use import.meta.dirname in Kit 3
const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('read from $app/server works', async ({ request }) => {
	const content = fs.readFileSync(path.resolve(__dirname, '../src/routes/read/file.txt'), 'utf-8');
	const response = await request.get('/read');
	expect(await response.text()).toBe(content);
});

test('treeshakes component from the server bundle if SSR is turned off', async ({ page }) => {
	await page.goto('/treeshake-server');
	const component_text = 'this should never appear in the server bundle';
	const server_bundle = fs.readFileSync(
		path.resolve(__dirname, '../.netlify/edge-functions/render.js'),
		'utf-8'
	);
	expect(server_bundle).not.toContain(component_text);
	await expect(page.locator('p')).toHaveText(component_text);
});
