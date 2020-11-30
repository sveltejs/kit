import * as assert from 'uvu/assert';

export default function (test) {
	/** @todo The body is "$& %svelte.body%"" which seems like a bug */
	test.skip('replaces %sapper.xxx% tags safely', async ({ visit, text }) => {
		await visit('/unsafe-replacement');

		assert.match(await text('body'), '$& $&');
	});
}
