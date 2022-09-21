import fs from 'fs';
import path from 'path';
import glob from 'tiny-glob/sync.js';
import { load_config } from './src/core/config/index.js';
import * as sync from './src/core/sync/sync.js';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

const directories = [];

const cwd = process.env.INIT_CWD ?? process.cwd();

if (pkg.workspaces) {
	for (const directory of pkg.workspaces) {
		directories.push(...glob(directory, { cwd }).map((dir) => path.resolve(cwd, dir)));
	}
} else {
	directories.push(cwd);
}

for (const cwd of directories) {
	if (fs.existsSync(path.join(cwd, 'svelte.config.js'))) {
		process.chdir(cwd);
		const config = await load_config();
		await sync.all(config, 'development');
	}
}
