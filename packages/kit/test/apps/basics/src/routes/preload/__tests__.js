import * as assert from 'uvu/assert';

/** @type {import('../../../../../types').TestMaker} */
export default function test(test) {
	test('errors on preload', '/preload', async ({ page }) => {
		await page.click('[href="/preload/uses-preload"]');

		assert.equal(await page.textContent('h1'), '500');
		assert.equal(await page.textContent('footer'), 'Custom layout');
		assert.equal(
			await page.textContent('#message'),
			'This is your custom error page saying: "preload has been deprecated in favour of load. Please consult the documentation: https://kit.svelte.dev/docs#load"'
		);
	});
}
