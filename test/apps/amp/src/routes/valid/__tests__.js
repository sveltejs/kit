import * as assert from 'uvu/assert';

export default function (test, is_dev) {
	test('amp is true', async ({ visit, contains, $ }) => {
		await visit('/valid');

		assert.ok(await contains(`Hello from the server in ${is_dev ? 'dev' : 'prod'} mode!`));
		assert.ok(await contains('The answer is 42'));
		assert.ok(await contains('amp is true'));

		const script = await $('script[type="svelte-data"]');
		assert.ok(!script, 'Should not include serialized data');
	});
}
