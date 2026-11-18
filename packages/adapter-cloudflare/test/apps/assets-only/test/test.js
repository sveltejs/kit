import { expect, test } from '@playwright/test';

test('fallback page works',async ({ page }) => {
	await page.goto('/dynamic');
	await expect(page.locator('h1')).toHaveText('dynamic');
});

test('does not deploy a worker', async ({ request }) => {
	// a Worker would receive this request, since it isn't a navigation and doesn't
	// match an asset, and respond with a 404 because no route matches it
	const response = await request.get('/not/a/route');
	expect(response.status()).toBe(200);
	expect(response.headers()['content-type']).toContain('text/html');
});
