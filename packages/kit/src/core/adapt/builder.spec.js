import { existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assert, expect, test } from 'vitest';
import { create_builder } from './builder.js';
import { posixify } from '../../utils/filesystem.js';
import { list_files } from '../utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

test('copy files', () => {
	const cwd = join(__dirname, 'fixtures/basic');
	const outDir = join(cwd, '.svelte-kit');

	/** @type {import('@sveltejs/kit').Config} */
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

	expect(builder.writeClient(dest)).toEqual(list_files(dest).map(posixify));
	expect(
		list_files(`${outDir}/output/client`).filter((file) => !file.startsWith('.vite/'))
	).toEqual(list_files(dest));

	rmSync(dest, { recursive: true, force: true });

	expect(builder.writeServer(dest)).toEqual(list_files(dest).map(posixify));
	expect(list_files(`${outDir}/output/server`)).toEqual(list_files(dest));

	rmSync(dest, { force: true, recursive: true });
});

test('compress files', async () => {
	// @ts-expect-error - we don't need the whole config for this test
	const builder = create_builder({
		route_data: []
	});

	const target = fileURLToPath(new URL('./fixtures/compress/foo.css', import.meta.url));
	rmSync(target + '.br', { force: true });
	rmSync(target + '.gz', { force: true });
	await builder.compress(dirname(target));
	assert.ok(existsSync(target + '.br'));
	assert.ok(existsSync(target + '.gz'));
});
