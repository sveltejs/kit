import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

test.skip(({ javaScriptEnabled }) => !!javaScriptEnabled);

test.describe.configure({ mode: 'parallel' });

test.describe('Rewrites', () => {
	test('Rewrites to a different page', async ({ page }) => {
		await page.goto('/rewrites/from');
		expect(await page.textContent('h1')).toBe('Successfully rewritten');
	});
});
