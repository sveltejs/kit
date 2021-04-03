import { join } from 'path';
import * as uvu from 'uvu';
import * as assert from 'uvu/assert';
import rimraf from 'rimraf';
import glob from 'tiny-glob/sync.js';
import AdapterUtils from '../AdapterUtils.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

/** @param {string} _msg */
const log = (_msg) => {};

/**
 * @param {string} cwd
 * @param {any} config
 */
const get_utils = (cwd, config) =>
	new AdapterUtils({
		cwd,
		config,
		log: Object.assign(log, {
			info: log,
			minor: log,
			warn: log,
			error: log,
			success: log
		})
	});

const suite = uvu.suite('AdapterUtils');

suite('utils ', () => {
	assert.ok(AdapterUtils);
});

suite('copy files', () => {
	const cwd = join(__dirname, 'fixtures/basic');

	const config = {
		kit: {
			files: {
				assets: join(__dirname, 'fixtures/basic/static')
			},
			appDir: '_app',
			extensions: ['.svelte']
		}
	};

	const utils = get_utils(cwd, config);

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
	const config = {
		extensions: ['.svelte'],
		kit: {
			files: {
				assets: join(__dirname, 'fixtures/prerender/static'),
				routes: join(__dirname, 'fixtures/prerender/src/routes')
			},
			appDir: '_app',
			prerender: {
				pages: ['*'],
				enabled: true
			}
		}
	};

	const utils = get_utils(cwd, config);

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
