import * as assert from 'uvu/assert';

export default function (test, is_dev) {
	if (is_dev) {
		// TODO unskip this test
		test.skip('client-side errors', '/errors/clientside', async ({ contains, js }) => {
			if (js) {
				try {
					// ???
					// await visit('/errors/clientside');
				} catch (error) {
					assert.ok(/Crashing now/.test(error.message));
				} finally {
					// this is the Snowpack error overlay
					assert.ok(await contains('Custom layout'));
					assert.ok(await contains('Crashing now'));
				}
			}
		});

		// TODO these probably shouldn't have the full render treatment,
		// given that they will never be user-visible in prod
		test('server-side errors', '/errors/serverside', async ({ contains }) => {
			assert.ok(await contains('Custom layout'));
			assert.ok(await contains('Crashing now'));
			assert.ok(await contains('custom error page'));
		});

		test(
			'server-side module context errors',
			'/errors/module-scope-server',
			async ({ contains }) => {
				assert.ok(await contains('Custom layout'));
				assert.ok(await contains('Crashing now'));
				assert.ok(await contains('custom error page'));
			}
		);
	}

	test('client-side load errors', '/errors/load-client', async ({ contains, js }) => {
		if (js) {
			assert.ok(await contains('Custom layout'));
			assert.ok(await contains('Crashing now'));
			assert.ok(await contains('custom error page'));
		}
	});

	test('server-side load errors', '/errors/load-server', async ({ contains }) => {
		assert.ok(await contains('Custom layout'));
		assert.ok(await contains('Crashing now'));
		assert.ok(await contains('custom error page'));
	});

	test(
		'client-side module context errors',
		'/errors/module-scope-client',
		async ({ contains, js }) => {
			if (js) {
				assert.ok(await contains('Custom layout'));
				assert.ok(await contains('Crashing now'));
				assert.ok(await contains('custom error page'));
			}
		}
	);

	test('404', '/why/would/anyone/fetch/this/url', async ({ contains, response }) => {
		assert.ok(await contains('Custom layout'), 'Should show custom layout');
		assert.ok(await contains('custom error page'), 'Should show custom error page');
		assert.equal(response.status(), 404);
	});

	test(
		'server-side error from load() is a string',
		'/errors/load-error-string-server',
		async ({ contains, response }) => {
			assert.ok(await contains('Custom layout'), 'Should show custom layout');
			assert.ok(await contains('custom error page'), 'Should show custom error page');
			assert.ok(
				await contains('This is your custom error page saying: "<b>Not found</b>"'),
				'Should show error message'
			);
			assert.equal(response.status(), 555);
		}
	);

	test(
		'client-side error from load() is a string',
		'/errors/load-error-string-client',
		async ({ contains, js, page }) => {
			if (js) {
				assert.ok(await contains('Custom layout'), 'Should show custom layout');
				assert.ok(await contains('custom error page'), 'Should show custom error page');
				assert.ok(
					await contains('This is your custom error page saying: "<b>Not found</b>"'),
					'Should show error message'
				);
				assert.equal(await page.innerHTML('h1'), '555', 'Should set status code');
			}
		}
	);

	test(
		'server-side error from load() is an Error',
		'/errors/load-error-server',
		async ({ contains, response }) => {
			assert.ok(await contains('Custom layout'), 'Should show custom layout');
			assert.ok(await contains('custom error page'), 'Should show custom error page');
			assert.ok(
				await contains('This is your custom error page saying: "<b>Not found</b>"'),
				'Should show error message'
			);
			assert.equal(response.status(), 555);
		}
	);

	test(
		'client-side error from load() is an Error',
		'/errors/load-error-client',
		async ({ contains, js, page }) => {
			if (js) {
				assert.ok(await contains('Custom layout'), 'Should show custom layout');
				assert.ok(await contains('custom error page'), 'Should show custom error page');
				assert.ok(
					await contains('This is your custom error page saying: "<b>Not found</b>"'),
					'Should show error message'
				);
				assert.equal(await page.innerHTML('h1'), '555', 'Should set status code');
			}
		}
	);

	test(
		'server-side error from load() is malformed',
		'/errors/load-error-malformed-server',
		async ({ contains }) => {
			assert.ok(
				await contains(
					'Error: "error" property returned from load() must be a string or instance of Error, received type "object"'
				),
				'Should throw error'
			);
		}
	);

	test(
		'client-side error from load() is malformed',
		'/errors/load-error-malformed-client',
		async ({ contains, js }) => {
			if (js) {
				assert.ok(
					await contains(
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
		assert.match(await res.text(), /body is missing/);
	});

	test('unhandled http method', '/', async ({ fetch }) => {
		const res = await fetch('/errors/invalid-route-response', { method: 'PUT' });

		assert.equal(res.status, 501);

		assert.match(await res.text(), /PUT is not implemented/);
	});

	test('error in endpoint', async ({ base, page }) => {
		const console_errors = [];
		const { error: original_error } = console;
		console.error = (text) => {
			console_errors.push(text);
		};

		const res = await page.goto(`${base}/errors/endpoint`);

		console.error = original_error;

		// should include stack trace
		const lines = (console_errors[0] || '').split('\n');
		assert.equal(lines[0], 'Error: nope');
		if (is_dev) {
			assert.ok(lines[1].includes('endpoint.json'));
		}

		assert.equal(res.status(), 500);
		assert.equal(
			await page.textContent('#message'),
			'This is your custom error page saying: "Internal Server Error"'
		);

		const contents = await page.textContent('#stack');
		const location = 'endpoint.svelte:11:9';
		const has_stack_trace = contents.includes(location);

		if (is_dev) {
			assert.ok(has_stack_trace, `Could not find ${location} in ${contents}`);
		} else {
			assert.ok(!has_stack_trace, 'Stack trace is visible');
		}
	});
}
