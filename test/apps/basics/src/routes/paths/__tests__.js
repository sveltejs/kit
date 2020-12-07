import * as assert from 'uvu/assert';

export default function (test) {
	test('includes paths', async ({ visit, contains }) => {
		await visit('/paths');

		assert.ok(await contains(JSON.stringify({
			base: '',
			assets: '',
			generated: '_app'
		})));
	});
}
