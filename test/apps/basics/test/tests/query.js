import * as assert from 'uvu/assert';

export default function(test, is_dev) {
	test('exposes query string parameters', async ({ visit, html }) => {
		await visit('/query/echo?foo=1');

		assert.equal(await html('#one'), '{"foo":"1"}');
		assert.equal(await html('#two'), '{"foo":"1"}');
	});
}