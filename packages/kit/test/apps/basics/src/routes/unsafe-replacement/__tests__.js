import * as assert from 'uvu/assert';

export default function (test) {
	test('replaces %svelte.xxx% tags safely', '/unsafe-replacement', async ({ page }) => {
		assert.match(await page.textContent('body'), '$& $&');
	});
}
