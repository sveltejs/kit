import { expect } from '@playwright/test';
import { test } from '../../../../../utils.js';

test.skip(({ javaScriptEnabled }) => !javaScriptEnabled);

test('an unfocused iframe does not steal focus during client-side navigation', async ({ page }) => {
	await page.goto('/accessibility/iframe-focus');
	await page.getByRole('button', { name: 'Load iframe' }).click();

	const frame = page.frameLocator('iframe');
	await expect(frame.getByRole('heading')).toHaveText('Embedded page');

	const navigate = page.getByRole('button', { name: 'Navigate iframe' });
	await navigate.click();

	await expect(frame.getByRole('heading')).toHaveText('Next page');
	await expect(navigate).toBeFocused();
});
