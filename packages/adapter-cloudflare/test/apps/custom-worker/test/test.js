import { expect, test } from '@playwright/test';

test('custom worker entry point', async ({ request }) => {
	const response = await request.get('/');
	expect(await response.text()).toContain('hello world!');
	expect(response.headers()).toHaveProperty('x-custom-worker', 'true');
});

// TODO: test generating a fallback page
