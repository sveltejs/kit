import process from 'node:process';
import { expect } from '@playwright/test';
import { test } from '../../../../../utils.js';

/** @typedef {import('@playwright/test').Response} Response */

test.skip(({ javaScriptEnabled }) => javaScriptEnabled);

test.describe.configure({ mode: 'parallel' });

test.describe('Static files', () => {
	test('does not serve files outside the prerendered directory', async ({ request }) => {
		test.skip(!!process.env.DEV);

		for (const pathname of [
			'/..%5C..%5C..%5C..%5Cpackage.json',
			'/_app/remote/..%5C..%5C..%5C..%5C..%5C..%5Cpackage.json'
		]) {
			const response = await request.get(pathname);
			expect(response.status()).toBe(404);
		}
	});

	test('Filenames are case-sensitive', async ({ request }) => {
		const response = await request.get('/static.JSON');
		expect(response.status()).toBe(404);
	});
});
