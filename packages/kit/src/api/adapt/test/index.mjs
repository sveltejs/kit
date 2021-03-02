import { join } from 'path';
import * as uvu from 'uvu';
import * as assert from 'uvu/assert';
import rimraf from 'rimraf';
import glob from 'tiny-glob/sync.js';
import Builder from '../Builder.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

const suite = uvu.suite('Builder');

suite('builder ', () => {
	assert.ok(Builder);
});

suite('copy files', () => {
	const cwd = join(__dirname, 'fixtures/basic/.svelte/output');
	const config = {
		files: {
			assets: join(__dirname, 'fixtures/basic/static')
		},
		appDir: '_app'
	};

	const builder = new Builder({
		cwd,
		config,
		log: Object.assign((_msg) => {}, {
			info: (_msg) => {},
			warn: (_msg) => {},
			error: (_msg) => {},
			success: (_msg) => {}
		})
	});

	const dest = join(__dirname, 'output');

	rimraf.sync(dest);
	builder.copy_static_files(dest);

	assert.equal(glob('**', { cwd: config.files.assets }), glob('**', { cwd: dest }));

	rimraf.sync(dest);
	builder.copy_client_files(dest);

	assert.equal(glob('**', { cwd: `${cwd}/client` }), glob('**', { cwd: dest }));

	rimraf.sync(dest);
	builder.copy_server_files(dest);

	assert.equal(glob('**', { cwd: `${cwd}/server` }), glob('**', { cwd: dest }));
});

suite('prerender', async () => {
	const cwd = join(__dirname, 'fixtures/prerender/.svelte/output');
	const prerendered_files = join(__dirname, 'fixtures/prerender/build');
	const config = {
		files: {
			assets: join(__dirname, 'fixtures/prerender/static'),
			routes: join(__dirname, 'fixtures/prerender/src/routes')
		},
		appDir: '_app',
		prerender: {
			pages: ['*'],
			enabled: true
		}
	};

	const builder = new Builder({
		cwd,
		config,
		log: Object.assign((_msg) => {}, {
			info: (_msg) => {},
			warn: (_msg) => {},
			error: (_msg) => {},
			success: (_msg) => {}
		})
	});

	const dest = join(__dirname, 'output');

	rimraf.sync(dest);
	await builder.prerender({
		force: true,
		dest
	});

	assert.equal(glob('**', { cwd: `${prerendered_files}` }), glob('**', { cwd: dest }));

	rimraf.sync(dest);
});

suite.run();
