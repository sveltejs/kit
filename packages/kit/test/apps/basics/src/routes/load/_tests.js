import http from 'http';
import * as ports from 'port-authority';
import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test, is_dev) {
	test('loads', '/load', async ({ page }) => {
		assert.equal(await page.textContent('h1'), 'bar == bar?');
	});

	test('GET fetches are serialized', null, async ({ base, page, capture_requests, js }) => {
		const requests = await capture_requests(async () => {
			await page.goto(`${base}/load/serialization`);
		});

		const payload =
			'{"status":200,"statusText":"","headers":{"content-type":"application/json; charset=utf-8"},"body":"{\\"answer\\":42}"}';

		if (!js) {
			// by the time JS has run, hydration will have nuked these scripts
			const script_contents = await page.innerHTML('script[data-type="svelte-data"]');

			assert.equal(script_contents, payload, 'Page should contain serialized data');
		}

		assert.ok(
			!requests.some((r) => r.endsWith('/load/serialization.json')),
			'Should not load JSON over the wire'
		);
	});

	test('POST fetches are serialized', null, async ({ base, page, capture_requests, js }) => {
		const requests = await capture_requests(async () => {
			await page.goto(`${base}/load/serialization-post`);
		});

		assert.equal(await page.textContent('h1'), 'a: X');
		assert.equal(await page.textContent('h2'), 'b: Y');

		const payload_a =
			'{"status":200,"statusText":"","headers":{"content-type":"text/plain;charset=UTF-8"},"body":"X"}';

		const payload_b =
			'{"status":200,"statusText":"","headers":{"content-type":"text/plain;charset=UTF-8"},"body":"Y"}';

		if (!js) {
			// by the time JS has run, hydration will have nuked these scripts
			const script_contents_a = await page.innerHTML(
				'script[data-type="svelte-data"][data-url="/load/serialization-post.json"][data-body="3t25"]'
			);

			const script_contents_b = await page.innerHTML(
				'script[data-type="svelte-data"][data-url="/load/serialization-post.json"][data-body="3t24"]'
			);

			assert.equal(script_contents_a, payload_a, 'Page should contain serialized data');
			assert.equal(script_contents_b, payload_b, 'Page should contain serialized data');
		}

		assert.ok(
			!requests.some((r) => r.endsWith('/load/serialization.json')),
			'Should not load JSON over the wire'
		);
	});

	test('json string is returned', '/load/relay', async ({ page }) => {
		assert.equal(await page.textContent('h1'), '42');
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
			assert.equal(await page.textContent('h1'), 'layout loads: 1');
			assert.equal(await page.textContent('h2'), 'x: a: 1');

			if (js) {
				await app.goto('/load/change-detection/one/a?unused=whatever');
				assert.equal(await page.textContent('h2'), 'x: a: 1');

				await app.goto('/load/change-detection/two/b');
				assert.equal(await page.textContent('h2'), 'y: b: 1');

				await app.goto('/load/change-detection/one/a');
				assert.equal(await page.textContent('h2'), 'x: a: 1');

				await app.goto('/load/change-detection/one/b');
				assert.equal(await page.textContent('h2'), 'x: b: 2');

				await app.invalidate('/load/change-detection/data.json');
				assert.equal(await page.textContent('h1'), 'layout loads: 2');
				assert.equal(await page.textContent('h2'), 'x: b: 2');

				await app.invalidate('/load/change-detection/data.json');
				assert.equal(await page.textContent('h1'), 'layout loads: 3');
				assert.equal(await page.textContent('h2'), 'x: b: 2');

				await app.invalidate('change-detection-layout');
				assert.equal(await page.textContent('h1'), 'layout loads: 4');
				assert.equal(await page.textContent('h2'), 'x: b: 2');
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
								fulfil(undefined);
							});
						});
					}
				}

				res.end();
			}
		});

		await new Promise((fulfil) => {
			server.listen(port, () => fulfil(undefined));
		});

		await page.goto(`${base}/load/large-response?port=${port}`);
		assert.equal(await page.textContent('h1'), `text.length is ${total_size}`);

		assert.equal(times_responded, 1);

		server.close();
	});

	test('handles external api', '/load', async ({ base, page }) => {
		const port = await ports.find(4000);

		/** @type {string[]} */
		const requested_urls = [];

		const server = http.createServer(async (req, res) => {
			if (!req.url) throw new Error('Incomplete request');
			requested_urls.push(req.url);

			if (req.url === '/server-fetch-request-modified.json') {
				res.writeHead(200, {
					'Access-Control-Allow-Origin': '*',
					'content-type': 'application/json'
				});

				res.end(JSON.stringify({ answer: 42 }));
			} else {
				res.statusCode = 404;
				res.end('not found');
			}
		});

		await new Promise((fulfil) => {
			server.listen(port, () => fulfil(undefined));
		});

		await page.goto(`${base}/load/server-fetch-request?port=${port}`);

		assert.equal(requested_urls, ['/server-fetch-request-modified.json']);
		assert.equal(await page.textContent('h1'), 'the answer is 42');

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

	test('exposes rawBody to endpoints', '/load', async ({ page, clicknav }) => {
		await clicknav('[href="/load/raw-body"]');

		assert.equal(await page.innerHTML('.parsed'), '{"oddly":{"formatted":"json"}}');
		assert.equal(await page.innerHTML('.raw'), '{ "oddly" : { "formatted" : "json" } }');
	});
}
