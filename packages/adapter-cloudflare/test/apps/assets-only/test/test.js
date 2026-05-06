import fs from 'node:fs';
import process from 'node:process';
import { expect, test } from '@playwright/test';

const cwd = process.cwd();

test('assets only works', async ({ page }) => {
	expect(fs.existsSync(`${cwd}/.svelte-kit/output/client/index.html`)).toBeTruthy();

	await page.goto('/');
	await expect(page.locator('p')).toHaveText('hello world!');
});
