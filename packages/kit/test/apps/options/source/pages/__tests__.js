import * as assert from 'uvu/assert';

export default function (test, is_dev) {
	test('serves /', '/', async ({ contains, js }) => {
		assert.ok(await contains('I am in the template'), 'Should show custom template contents');
		assert.ok(await contains("We're on index.svelte"), 'Should show page contents');
		assert.ok(
			await contains(
				`Hello from the ${js ? 'client' : 'server'} in ${is_dev ? 'dev' : 'prod'} mode!`
			),
			'Should run JavaScript'
		);
	});
}
