import path from 'path';
import glob from 'tiny-glob/sync.js';
import * as assert from 'uvu/assert';
import { runner } from '../../../runner'; // TODO make this a package?

runner((test, is_dev) => {
	const cwd = path.join(__dirname, '../src/routes');
	const modules = glob('**/__tests__.js', { cwd });
	for (const module of modules) {
		require(`../src/routes/${module}`).default(test, is_dev);
	}

	test('static files', async ({ fetch }) => {
		let res = await fetch('/static.json');
		assert.equal(await res.json(), 'static file');

		res = await fetch('/subdirectory/static.json');
		assert.equal(await res.json(), 'subdirectory file');
	});
});
