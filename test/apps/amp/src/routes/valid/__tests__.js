import * as assert from 'uvu/assert';

export default function (test, is_dev) {
	test('amp is true', async ({ $, contains, page, visit }) => {
		await visit('/valid');

		await assertContains(`Hello from the server in ${is_dev ? 'dev' : 'prod'} mode!`);
		await assertContains('The answer is 42');
		await assertContains('amp is true');

		const script = await $('script[type="svelte-data"]');
		assert.ok(!script, 'Should not include serialized data');

		async function assertContains(message) {
			assert.ok(await contains(message), `Did not find "${message}" in ${await page.innerHTML('body')}`);
		}
	});
}
