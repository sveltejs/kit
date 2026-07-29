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

test('does not set X-Accel-Buffering header on other responses', async ({ request }) => {
	const response = await request.get('/');
	expect(response.headers()['x-accel-buffering']).toBeUndefined();
});

test('serves static files with the Content-Type from the manifest', async ({ request }) => {
	// https://github.com/sveltejs/kit/issues/13753
	const response = await request.get('/test.ico');
	expect(response.status()).toBe(200);
	expect(response.headers()['content-type']).toBe('image/x-icon');
});

test('serves static HTML with a charset', async ({ request }) => {
	const response = await request.get('/page.html');
	expect(response.status()).toBe(200);
	expect(response.headers()['content-type']).toBe('text/html;charset=utf-8');
});
