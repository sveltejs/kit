import { load_config } from './src/core/config/index.js';
import * as sync from './src/core/sync/sync.js';
import glob from 'tiny-glob/sync.js';
import fs from 'node:fs';

try {
	const cwd = process.env.INIT_CWD ?? process.cwd();
	process.chdir(cwd);

	if (fs.existsSync('package.json')) {
		const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

		const workspaces = [];

		if (pkg.workspaces) {
			// Find all npm and Yarn workspace glob patterns
			// https://classic.yarnpkg.com/blog/2018/02/15/nohoist/
			// https://docs.npmjs.com/cli/v9/configuring-npm/package-json#workspaces
			const patterns = Array.isArray(pkg.workspaces) ? pkg.workspaces : pkg.workspaces.packages;

			for (const pattern of patterns) {
				workspaces.push(
					...glob(pattern, { cwd, absolute: true }).filter((path) =>
						fs.statSync(path).isDirectory()
					)
				);
			}
		} else {
			workspaces.push(cwd);
		}

		for (const cwd of workspaces) {
			process.chdir(cwd);

			if (!fs.existsSync('package.json')) continue;
			if (!fs.existsSync('svelte.config.js')) continue;

			const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
			if (!pkg.dependencies?.['@sveltejs/kit'] && !pkg.devDependencies?.['@sveltejs/kit']) continue;

			try {
				const config = await load_config();
				sync.all(config, 'development');
			} catch (error) {
				console.error('Error while trying to sync SvelteKit config');
				console.error(error);
			}
		}
	}
} catch (error) {
	console.error(error);
}
