import * as assert from 'uvu/assert';

export default function (test, is_dev) {
	test('prints validation errors', async ({ visit, contains }) => {
		await visit('/invalid');

		if (is_dev) {
			assert.ok(await contains('AMP validation failed'));
			assert.ok(await contains('The tag \'img\' may only appear as a descendant of tag \'noscript\''));
			assert.ok(await contains('&lt;img src="potato.jpg"&gt;'));
		} else {
			assert.ok(await contains('<img src="potato.jpg">'));
		}
	});
}
