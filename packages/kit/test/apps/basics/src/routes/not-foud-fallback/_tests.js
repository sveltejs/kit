import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test) {
	test(
		'should show root __error.svelte and __layout.svelte',
		'/not-foud-fallback/unknown',
		async ({ page }) => {
			assert.equal(
				await page.textContent('#message'),
				'This is your custom error page saying: "Not found: /not-foud-fallback/unknown"'
			);
			assert.equal(await page.textContent('footer'), 'Custom layout');
		}
	);

	test(
		'should show child1 __error.svelte and __layout.svelte',
		'/not-foud-fallback/child1/unknown',
		async ({ page }) => {
			assert.equal(await page.textContent('h1'), 'child1 error page');
			assert.equal(await page.textContent('footer'), 'child1 layout component');
		}
	);

	test(
		'should show root __error.svelte and __layout.svelte',
		'/not-foud-fallback/child2/unknown',
		async ({ page }) => {
			assert.equal(
				await page.textContent('#message'),
				'This is your custom error page saying: "Not found: /not-foud-fallback/child2/unknown"'
			);
			assert.equal(await page.textContent('footer'), 'Custom layout');
		}
	);

	test(
		'should show child1 __error.svelte and __layout.svelte',
		'/not-foud-fallback/child1/grand-child/unknown',
		async ({ page }) => {
			assert.equal(await page.textContent('h1'), 'child1 error page');
			assert.equal(await page.textContent('footer'), 'child1 layout component');
		}
	);
}
