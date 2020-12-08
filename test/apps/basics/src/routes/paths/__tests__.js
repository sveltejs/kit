import * as assert from 'uvu/assert';

export default function (test) {
	test('includes paths', async ({ visit, html }) => {
		await visit('/paths');

		const json = await html('pre');

		assert.equal(json, JSON.stringify({
			base: '',
			assets: '/.'
		}));
	});
}
