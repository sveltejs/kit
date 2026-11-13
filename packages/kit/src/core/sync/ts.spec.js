import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, test, vi } from 'vitest';
import { process_config, validate_config } from '../config/index.js';

/** @type {string[]} */
const dirs = [];

afterEach(() => {
	vi.doUnmock('typescript');
	vi.resetModules();
	for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true });
	dirs.length = 0;
});

function setup() {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'svelte-kit-typescript-'));
	dirs.push(root);
	fs.writeFileSync(path.join(root, 'tsconfig.json'), '{ "extends": "$app/tsconfig" }');
	return { root, config: process_config(validate_config({}), root) };
}

test('loads the TypeScript compiler API', async () => {
	const { ts } = await import('./ts.js');
	expect(ts).toBe((await import('typescript')).default);
	expect(typeof ts.createSourceFile).toBe('function');
});

test('TypeScript remains optional for config generation and route types', async () => {
	vi.doMock('typescript', () => {
		throw new Error('not installed');
	});

	const { ts } = await import('./ts.js');
	expect(ts).toBeUndefined();

	const { root, config } = setup();
	const { write_tsconfig } = await import('./write_tsconfig/index.js');
	write_tsconfig(config, root);
	expect(fs.existsSync(path.join(root, 'node_modules/$app/tsconfig.json'))).toBe(true);
	expect(fs.existsSync(path.join(root, 'node_modules/$app/tsconfig/service-worker.json'))).toBe(
		true
	);

	const { write_all_types } = await import('./write_types/index.js');
	write_all_types(config, /** @type {any} */ ({}), root);
	expect(fs.existsSync(path.join(config.outDir, 'types'))).toBe(false);
});

test.each(['compiler API', 'tsconfig', 'route types'])(
	'explains the missing TypeScript compiler API when loading %s',
	async (entry) => {
		// TypeScript 7 still imports successfully, but no longer exports the JS compiler API.
		const typescript = { version: '7.0.2', versionMajorMinor: '7.0' };
		vi.doMock('typescript', () => ({
			default: typescript,
			...typescript,
			readConfigFile: undefined,
			sys: undefined
		}));

		async function run() {
			if (entry === 'compiler API') {
				await import('./ts.js');
			} else if (entry === 'tsconfig') {
				const { root, config } = setup();
				const { write_tsconfig } = await import('./write_tsconfig/index.js');
				write_tsconfig(config, root);
			} else {
				const { tweak_types } = await import('./write_types/index.js');
				tweak_types('export const load = () => ({ greeting: "hello" });', false);
			}
		}

		await expect(run()).rejects.toThrowKitError('typescript_compiler_api_missing', {
			contains: ['7.0.2']
		});
	}
);
