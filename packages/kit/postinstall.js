import fs from 'fs';
import path from 'path';
import glob from 'tiny-glob/sync.js';
import { load_config } from './src/core/config/index.js';
import * as sync from './src/core/sync/sync.js';

const cwd = process.env.INIT_CWD ?? process.cwd();
process.chdir(cwd);

if (fs.existsSync('package.json')) {
	const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

	const directories = [];

	if (pkg.workspaces) {
		for (const directory of pkg.workspaces) {
			directories.push(...glob(directory, { cwd }).map((dir) => path.resolve(cwd, dir)));
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
		} catch (e) {
			console.log('Error while trying to sync SvelteKit config');
			console.log(e);
		}
	}
}
