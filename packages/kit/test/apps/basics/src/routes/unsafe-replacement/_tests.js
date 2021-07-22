import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test) {
	test('replaces %svelte.xxx% tags safely', '/unsafe-replacement', async ({ page }) => {
		const content = await page.textContent('body');
		if (!content) throw new Error('No body content');
		assert.match(content, '$& $&');
	});
}
