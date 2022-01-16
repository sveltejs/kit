import { readFileSync, rmSync } from 'fs';
import { join } from 'path';
import * as uvu from 'uvu';
import * as assert from 'uvu/assert';
import glob from 'tiny-glob/sync.js';
import { create_builder } from '../builder.js';
import { fileURLToPath } from 'url';
import { SVELTE_KIT } from '../../constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

/** @param {string} _msg */
const logger = (_msg) => { };

/** @type {import('types/internal').Logger} */
const log = Object.assign(logger, {
	info: logger,
	minor: logger,
	warn: logger,
	error: logger,
	success: logger
});

const suite = uvu.suite('adapter');

suite('copy files', () => {
	const cwd = join(__dirname, 'fixtures/basic');

	/** @type {import('types/config').Config} */
	const mocked = {
		extensions: ['.svelte'],
		kit: {
			appDir: '_app',
			files: {
				assets: join(__dirname, 'fixtures/basic/static')
			}
		}
	};

	/** @type {import('types/internal').BuildData} */
	const build_data = {
		// @ts-expect-error
		client: {},
		// @ts-expect-error
		server: {},
		static: [],
		entries: []
	};

	const builder = create_builder({
		cwd,
		config: /** @type {import('types/config').ValidatedConfig} */ (mocked),
		build_data,
		log
	});

	const dest = join(__dirname, 'output');

	rmSync(dest, { recursive: true, force: true });
	builder.writeStatic(dest);

	assert.equal(
		glob('**', {
			cwd: /** @type {import('types/config').ValidatedConfig} */ (mocked).kit.files.assets
		}),
		glob('**', { cwd: dest })
	);

	rmSync(dest, { recursive: true, force: true });
	builder.writeClient(dest);

	assert.equal(
		glob('**', { cwd: `${cwd}/${SVELTE_KIT}/output/client` }),
		glob('**', { cwd: dest })
	);

	rmSync(dest, { recursive: true, force: true });
	builder.writeServer(dest);

	assert.equal(
		glob('**', { cwd: `${cwd}/${SVELTE_KIT}/output/server` }),
		glob('**', { cwd: dest })
	);
});

suite('prerender', async () => {
	const cwd = join(__dirname, 'fixtures/prerender');
	const prerendered_files = join(__dirname, 'fixtures/prerender/build');

	/** @type {import('types/config').Config} */
	const mocked = {
		extensions: ['.svelte'],
		kit: {
			files: {
				assets: join(__dirname, 'fixtures/prerender/static'),
				routes: join(__dirname, 'fixtures/prerender/src/routes')
			},
			appDir: '_app',
			prerender: {
				concurrency: 1,
				enabled: true,
				entries: ['*']
			}
		}
	};

	/** @type {import('types/internal').BuildData} */
	const build_data = {
		// @ts-expect-error
		client: { assets: [], chunks: [] },
		// @ts-expect-error
		server: { chunks: [] },
		static: [],
		entries: [
			'/nested',
			'/redirects/absolute-url/no-encoding',
			'/redirects/absolute-url/encoding',
			'/redirects/path-url/no-encoding',
			'/redirects/path-url/encoding',
			'/redirects/relative-url/no-encoding',
			'/redirects/relative-url/encoding'
		]
	};

	const builder = create_builder({
		cwd,
		config: /** @type {import('types/config').ValidatedConfig} */ (mocked),
		build_data,
		log
	});

	const dest = join(__dirname, 'output');

	rmSync(dest, { recursive: true, force: true });
	await builder.prerender({
		all: true,
		dest
	});

	const expectedFiles = glob('**', { cwd: prerendered_files });
	const actualFiles = glob('**', { cwd: dest });

	// test if all files are present
	assert.equal(actualFiles, expectedFiles);

	// check each file if content is correct
	for (const file of expectedFiles.filter((file) => file.endsWith('.html'))) {
		const expected_content = readFileSync(join(prerendered_files, file));
		const actual_content = readFileSync(join(dest, file));

		assert.equal(actual_content.toString(), expected_content.toString(), `content of '${file}' is not equal`);
	}

	rmSync(dest, { recursive: true, force: true });
});

suite.run();
