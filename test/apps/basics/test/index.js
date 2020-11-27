import * as assert from 'uvu/assert';
import { runner } from '../../../runner'; // TODO make this a package?

runner((test, is_dev) => {
	// basics
	test('serves /', async ({ visit, contains }) => {
		await visit('/');
		assert.ok(await contains('You\'re on index.svelte'));
	});

	test('serves dynamic route', async ({ visit, contains }) => {
		await visit('/dynamic-abc');
		assert.ok(await contains('Slug: abc'));
	});

	test('serves /', async ({ visit, contains }) => {
		await visit('/preload');
		assert.ok(await contains('bar == bar'));
	});

	// error handling
	if (is_dev) {
		test('client-side errors', async ({ visit, contains }) => {
			await visit('/errors/clientside');

			// this is the Snowpack error overlay (TODO dev mode only)
			assert.ok(await contains('Crashing now'));
		});
	}

	test('server-side errors', async ({ visit, contains }) => {
		await visit('/errors/serverside');

		assert.ok(await contains('Crashing now'));
		assert.ok(await contains('custom error page'));
	});

	test('client-side preload errors', async ({ visit, contains }) => {
		await visit('/errors/preload-client');

		assert.ok(await contains('Crashing now'));
		assert.ok(await contains('custom error page'));
	});

	test('server-side preload errors', async ({ visit, contains }) => {
		await visit('/errors/preload-server');

		assert.ok(await contains('Crashing now'));
		assert.ok(await contains('custom error page'));
	});

	test('client-side module context errors', async ({ visit, contains }) => {
		await visit('/errors/module-scope-client');

		assert.ok(await contains('Crashing now'));
		assert.ok(await contains('custom error page'));
	});

	test('server-side module context errors', async ({ visit, contains }) => {
		await visit('/errors/module-scope-server');

		assert.ok(await contains('Crashing now'));
		assert.ok(await contains('custom error page'));
	});
});