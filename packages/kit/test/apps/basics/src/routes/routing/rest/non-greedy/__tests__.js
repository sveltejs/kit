import * as assert from 'uvu/assert';

/** @type {import('../../../../../../../types').TestMaker} */
export default function (test) {
	test(
		'rest parameters do not swallow characters',
		'/routing/rest/non-greedy',
		async ({ page, clicknav, back }) => {
			await clicknav('[href="/routing/rest/non-greedy/foo/one/two"]');
			assert.ok((await page.textContent('h1')) === 'non-greedy');
			assert.equal(await page.textContent('h2'), '{"rest":"one/two"}');

			await clicknav('[href="/routing/rest/non-greedy/food/one/two"]');
			assert.ok((await page.textContent('h1')) !== 'non-greedy');

			await back();

			await clicknav('[href="/routing/rest/non-greedy/one-bar/two/three"]');
			assert.ok((await page.textContent('h1')) === 'non-greedy');
			assert.equal(await page.textContent('h2'), '{"dynamic":"one","rest":"two/three"}');

			await clicknav('[href="/routing/rest/non-greedy/one-bard/two/three"]');
			assert.ok((await page.textContent('h1')) !== 'non-greedy');
		}
	);
}
