import * as assert from 'uvu/assert';

export default function (test) {
	test('replaces %svelte.xxx% tags safely', async ({ visit, text }) => {
		await visit('/unsafe-replacement');
		assert.match(await text('body'), '$& $&');
	});
}
