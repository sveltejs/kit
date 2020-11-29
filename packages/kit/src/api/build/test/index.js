// import { mkdtempSync, writeFileSync, readdirSync, mkdirSync } from 'fs';
// import { tmpdir } from 'os';
import { join } from 'path';
import * as uvu from 'uvu';
import * as assert from 'uvu/assert';
import rimraf from 'rimraf';
import glob from 'tiny-glob/sync';
import Builder from '../Builder';

const suite = uvu.suite('Builder');

suite('builder ', () => {
	assert.ok(Builder);
});

suite('copy files', () => {
	const generated_files = join(__dirname, 'fixtures/basic/.svelte/build/optimized');
	const static_files = join(__dirname, 'fixtures/basic/static');

	const builder = new Builder({
		generated_files,
		static_files,
		manifest: {
			error: {
				name: '$default_error',
				url: '/_app/assets/components/error.svelte'
			},
			layout: {
				name: '$default_layout',
				url: '/_app/assets/components/layout.svelte'
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

	assert.equal(
		glob('**', { cwd: static_files }),
		glob('**', { cwd: dest })
	);

	rimraf.sync(dest);
	builder.copy_client_files(dest);

	assert.equal(
		glob('**', { cwd: `${generated_files}/client` }),
		glob('**', { cwd: dest })
	);

	rimraf.sync(dest);
	builder.copy_server_files(dest);

	assert.equal(
		glob('**', { cwd: `${generated_files}/server` }),
		glob('**', { cwd: dest })
	);
});

suite.run();
