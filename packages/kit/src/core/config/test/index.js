import { join } from 'path';
import { fileURLToPath } from 'url';

import * as assert from 'uvu/assert';
import { test } from 'uvu';

import { remove_keys } from '../../../utils/object.js';
import { load_config } from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

test('load default config (esm)', async () => {
	const cwd = join(__dirname, 'fixtures/default');

	const config = await load_config({ cwd });
	remove_keys(config, ([, v]) => typeof v === 'function');

	assert.equal(config, {
		extensions: ['.svelte'],
		kit: {
			adapter: null,
			amp: false,
			appDir: '_app',
			files: {
				assets: join(cwd, 'static'),
				hooks: join(cwd, 'src/hooks'),
				lib: join(cwd, 'src/lib'),
				routes: join(cwd, 'src/routes'),
				serviceWorker: join(cwd, 'src/service-worker'),
				template: join(cwd, 'src/app.html')
			},
			floc: false,
			headers: {
				host: null,
				protocol: null
			},
			host: null,
			hydrate: true,
			package: {
				dir: 'package',
				emitTypes: true
			},
			serviceWorker: {
				register: true
			},
			paths: { base: '', assets: '' },
			prerender: {
				concurrency: 1,
				crawl: true,
				enabled: true,
				entries: ['*'],
				force: undefined,
				onError: 'fail',
				pages: undefined
			},
			protocol: null,
			router: true,
			ssr: true,
			target: null,
			trailingSlash: 'never'
		}
	});
});

test('errors on loading config with incorrect default export', async () => {
	let message = null;

	try {
		const cwd = join(__dirname, 'fixtures', 'export-string');
		await load_config({ cwd });
	} catch (/** @type {any} */ e) {
		message = e.message;
	}

	assert.equal(
		message,
		'svelte.config.js must have a configuration object as its default export. See https://kit.svelte.dev/docs#configuration'
	);
});

test.run();
