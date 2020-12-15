import * as assert from 'uvu/assert';

export default function (test, is_dev) {
	test('amp is true', async ({ visit, contains }) => {
		await visit('/valid');

		assert.ok(await contains(`Hello from the server in ${is_dev ? 'dev' : 'prod'} mode!`));
		assert.ok(await contains('amp is true'));
	});
}
