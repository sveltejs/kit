import { rmSync } from 'fs';
import { join } from 'path';
import { test } from 'uvu';
import * as assert from 'uvu/assert';
import glob from 'tiny-glob/sync.js';
import { create_builder } from './builder.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

test('copy files', () => {
	const cwd = join(__dirname, 'fixtures/basic');
	const outDir = join(cwd, '.svelte-kit');

	/** @type {import('types').Config} */
	const mocked = {
		extensions: ['.svelte'],
		kit: {
			appDir: '_app',
			files: {
				assets: join(__dirname, 'fixtures/basic/static')
			},
			outDir
		}
	};

	const builder = create_builder({
		config: /** @type {import('types').ValidatedConfig} */ (mocked),
		// @ts-expect-error
		build_data: {},
		// @ts-expect-error
		prerendered: {
			paths: []
		},
		// @ts-expect-error
		log: {}
	});

	const dest = join(__dirname, 'output');

	rmSync(dest, { recursive: true, force: true });
	builder.writeStatic(dest);

	assert.equal(
		glob('**', {
			cwd: /** @type {import('types').ValidatedConfig} */ (mocked).kit.files.assets,
			dot: true
		}),
		glob('**', { cwd: dest, dot: true })
	);

	rmSync(dest, { recursive: true, force: true });
	builder.writeClient(dest);

	assert.equal(
		glob('**', { cwd: `${outDir}/output/client`, dot: true }),
		glob('**', { cwd: dest, dot: true })
	);

	rmSync(dest, { recursive: true, force: true });
	builder.writeServer(dest);

	assert.equal(
		glob('**', { cwd: `${outDir}/output/server`, dot: true }),
		glob('**', { cwd: dest, dot: true })
	);

	rmSync(dest, { force: true, recursive: true });
});

test.run();
