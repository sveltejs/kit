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
	delete_complex_opts(config);

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
			package: {
				dir: 'package',
				exports: {
					include: ['**'],
					exclude: ['_*', '**/_*']
				},
				files: {
					include: ['**'],
					exclude: []
				},
				emitTypes: true
			},
			serviceWorker: {
				exclude: []
			},
			paths: { base: '', assets: '/.' },
			prerender: { crawl: true, force: undefined, onError: 'fail', pages: ['*'] },
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

test('errors on loading config without default export', async () => {
	let errorMessage = null;
	try {
		const cwd = join(__dirname, 'fixtures', 'export-missing');
		await load_config({ cwd });
	} catch (e) {
		errorMessage = e.message;
	}

	assert.equal(
		errorMessage,
		'Your config is missing default exports. Make sure to include "export default config;"'
	);
});

test('errors on loading config with incorrect default export', async () => {
	let errorMessage = null;
	try {
		const cwd = join(__dirname, 'fixtures', 'export-string');
		await load_config({ cwd });
	} catch (e) {
		errorMessage = e.message;
	}

	assert.equal(
		errorMessage,
		'Unexpected config type "string", make sure your default export is an object.'
	);
});

test.run();

/** @param {import('types/config').ValidatedConfig} validated */
function delete_complex_opts(validated) {
	// @ts-expect-error
	delete validated.kit.vite;
	// @ts-expect-error
	delete validated.kit.hydrate;
	// @ts-expect-error
	delete validated.kit.prerender.enabled;
	// @ts-expect-error
	delete validated.kit.router;
	// @ts-expect-error
	delete validated.kit.ssr;
}
