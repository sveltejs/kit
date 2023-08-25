import { load_config } from './src/core/config/index.js';
import * as sync from './src/core/sync/sync.js';
import glob from 'tiny-glob/sync.js';
import fs from 'node:fs';

try {
	const cwd = process.env.INIT_CWD ?? process.cwd();
	process.chdir(cwd);

	if (fs.existsSync('package.json')) {
		const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

		const directories = [];

		if (pkg.workspaces) {
			// we have to do this because of https://classic.yarnpkg.com/blog/2018/02/15/nohoist/
			const packages = Array.isArray(pkg.workspaces) ? pkg.workspaces : pkg.workspaces.packages;

			for (const directory of packages) {
				directories.push(
					...glob(directory, { cwd, absolute: true }).filter((path) =>
						fs.statSync(path).isDirectory()
					)
				);
			}
		} else {
			directories.push(cwd);
		}

		for (const cwd of directories) {
			process.chdir(cwd);

			if (!fs.existsSync('package.json')) continue;
			if (!fs.existsSync('svelte.config.js')) continue;

			const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
			if (!pkg.dependencies?.['@sveltejs/kit'] && !pkg.devDependencies?.['@sveltejs/kit']) continue;

			try {
				const config = await load_config();
				await sync.all(config, 'development');
			} catch (error) {
				console.error('Error while trying to sync SvelteKit config');
				console.error(error);
			}
		}
	}
} catch (error) {
	console.error(error);
}
