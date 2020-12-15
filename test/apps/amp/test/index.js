import path from 'path';
import glob from 'tiny-glob/sync';
import * as assert from 'uvu/assert';
import { runner } from '../../../runner'; // TODO make this a package?

runner((test, is_dev) => {
	const cwd = path.join(__dirname, '../src/routes');
	const modules = glob('**/__tests__.js', { cwd });
	for (const module of modules) {
		require(`../src/routes/${module}`).default(test, is_dev);
	}

	test('amp is true', async ({ visit, contains }) => {
		await visit('/');

		assert.ok(await contains(`Hello from the server in ${is_dev ? 'dev' : 'prod'} mode!`));
		assert.ok(await contains('amp is true'));
	});
}, {
	amp: true
});
