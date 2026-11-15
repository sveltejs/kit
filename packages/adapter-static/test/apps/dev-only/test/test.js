import { expect, test } from '@playwright/test';

/**
 * @param {import('@playwright/test').APIResponse} response
 * @param {string} file
 */
async function expect_dynamic_route_error(response, file) {
	expect(response.status()).toBe(500);
	const text = await response.text();
	expect(text).toContain(
		`@sveltejs/adapter-static: all routes must be fully prerenderable, but found the following routes that are dynamic:\n  - ${file}\n`
	);
	expect(text).toContain('You have the following options:');
}

test('a page that is not prerendered fails like the build', async ({ request }) => {
	await expect_dynamic_route_error(await request.get('/dynamic'), 'src/routes/dynamic');
});

test('an endpoint that is not prerendered fails like the build', async ({ request }) => {
	await expect_dynamic_route_error(await request.get('/dynamic.json'), 'src/routes/dynamic.json');
});

test('a page under a prerendered root layout does not fail', async ({ page }) => {
	const response = await page.goto('/');
	expect(response?.status()).toBe(200);
	await expect(page.locator('h1')).toHaveText('answer: 42');
});

test('an endpoint without a `prerender` export does not fail', async ({ request }) => {
	const response = await request.get('/inherited.json');
	expect(response.status()).toBe(200);
	expect(await response.json()).toEqual({ answer: 42 });
});
