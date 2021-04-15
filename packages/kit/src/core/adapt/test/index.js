import { join } from 'path';
import * as uvu from 'uvu';
import * as assert from 'uvu/assert';
import rimraf from 'rimraf';
import glob from 'tiny-glob/sync.js';
import { get_utils } from '../utils.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

/** @param {string} _msg */
const logger = (_msg) => {};

/** @type {import('types.internal').Logger} */
const log = Object.assign(logger, {
	info: logger,
	minor: logger,
	warn: logger,
	error: logger,
	success: logger
});

const suite = uvu.suite('adapter utils');

suite('copy files', () => {
	const cwd = join(__dirname, 'fixtures/basic');

	/** @type {import('types.internal').ValidatedConfig} */
	const config = {
		kit: {
			// @ts-ignore
			files: {
				assets: join(__dirname, 'fixtures/basic/static')
			},
			appDir: '_app',
			extensions: ['.svelte']
		}
	};

	/** @type {import('types.internal').BuildData} */
	const build_data = { client: [], server: [], static: [], entries: [] };

	const utils = get_utils({ cwd, config, build_data, log });

	const dest = join(__dirname, 'output');

	rimraf.sync(dest);
	utils.copy_static_files(dest);

	assert.equal(glob('**', { cwd: config.kit.files.assets }), glob('**', { cwd: dest }));

	rimraf.sync(dest);
	utils.copy_client_files(dest);

	assert.equal(glob('**', { cwd: `${cwd}/.svelte/output/client` }), glob('**', { cwd: dest }));

	rimraf.sync(dest);
	utils.copy_server_files(dest);

	assert.equal(glob('**', { cwd: `${cwd}/.svelte/output/server` }), glob('**', { cwd: dest }));
});

suite('prerender', async () => {
	const cwd = join(__dirname, 'fixtures/prerender');
	const prerendered_files = join(__dirname, 'fixtures/prerender/build');

	/** @type {import('types.internal').ValidatedConfig} */
	const config = {
		extensions: ['.svelte'],
		kit: {
			// @ts-ignore
			files: {
				assets: join(__dirname, 'fixtures/prerender/static'),
				routes: join(__dirname, 'fixtures/prerender/src/routes')
			},
			appDir: '_app',
			// @ts-ignore
			prerender: {
				pages: ['*'],
				enabled: true
			}
		}
	};

	/** @type {import('types.internal').BuildData} */
	const build_data = { client: [], server: [], static: [], entries: ['/nested'] };

	const utils = get_utils({ cwd, config, build_data, log });

	const dest = join(__dirname, 'output');

	rimraf.sync(dest);
	await utils.prerender({
		force: true,
		dest
	});

	assert.equal(glob('**', { cwd: `${prerendered_files}` }), glob('**', { cwd: dest }));

	rimraf.sync(dest);
});

suite.run();
