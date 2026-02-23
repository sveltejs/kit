import fs from 'node:fs';
import path from 'node:path';
import { chdir } from 'node:process';
import { load_config } from '../packages/kit/src/core/config/index.js';
import { all as syncAll } from '../packages/kit/src/core/sync/sync.js';

// This isn't strictly necessary, but it eliminates some annoying warnings in CI

for (const directories of [
	'packages/kit/test/apps',
	'packages/kit/test/build-errors/apps',
	'packages/kit/test/prerendering'
].map((dir) => path.resolve(dir))) {
	for (const dir of fs.readdirSync(directories)) {
		const cwd = path.join(directories, dir);

		if (!fs.existsSync(path.join(cwd,'svelte.config.js'))) {
			continue;
		}

		chdir(cwd);

		syncAll(await load_config({ cwd }), 'development');
	}
}
