import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

/** @typedef {import('@playwright/test').Response} Response */

test.describe.configure({ mode: 'serial' });

test.describe('Serialization', () => {
	test('A custom data type can be serialized/deserialized', async ({ page }) => {
		await page.goto('/');
		expect(await page.textContent('h1')).toBe('it worked!');
	});
});
