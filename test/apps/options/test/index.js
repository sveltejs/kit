import path from 'path';
import glob from 'tiny-glob/sync.js';
import * as assert from 'uvu/assert';
import { runner } from '../../../runner'; // TODO make this a package?

runner((test, is_dev) => {
	const cwd = path.join(__dirname, '../source/pages');
	const modules = glob('**/__tests__.js', { cwd });
	for (const module of modules) {
		require(`../source/pages/${module}`).default(test, is_dev);
	}

	test('serves /', async ({ visit, contains, js }) => {
		await visit('/');
		assert.ok(await contains('I am in the template'), 'Should show custom template contents');
		assert.ok(await contains("We're on index.svelte"), 'Should show page contents');
		assert.ok(
			await contains(
				`Hello from the ${js ? 'client' : 'server'} in ${is_dev ? 'dev' : 'prod'} mode!`
			),
			'Should run JavaScript'
		);
	});
});
