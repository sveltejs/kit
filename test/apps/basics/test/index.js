import fs from 'fs';
import path from 'path';
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

	const dir = path.join(__dirname, 'tests');
	const modules = fs.readdirSync(dir);
	for (const module of modules) {
		require(`./tests/${module}`).default(test, is_dev);
	}
});
