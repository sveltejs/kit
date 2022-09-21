import fs from 'fs';
import path from 'path';
import { load_config } from './src/core/config/index.js';
import * as sync from './src/core/sync/sync.js';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

const directories = [];

if (pkg.workspaces) {
	for (const directory of pkg.workspaces) {
		const parts = directory.split('/');
		let found = ['.'];

		for (const part of parts) {
			if (part === '*') {
				found = found
					.map((dir) => fs.readdirSync(dir).map((subdir) => path.join(dir, subdir)))
					.flat();
			} else {
				found = found.map((dir) => path.join(dir, part));
			}
		}

		directories.push(...found);
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
