import http from 'http';
import * as ports from 'port-authority';
import * as assert from 'uvu/assert';

/** @type {import('../../../../../types').TestMaker} */
export default function (test, is_dev) {
	test('loads', '/load', async ({ page }) => {
		assert.equal(await page.textContent('h1'), 'bar == bar?');
	});

	test('data is serialized', null, async ({ base, page, capture_requests, js }) => {
		const requests = await capture_requests(async () => {
			await page.goto(`${base}/load/serialization`);
		});

		const payload =
			'{"status":200,"statusText":"","headers":{"content-type":"application/json"},"body":"{\\"answer\\":42}"}';

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

	test('fetch accepts a Request object', '/load', async ({ page, clicknav }) => {
		await clicknav('[href="/load/fetch-request"]');
		assert.equal(await page.textContent('h1'), 'the answer is 42');
	});

	test('handles large responses', '/load', async ({ base, page }) => {
		const port = await ports.find(4000);

		const chunk_size = 50000;
		const chunk_count = 100;
		const total_size = chunk_size * chunk_count;

		let chunk = '';
		for (let i = 0; i < chunk_size; i += 1) {
			chunk += String(i % 10);
		}

		let times_responded = 0;

		const server = http.createServer(async (req, res) => {
			if (req.url === '/large-response.json') {
				times_responded += 1;

				res.writeHead(200, {
					'Access-Control-Allow-Origin': '*'
				});

				for (let i = 0; i < chunk_count; i += 1) {
					if (!res.write(chunk)) {
						await new Promise((fulfil) => {
							res.once('drain', () => {
								fulfil();
							});
						});
					}
				}

				res.end();
			}
		});

		await new Promise((fulfil) => {
			server.listen(port, () => fulfil());
		});

		await page.goto(`${base}/load/large-response?port=${port}`);
		assert.equal(await page.textContent('h1'), `text.length is ${total_size}`);

		assert.equal(times_responded, 1);

		server.close();
	});

	test(
		'makes credentialed fetches to endpoints by default',
		'/load',
		async ({ page, clicknav }) => {
			await clicknav('[href="/load/fetch-credentialed"]');
			assert.equal(await page.textContent('h1'), 'Hello SvelteKit!');
		}
	);
}
