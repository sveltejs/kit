import * as assert from 'uvu/assert';

export default function (test, is_dev) {
	if (is_dev) {
		// TODO unskip this test
		test.skip('client-side errors', async ({ visit, contains, sleep, js }) => {
			if (js) {
				try {
					await visit('/errors/clientside');
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
		test('server-side errors', async ({ visit, contains }) => {
			await visit('/errors/serverside');

			assert.ok(await contains('Custom layout'));
			assert.ok(await contains('Crashing now'));
			assert.ok(await contains('custom error page'));
		});

		test('server-side module context errors', async ({ visit, contains }) => {
			await visit('/errors/module-scope-server');

			assert.ok(await contains('Custom layout'));
			assert.ok(await contains('Crashing now'));
			assert.ok(await contains('custom error page'));
		});
	}

	test('client-side load errors', async ({ visit, contains, js }) => {
		if (js) {
			await visit('/errors/load-client');

			assert.ok(await contains('Custom layout'));
			assert.ok(await contains('Crashing now'));
			assert.ok(await contains('custom error page'));
		}
	});

	test('server-side load errors', async ({ visit, contains }) => {
		await visit('/errors/load-server');

		assert.ok(await contains('Custom layout'));
		assert.ok(await contains('Crashing now'));
		assert.ok(await contains('custom error page'));
	});

	test('client-side module context errors', async ({ visit, contains, js }) => {
		if (js) {
			await visit('/errors/module-scope-client');

			assert.ok(await contains('Custom layout'));
			assert.ok(await contains('Crashing now'));
			assert.ok(await contains('custom error page'));
		}
	});

	test('404', async ({ visit, contains }) => {
		const res = await visit('/why/would/anyone/fetch/this/url');

		assert.ok(await contains('Custom layout'), 'Should show custom layout');
		assert.ok(await contains('custom error page'), 'Should show custom error page');
		assert.equal(res.status(), 404);
	});

	test('server-side error from load() is a string', async ({ visit, contains }) => {
		const res = await visit('/errors/load-error-string-server');

		assert.ok(await contains('Custom layout'), 'Should show custom layout');
		assert.ok(await contains('custom error page'), 'Should show custom error page');
		assert.ok(
			await contains('This is your custom error page saying: "<b>Not found</b>"'),
			'Should show error message'
		);
		assert.equal(res.status(), 555);
	});

	test('client-side error from load() is a string', async ({ visit, contains, js, html }) => {
		if (js) {
			const res = await visit('/errors/load-error-string-client');

			assert.ok(await contains('Custom layout'), 'Should show custom layout');
			assert.ok(await contains('custom error page'), 'Should show custom error page');
			assert.ok(
				await contains('This is your custom error page saying: "<b>Not found</b>"'),
				'Should show error message'
			);
			assert.equal(await html('h1'), '555', 'Should set status code');
		}
	});

	test('server-side error from load() is an Error', async ({ visit, contains }) => {
		const res = await visit('/errors/load-error-server');

		assert.ok(await contains('Custom layout'), 'Should show custom layout');
		assert.ok(await contains('custom error page'), 'Should show custom error page');
		assert.ok(
			await contains('This is your custom error page saying: "<b>Not found</b>"'),
			'Should show error message'
		);
		assert.equal(res.status(), 555);
	});
	test('client-side error from load() is an Error', async ({ visit, contains, js, html }) => {
		if (js) {
			const res = await visit('/errors/load-error-client');

			assert.ok(await contains('Custom layout'), 'Should show custom layout');
			assert.ok(await contains('custom error page'), 'Should show custom error page');
			assert.ok(
				await contains('This is your custom error page saying: "<b>Not found</b>"'),
				'Should show error message'
			);
			assert.equal(await html('h1'), '555', 'Should set status code');
		}
	});

	test('server-side error from load() is malformed', async ({ visit, contains }) => {
		const res = await visit('/errors/load-error-malformed-server');

		assert.ok(
			await contains(
				'Error: "error" property returned from load() must be a string or instance of Error, received type "object"'
			),
			'Should throw error'
		);
	});
	test('client-side error from load() is malformed', async ({ visit, contains, js }) => {
		if (js) {
			const res = await visit('/errors/load-error-malformed-client');

			assert.ok(
				await contains(
					'Error: "error" property returned from load() must be a string or instance of Error, received type "object"'
				),
				'Should throw error'
			);
		}
	});

	test('invalid route response is handled', async ({ fetch }) => {
		const res = await fetch('/errors/invalid-route-response');

		assert.equal(res.status, 500);
		assert.match(await res.text(), /body is missing/);
	});

	test('unhandled http method', async ({ fetch }) => {
		const res = await fetch('/errors/invalid-route-response', { method: 'PUT' });

		assert.equal(res.status, 501);

		assert.match(await res.text(), /PUT is not implemented/);
	});

	test('error in endpoint', async ({ visit, text }) => {
		const console_errors = [];
		const { error: original_error } = console;
		console.error = (text) => {
			console_errors.push(text);
		};

		const res = await visit('/errors/endpoint');

		console.error = original_error;

		// should include stack trace
		const lines = (console_errors[0] || '').split('\n');
		assert.equal(lines[0], 'Error: nope');
		if (is_dev) {
			assert.ok(lines[1].includes('endpoint.json'));
		}

		assert.equal(res.status(), 500);
		assert.equal(
			await text('#message'),
			'This is your custom error page saying: "Internal Server Error"'
		);

		const contents = await text('#stack');
		const location = 'endpoint.svelte:11:9';
		const has_stack_trace = contents.includes(location);

		if (is_dev) {
			assert.ok(has_stack_trace, `Could not find ${location} in ${contents}`);
		} else {
			assert.ok(!has_stack_trace, 'Stack trace is visible');
		}
	});
}
