import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, test, vi } from 'vitest';
import { process_config, validate_config } from '../../config/index.js';
import { write_tsconfig } from './index.js';

/** @type {string[]} */
const dirs = [];

afterEach(() => {
	vi.restoreAllMocks();

	for (const dir of dirs) {
		fs.rmSync(dir, { recursive: true, force: true });
	}

	dirs.length = 0;
});

test('warns with a safe root tsconfig', () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'svelte-kit-tsconfig-'));
	dirs.push(root);

	fs.writeFileSync(
		path.join(root, 'tsconfig.json'),
		JSON.stringify({ extends: './.svelte-kit/tsconfig.json' })
	);

	const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
	const config = process_config(validate_config({}), root);
	write_tsconfig(config, root);

	expect(warn).toHaveBeenNthCalledWith(
		2,
		JSON.stringify(
			{
				extends: '$app/tsconfig',
				include: ['src', 'test', '*'],
				exclude: ['src/service-worker']
			},
			null,
			'  '
		)
	);
});

test('generates rootDirs relative to the project root', () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'svelte-kit-tsconfig-'));
	dirs.push(root);

	const config = process_config(validate_config({}), root);
	write_tsconfig(config, root);

	const generated = JSON.parse(
		fs.readFileSync(path.join(root, 'node_modules/$app/tsconfig.json'), 'utf8')
	);

	expect(generated.compilerOptions.rootDirs).toEqual(['../..', '../../.svelte-kit/types']);
});

test('generates rootDirs for a custom outDir', () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'svelte-kit-tsconfig-'));
	dirs.push(root);

	const config = process_config(validate_config({ outDir: 'build-output' }), root);
	write_tsconfig(config, root);

	const generated = JSON.parse(
		fs.readFileSync(path.join(root, 'node_modules/$app/tsconfig.json'), 'utf8')
	);

	expect(generated.compilerOptions.rootDirs).toEqual(['../..', '../../build-output/types']);
});
