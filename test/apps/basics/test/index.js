import fs from 'fs';
import path from 'path';
import * as assert from 'uvu/assert';
import { runner } from '../../../runner'; // TODO make this a package?

runner((test, is_dev) => {
	// basics
	test('serves /', async ({ visit, contains }) => {
		await visit('/');
		assert.ok(await contains('Custom layout'));
		assert.ok(await contains('You\'re on index.svelte'));
	});

	test('serves dynamic route', async ({ visit, contains }) => {
		await visit('/dynamic-abc');
		assert.ok(await contains('Custom layout'));
		assert.ok(await contains('Slug: abc'));
	});

	test('serves /', async ({ visit, contains }) => {
		await visit('/preload');
		assert.ok(await contains('Custom layout'));
		assert.ok(await contains('bar == bar'));
	});

	const dir = path.join(__dirname, 'tests');
	const modules = fs.readdirSync(dir);
	for (const module of modules) {
		require(`./tests/${module}`).default(test, is_dev);
	}
});
