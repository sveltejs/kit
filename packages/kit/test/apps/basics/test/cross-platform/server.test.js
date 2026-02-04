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

test.describe('$env access outside the Vite pipeline', () => {
	test('$env/static/public', async () => {
		const env = await import('$env/static/public');
		expect(env.PUBLIC_DYNAMIC).toBe('accessible anywhere/evaluated at run time');
	});

	test('$env/static/private', async () => {
		const env = await import('$env/static/private');
		expect(env.PRIVATE_STATIC).toBe('accessible to server-side code/replaced at build time');
	});

	test('$env/dynamic/public', async () => {
		const { env } = await import('$env/dynamic/public');
		expect(env.PUBLIC_DYNAMIC).toBe('accessible anywhere/evaluated at run time');
	});

	test('$env/dynamic/private', async () => {
		const { env } = await import('$env/dynamic/private');
		expect(env.PRIVATE_DYNAMIC).toBe('accessible to server-side code/evaluated at run time');
	});
});
