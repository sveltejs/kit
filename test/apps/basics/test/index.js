import * as assert from 'uvu/assert';
import { runner } from '../../../runner'; // TODO make this a package?

runner((test, is_dev) => {
	const assertCustomLayout = async (contains) => assert.ok(await contains('Custom layout'));

	// basics
	test('serves /', async ({ visit, contains }) => {
		await visit('/old/');
		await assertCustomLayout(contains);
		assert.ok(await contains('You\'re on index.svelte'));
	});

	test('serves dynamic route', async ({ visit, contains }) => {
		await visit('/old/dynamic-abc');
		await assertCustomLayout(contains);
		assert.ok(await contains('Slug: abc'));
	});

	test('preloads', async ({ visit, contains }) => {
		await visit('/old/preload');
		await assertCustomLayout(contains);
		assert.ok(await contains('bar == bar'));
	});

	test('serves static files in root', async ({ visit, contains }) => {
		await visit('/static.json');
		assert.ok(await contains('static file'));
	});

	test('serves static files in subdirectories', async ({ visit, contains }) => {
		await visit('/subdirectory/static.json');
		assert.ok(await contains('subdirectory file'));
	});

	// error handling
	if (is_dev) {
		test('client-side errors', async ({ visit, contains }) => {
			await visit('/errors/clientside');

			// this is the Snowpack error overlay (TODO dev mode only)
			await assertCustomLayout(contains);
			assert.ok(await contains('Crashing now'));
		});
	}

	test('server-side errors', async ({ visit, contains }) => {
		await visit('/errors/serverside');

		await assertCustomLayout(contains);
		assert.ok(await contains('Crashing now'));
		assert.ok(await contains('custom error page'));
	});

	test('client-side preload errors', async ({ visit, contains }) => {
		await visit('/errors/preload-client');

		await assertCustomLayout(contains);
		assert.ok(await contains('Crashing now'));
		assert.ok(await contains('custom error page'));
	});

	test('server-side preload errors', async ({ visit, contains }) => {
		await visit('/errors/preload-server');

		await assertCustomLayout(contains);
		assert.ok(await contains('Crashing now'));
		assert.ok(await contains('custom error page'));
	});

	test('client-side module context errors', async ({ visit, contains }) => {
		await visit('/errors/module-scope-client');

		await assertCustomLayout(contains);
		assert.ok(await contains('Crashing now'));
		assert.ok(await contains('custom error page'));
	});

	test('server-side module context errors', async ({ visit, contains }) => {
		await visit('/errors/module-scope-server');

		await assertCustomLayout(contains);
		assert.ok(await contains('Crashing now'));
		assert.ok(await contains('custom error page'));
	});
});