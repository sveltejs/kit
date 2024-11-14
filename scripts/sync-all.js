import fs from 'node:fs';
import path from 'node:path';
import { load_config } from '../packages/kit/src/core/config/index.js';

// This isn't strictly necessary, but it eliminates some annoying warnings in CI

for (const directories of [
	'packages/kit/test/apps',
	'packages/kit/test/build-errors/apps',
	'packages/kit/test/prerendering'
].map((dir) => path.resolve(dir))) {
	for (const dir of fs.readdirSync(directories)) {
		const cwd = path.join(directories, dir);

		if (!fs.existsSync('svelte.config.js')) {
			continue;
		}

		process.chdir(cwd);

		// we defer this import so that we don't try and resolve `svelte` from
		// the root via `isSvelte5Plus`, which would blow up
		const sync = await import('../packages/kit/src/core/sync/sync.js');
		await sync.all(await load_config({ cwd }), 'development');
	}
}
