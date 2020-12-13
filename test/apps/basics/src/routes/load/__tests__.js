import * as assert from 'uvu/assert';

export default function(test, is_dev) {
	test('loads', async ({ visit, contains }) => {
		await visit('/load');
		assert.ok(await contains('bar == bar'));
	});
}
