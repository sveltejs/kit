import * as assert from 'uvu/assert';

export default function (test, is_dev) {
	test('loads', '/load', async ({ page }) => {
		assert.equal(await page.textContent('h1'), 'bar == bar?');
	});

	test('data is serialized', async ({ base, page, capture_requests, js }) => {
		const requests = await capture_requests(async () => {
			await page.goto(`${base}/load/serialization`);
		});

		const payload =
			'{"status":200,"statusText":"OK","headers":{"content-type":"application/json"},"body":"{\\"answer\\":42}"}';

		if (!js) {
			// by the time JS has run, hydration will have nuked these scripts
			const script_contents = await page.innerHTML('script[type="svelte-data"]');

			assert.equal(script_contents, payload, 'Page should contain serialized data');
		}

		assert.ok(
			!requests.some((r) => r.endsWith('/load/serialization.json')),
			'Should not load JSON over the wire'
		);
	});

	test('prefers static data over endpoint', '/load/foo', async ({ page }) => {
		assert.equal(await page.textContent('h1'), 'static file');
	});

	test('context is inherited', '/load/context/a/b/c', async ({ page, js, app }) => {
		assert.equal(await page.textContent('h1'), 'message: original + new');
		assert.equal(
			await page.textContent('pre'),
			JSON.stringify({
				x: 'a',
				y: 'b',
				z: 'c'
			})
		);

		if (js) {
			await app.goto('/load/context/d/e/f');

			assert.equal(await page.textContent('h1'), 'message: original + new');
			assert.equal(
				await page.textContent('pre'),
				JSON.stringify({
					x: 'd',
					y: 'e',
					z: 'f'
				})
			);
		}
	});

	test(
		'load function is only called when necessary',
		'/load/change-detection/one/a',
		async ({ app, page, js }) => {
			assert.equal(await page.textContent('h1'), 'x: a: 1');

			if (js) {
				await app.goto('/load/change-detection/one/a?unused=whatever');
				assert.equal(await page.textContent('h1'), 'x: a: 1');

				await app.goto('/load/change-detection/two/b');
				assert.equal(await page.textContent('h1'), 'y: b: 1');

				await app.goto('/load/change-detection/one/a');
				assert.equal(await page.textContent('h1'), 'x: a: 1');

				await app.goto('/load/change-detection/one/b');
				assert.equal(await page.textContent('h1'), 'x: b: 2');
			}
		}
	);
}
