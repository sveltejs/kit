import { expect, test } from '@playwright/test';

test('page renders', async ({ request }) => {
	const response = await request.get('/');
	expect(response.status()).toBe(200);
	expect(await response.text()).toContain('Hello from SvelteKit');
});

test('instrumentation.server.js runs at startup', async ({ request }) => {
	const response = await request.get('/instrumented');
	expect(response.status()).toBe(200);
	expect(await response.text()).toBe('true');
});
