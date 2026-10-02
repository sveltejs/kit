import { expect } from '@playwright/test';
import { test } from '../../../../utils.js';

/** @typedef {import('@playwright/test').Response} Response */

test.skip(({ javaScriptEnabled }) => javaScriptEnabled);

test.describe.configure({ mode: 'parallel' });

test.describe('Static files', () => {
	test('Filenames are case-sensitive', async ({ request }) => {
		const response = await request.get('/static.JSON');
		expect(response.status()).toBe(404);
	});
});
