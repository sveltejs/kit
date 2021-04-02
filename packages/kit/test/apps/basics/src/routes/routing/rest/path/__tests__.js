import * as assert from 'uvu/assert';

/** @type {import('../../../../../../../types').TestMaker} */
export default function (test) {
	test(
		'reloads when navigating between ...rest pages',
		'/routing/rest/path/one',
		async ({ page, clicknav }) => {
			assert.equal(await page.textContent('h1'), 'path: /routing/rest/path/one');

			await clicknav('[href="/routing/rest/path/two"]');
			assert.equal(await page.textContent('h1'), 'path: /routing/rest/path/two');

			await clicknav('[href="/routing/rest/path/three"]');
			assert.equal(await page.textContent('h1'), 'path: /routing/rest/path/three');
		}
	);
}
