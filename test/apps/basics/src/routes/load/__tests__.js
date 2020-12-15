import * as assert from 'uvu/assert';

export default function(test, is_dev) {
	test('loads', async ({ visit, contains }) => {
		await visit('/load');
		assert.ok(await contains('bar == bar'));
	});

	test('data is serialized', async ({ visit, html, capture_requests, js }) => {
		const requests = await capture_requests(async () => {
			await visit('/load/serialization');
		});

		const payload = '{"status":200,"statusText":"OK","headers":{"content-type":"application/json"},"body":"{\\"answer\\":42}"}';

		if (!js) { // by the time JS has run, hydration will have nuked these scripts
			const script_contents = await html('script[type="svelte-data"]');

			assert.equal(
				script_contents,
				payload,
				'Page should contain serialized data'
			);
		}

		assert.ok(!requests.some(r => r.endsWith('/load/serialization.json')), 'Should not load JSON over the wire');
	});

	test('prefers static data over endpoint', async ({ visit, text }) => {
		await visit('/load/foo');
		assert.equal(await text('h1'), 'static file');
	});

	test('context is inherited', async ({ visit, text }) => {
		await visit('/load/context/a/b/c');
		assert.equal(await text('h1'), 'message: original + new');
		assert.equal(await text('pre'), JSON.stringify({
			x: 'a',
			y: 'b',
			z: 'c'
		}));
	});
}
