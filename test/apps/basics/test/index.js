import path from 'path';
import glob from 'tiny-glob/sync';
import { runner } from '../../../runner' // TODO make this a package?

runner((test, is_dev) => {
	const cwd = path.join(__dirname, '../src/routes');
	const modules = glob('**/__tests__.js', { cwd });
	for (const module of modules) {
		require(`../src/routes/${module}`).default(test, is_dev);
	}
});
