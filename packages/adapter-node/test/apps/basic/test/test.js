import { expect, test } from '@playwright/test';

test('SSR', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toContainText('Hello world!');
});

test('CSR', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('button')).toContainText('Toggle: false');
	await page.locator('button').click();
	await expect(page.locator('button')).toContainText('Toggle: true');
});

test('sets X-Accel-Buffering header on text/event-stream responses', async ({ request }) => {
	const response = await request.get('/event-stream');
	expect(response.headers()['content-type']).toContain('text/event-stream');
	expect(response.headers()['x-accel-buffering']).toBe('no');
});

test('sets X-Accel-Buffering header on text/event-stream responses with immutable headers', async ({
	request
}) => {
	const response = await request.get('/event-stream/proxied');
	expect(response.status()).toBe(200);
	expect(response.headers()['x-accel-buffering']).toBe('no');
	expect(await response.text()).toBe('data: hello\n\n');

	// the server is still alive
	expect((await request.get('/event-stream')).status()).toBe(200);
});

test('does not set X-Accel-Buffering header on other responses', async ({ request }) => {
	const response = await request.get('/');
	expect(response.headers()['x-accel-buffering']).toBeUndefined();
});
