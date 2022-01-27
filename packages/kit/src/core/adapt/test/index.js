import { rmSync } from 'fs';
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
const logger = (_msg) => {};

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

suite.run();
