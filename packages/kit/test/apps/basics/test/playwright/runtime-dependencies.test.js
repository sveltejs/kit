import { test } from '../../../../utils.js';
import { expect } from '../../../../playwright-matchers.js';

test('isolates runtime dependencies during client navigation', async ({
	page,
	app,
	context,
	javaScriptEnabled
}) => {
	test.skip(!javaScriptEnabled, 'client navigation requires JavaScript');

	await page.goto('/');
	const [response] = await Promise.all([
		page.waitForResponse((response) =>
			response.url().includes('/runtime-dependencies/__data.json')
		),
		app.goto('/runtime-dependencies')
	]);

	expect(response.status()).toBe(200);
	await expect(page.locator('#current')).toHaveText('https://example.com/kit');
	await expect(page.locator('#current')).toHaveClass('kit current');
	await expect(page.locator('#legacy-cookie')).toHaveText('legacy=app');
	await expect(page.locator('#legacy-devalue')).toHaveText('{hello:"app"}');
	await expect(page.locator('#legacy-class')).toHaveClass('app legacy');
	expect(await context.cookies()).toEqual(
		expect.arrayContaining([expect.objectContaining({ name: 'runtime-dependency', value: 'kit' })])
	);
});
