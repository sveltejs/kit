import path from 'path';
import glob from 'tiny-glob/sync.js';
import * as assert from 'uvu/assert';
import { fileURLToPath } from 'url';
import { runner } from '../../../runner.js'; // TODO make this a package?

runner(async () => {
	const __filename = fileURLToPath(import.meta.url);
	const cwd = path.join(__filename, '../../src/routes');
	const modules = glob('**/__tests__.js', { cwd });

	const tests = [];

	for (const file of modules) {
		const mod = await import(`${cwd}/${file}`);
		tests.push(mod.default);
	}

	tests.push((suite) => {
		suite('static files', async ({ fetch }) => {
			let res = await fetch('/static.json');
			assert.equal(await res.json(), 'static file');

			res = await fetch('/subdirectory/static.json');
			assert.equal(await res.json(), 'subdirectory file');
		});
	});

	return tests;
});
