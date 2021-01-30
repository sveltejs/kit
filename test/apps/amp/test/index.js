import path from 'path';
import glob from 'tiny-glob/sync.js';
import { fileURLToPath } from 'url';
import { runner } from '../../../runner.js'; // TODO make this a package?

runner(
	(test, is_dev) => {
		const __filename = fileURLToPath(import.meta.url);
		const cwd = path.join(__filename, '../../src/routes');
		const modules = glob('**/__tests__.js', { cwd });
		for (const module of modules) {
			require(`../src/routes/${module}`).default(test, is_dev);
		}
	},
	{
		amp: true
	}
);
