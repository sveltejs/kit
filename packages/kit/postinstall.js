import fs from 'fs';
import path from 'path';
import glob from 'tiny-glob/sync.js';
import { load_config } from './src/core/config/index.js';
import * as sync from './src/core/sync/sync.js';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

const directories = [];

if (pkg.workspaces) {
	for (const directory of pkg.workspaces) {
		directories.push(...glob(directory));
	}
} else {
	directories.push('.');
}

for (const cwd of directories.map((dir) => path.resolve(dir))) {
	if (fs.existsSync(path.join(cwd, 'svelte.config.js'))) {
		process.chdir(cwd);
		const config = await load_config();
		await sync.all(config, 'development');
	}
}
