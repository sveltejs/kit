import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

test.describe.configure({ mode: 'parallel' });

test('renders error page on nonexistent route', async ({ page }) => {
	await page.goto('/nonexistent');
	expect(await page.textContent('p')).toBe('This is your custom error page.');
});

test('renders error page on manually 404ing route', async ({ page }) => {
	await page.goto('/thrown-error');
	expect(await page.textContent('p')).toBe('This is your custom error page.');
});
