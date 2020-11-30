import * as assert from 'uvu/assert';

export default function(test, is_dev) {
	test('preloads', async ({ visit, contains }) => {
		await visit('/preload');
		assert.ok(await contains('bar == bar'));
	});
}
