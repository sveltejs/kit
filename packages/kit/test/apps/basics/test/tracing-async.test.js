import process from 'node:process';
import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

test('SSR works with import interception and experimental async', async ({ request }) => {
	test.skip(!!process.env.DEV || process.env.SVELTE_ASYNC !== 'true');

	const response = await request.get('/tracing/async-ssr');
	expect(response.status()).toBe(200);
	expect(await response.text()).toContain('<h1>rendered</h1>');
});
