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
	const generated_files = join(__dirname, 'fixtures/basic/.svelte/build/optimized');
	const config = {
		files: {
			assets: join(__dirname, 'fixtures/basic/static')
		},
		appDir: '_app',
		extensions: ['.svelte']
	};

	const builder = new Builder({
		generated_files,
		config,
		manifest: {
			error: {
				name: '$default_error',
				url: '/_app/assets/components/error.svelte.js'
			},
			layout: {
				name: '$default_layout',
				url: '/_app/assets/components/layout.svelte.js'
			},
			components: [],
			pages: [],
			endpoints: []
		},
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

	assert.equal(glob('**', { cwd: `${generated_files}/client` }), glob('**', { cwd: dest }));

	rimraf.sync(dest);
	builder.copy_server_files(dest);

	assert.equal(glob('**', { cwd: `${generated_files}/server` }), glob('**', { cwd: dest }));
});

suite('prerender', async () => {
	const generated_files = join(__dirname, 'fixtures/prerender/.svelte/build/optimized');
	const prerendered_files = join(__dirname, 'fixtures/prerender/build');
	const config = {
		files: {
			assets: join(__dirname, 'fixtures/prerender/static'),
			routes: join(__dirname, 'fixtures/prerender/.svelte/build/optimized/server/routes')
		},
		appDir: '_app',
		prerender: {
			pages: ['*'],
			enabled: true
		},
		extensions: ['.svelte']
	};

	const builder = new Builder({
		generated_files,
		config,
		manifest: {
			error: {
				name: '$default_error',
				url: '/_app/assets/components/error.svelte.js'
			},
			layout: {
				name: '$default_layout',
				url: '/_app/assets/components/layout.svelte.js'
			},
			components: [],
			pages: [],
			endpoints: []
		},
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
