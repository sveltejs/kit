import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('worker works', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toContainText('Sum: 3');
});

test("('$app/server').read works", async ({ page }) => {
	const filecontent = await fs.readFile(path.resolve(__dirname, '../../../file.txt'), 'utf-8');
	const response = await page.goto('/read');
	expect(await response.text()).toBe(filecontent);
});
