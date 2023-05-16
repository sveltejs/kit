import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import glob from 'tiny-glob/sync.js';
import { create_builder } from './builder.js';
import { posixify } from '../../utils/filesystem.js';

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
		server_metadata: {},
		route_data: [],
		// @ts-expect-error
		prerendered: {
			paths: []
		},
		// @ts-expect-error
		prerender_map: {},
		// @ts-expect-error
		log: {}
	});

	const dest = join(__dirname, 'output');

	rmSync(dest, { recursive: true, force: true });

	expect(builder.writeClient(dest)).toEqual(
		glob('**', { cwd: dest, dot: true, filesOnly: true }).map(posixify)
	);

	expect(glob('**', { cwd: `${outDir}/output/client`, dot: true })).toEqual(
		glob('**', { cwd: dest, dot: true })
	);

	rmSync(dest, { recursive: true, force: true });

	expect(builder.writeServer(dest)).toEqual(
		glob('**', { cwd: dest, dot: true, filesOnly: true }).map(posixify)
	);

	expect(glob('**', { cwd: `${outDir}/output/server`, dot: true })).toEqual(
		glob('**', { cwd: dest, dot: true })
	);

	rmSync(dest, { force: true, recursive: true });
});
