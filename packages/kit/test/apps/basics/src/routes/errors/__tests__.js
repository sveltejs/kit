import * as assert from 'uvu/assert';

/** @type {import('../../../../../types').TestMaker} */
export default function (test, is_dev) {
	if (is_dev) {
		// TODO unskip this test
		test.skip('client-side errors', '/errors/clientside', async ({ page, js }) => {
			if (js) {
				try {
					// ???
					// await visit('/errors/clientside');
				} catch (error) {
					assert.ok(/Crashing now/.test(error.message));
				} finally {
					// this is the Snowpack error overlay
					assert.equal(await page.textContent('footer'), 'Custom layout');
					assert.equal(
						await page.textContent('#message'),
						'This is your custom error page saying: "Crashing now"'
					);
				}
			}
		});

		// TODO these probably shouldn't have the full render treatment,
		// given that they will never be user-visible in prod
		test('server-side errors', '/errors/serverside', async ({ page }) => {
			assert.equal(await page.textContent('footer'), 'Custom layout');
			assert.equal(
				await page.textContent('#message'),
				'This is your custom error page saying: "Crashing now"'
			);
		});

		test('server-side module context errors', '/errors/module-scope-server', async ({ page }) => {
			assert.equal(await page.textContent('footer'), 'Custom layout');
			assert.equal(
				await page.textContent('#message'),
				'This is your custom error page saying: "Crashing now"'
			);
		});
	}

	test('client-side load errors', '/errors/load-client', async ({ page, js }) => {
		if (js) {
			assert.equal(await page.textContent('footer'), 'Custom layout');
			assert.equal(
				await page.textContent('#message'),
				'This is your custom error page saying: "Crashing now"'
			);
		}
	});

	test('server-side load errors', '/errors/load-server', async ({ page }) => {
		assert.equal(await page.textContent('footer'), 'Custom layout');
		assert.equal(
			await page.textContent('#message'),
			'This is your custom error page saying: "Crashing now"'
		);

		assert.equal(
			await page.evaluate(() => getComputedStyle(document.querySelector('h1')).color),
			'rgb(255, 0, 0)'
		);
	});

	test('client-side module context errors', '/errors/module-scope-client', async ({ page, js }) => {
		if (js) {
			assert.equal(await page.textContent('footer'), 'Custom layout');
			assert.equal(
				await page.textContent('#message'),
				'This is your custom error page saying: "Crashing now"'
			);
		}
	});

	test('404', '/why/would/anyone/fetch/this/url', async ({ page, response }) => {
		assert.equal(await page.textContent('footer'), 'Custom layout');
		assert.equal(
			await page.textContent('#message'),
			'This is your custom error page saying: "Not found: /why/would/anyone/fetch/this/url"'
		);
		assert.equal(response.status(), 404);
	});

	test(
		'server-side error from load() is a string',
		'/errors/load-error-string-server',
		async ({ page, response }) => {
			assert.equal(await page.textContent('footer'), 'Custom layout');
			assert.equal(
				await page.textContent('#message'),
				'This is your custom error page saying: "Not found"'
			);
			assert.equal(response.status(), 555);
		}
	);

	test(
		'client-side error from load() is a string',
		'/errors/load-error-string-client',
		async ({ page, js }) => {
			if (js) {
				assert.equal(await page.textContent('footer'), 'Custom layout');
				assert.equal(
					await page.textContent('#message'),
					'This is your custom error page saying: "Not found"'
				);
				assert.equal(await page.innerHTML('h1'), '555', 'Should set status code');
			}
		}
	);

	test(
		'server-side error from load() is an Error',
		'/errors/load-error-server',
		async ({ page, response }) => {
			assert.equal(await page.textContent('footer'), 'Custom layout');
			assert.equal(
				await page.textContent('#message'),
				'This is your custom error page saying: "Not found"'
			);
			assert.equal(response.status(), 555);
		}
	);

	test(
		'client-side error from load() is an Error',
		'/errors/load-error-client',
		async ({ page, js }) => {
			if (js) {
				assert.equal(await page.textContent('footer'), 'Custom layout');
				assert.equal(
					await page.textContent('#message'),
					'This is your custom error page saying: "Not found"'
				);
				assert.equal(await page.innerHTML('h1'), '555', 'Should set status code');
			}
		}
	);

	test(
		'server-side error from load() is malformed',
		'/errors/load-error-malformed-server',
		async ({ page }) => {
			const body = await page.textContent('body');

			assert.ok(
				body.includes(
					'Error: "error" property returned from load() must be a string or instance of Error, received type "object"'
				)
			);
		}
	);

	test(
		'client-side error from load() is malformed',
		'/errors/load-error-malformed-client',
		async ({ page, js }) => {
			if (js) {
				const body = await page.textContent('body');

				assert.ok(
					await body.includes(
						'Error: "error" property returned from load() must be a string or instance of Error, received type "object"'
					),
					'Should throw error'
				);
			}
		}
	);

	test('invalid route response is handled', '/', async ({ fetch }) => {
		const res = await fetch('/errors/invalid-route-response');

		assert.equal(res.status, 500);
		assert.match(await res.text(), /expected an object/);
	});

	// TODO before we implemented route fallthroughs, and there was a 1:1
	// regex:route relationship, it was simple to say 'method not implemented
	// for this endpoint'. now it's a little tricker. does a 404 suffice?
	test.skip('unhandled http method', '/', async ({ fetch }) => {
		const res = await fetch('/errors/invalid-route-response', { method: 'PUT' });

		assert.equal(res.status, 501);

		assert.match(await res.text(), /PUT is not implemented/);
	});

	test('error in endpoint', null, async ({ base, page, errors }) => {
		const res = await page.goto(`${base}/errors/endpoint`);

		// should include stack trace
		const lines = errors().split('\n');
		assert.ok(lines[0].includes('nope'), 'Logs error message');
		if (is_dev) {
			assert.ok(lines[2].includes('endpoint.json'), 'Logs error stack in dev');
		}

		assert.equal(res.status(), 500);
		assert.equal(await page.textContent('#message'), 'This is your custom error page saying: ""');

		const contents = await page.textContent('#stack');
		const location = 'endpoint.svelte:11:15';
		const has_stack_trace = contents.includes(location);

		if (is_dev) {
			assert.ok(has_stack_trace, `Could not find ${location} in ${contents}`);
		} else {
			assert.ok(!has_stack_trace, 'Stack trace is visible');
		}
	});
}
