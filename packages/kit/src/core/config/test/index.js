import { join } from 'path';
import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { fileURLToPath } from 'url';
import { load_config } from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

/**
 * @param {string} path
 */
async function testLoadDefaultConfig(path) {
	const cwd = join(__dirname, 'fixtures', path);

	const config = await load_config({ cwd });

	delete config.kit.vite; // can't test equality of a function

	assert.equal(config, {
		compilerOptions: null,
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
				setup: join(cwd, 'src/setup'),
				template: join(cwd, 'src/app.html')
			},
			floc: false,
			host: null,
			hostHeader: null,
			hydrate: true,
			package: {
				dir: 'package',
				exports: {
					include: ['**'],
					exclude: ['_*', '**/_*']
				},
				files: {
					include: ['**'],
					exclude: []
				}
			},
			serviceWorker: {
				filesExclusions: []
			},
			paths: { base: '', assets: '/.' },
			prerender: { crawl: true, enabled: true, force: false, pages: ['*'] },
			router: true,
			ssr: true,
			target: null,
			trailingSlash: 'never'
		},
		preprocess: null
	});
}

test('load default config (cjs)', async () => {
	await testLoadDefaultConfig('default-cjs');
});

test('load default config (esm)', async () => {
	await testLoadDefaultConfig('default-esm');
});

test.run();
