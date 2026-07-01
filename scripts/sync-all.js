import fs from 'node:fs';
import path from 'node:path';
import { chdir } from 'node:process';
import { extract_svelte_config, load_vite_config } from '../packages/kit/src/core/config/index.js';
import { all as syncAll } from '../packages/kit/src/core/sync/sync.js';

// This isn't strictly necessary, but it eliminates some annoying warnings in CI

for (const directories of [
	'packages/kit/test/apps',
	'packages/kit/test/build-errors/apps',
	'packages/kit/test/prerendering'
].map((dir) => path.resolve(dir))) {
	for (const dir of fs.readdirSync(directories)) {
		const cwd = path.join(directories, dir);

		if (
			!fs.existsSync(path.join(cwd, 'vite.config.js')) &&
			!fs.existsSync(path.join(cwd, 'vite.config.ts'))
		) {
			continue;
		}

		chdir(cwd);

		const vite_config = await load_vite_config();
		const sveltekit_config = extract_svelte_config(vite_config);

		syncAll(sveltekit_config, cwd);
	}
}
