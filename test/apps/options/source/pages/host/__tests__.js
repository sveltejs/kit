import * as assert from 'uvu/assert';

export default function (test) {
	test('sets host', async ({ visit, contains }) => {
		await visit('/host');

		assert.ok(await contains('host from preload: example.com'), 'Sets host in preload');
		assert.ok(await contains('host from page store: example.com'), 'Sets host in page store');
		assert.ok(await contains('host from endpoint: example.com'), 'Sets host in endpoint');
	});
}
