import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { stripVTControlCharacters } from 'node:util';
import { afterEach, assert, expect, test, vi } from 'vitest';
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
	vi.spyOn(process, 'cwd').mockReturnValue(root);

	fs.writeFileSync(
		path.join(root, 'tsconfig.json'),
		JSON.stringify({ extends: './.svelte-kit/tsconfig.json' })
	);

	const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
	const config = process_config(validate_config({}), root);
	write_tsconfig(config, root);

	const example = JSON.stringify(
		{
			extends: '$app/tsconfig',
			include: ['src', 'test', '*'],
			exclude: ['src/service-worker']
		},
		null,
		'  '
	);

	expect(warn).toHaveBeenCalledOnce();
	assert.equal(
		stripVTControlCharacters(warn.mock.calls[0][0]),
		`tsconfig_extends_missing\ntsconfig.json should extend SvelteKit's built-in configuration:\n${example}\nhttps://next.svelte.dev/e/@sveltejs/kit/tsconfig_extends_missing`
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

test('reports all tsconfig issues in a single warning', () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'svelte-kit-tsconfig-'));
	dirs.push(root);
	vi.spyOn(process, 'cwd').mockReturnValue(root);

	fs.writeFileSync(
		path.join(root, 'tsconfig.json'),
		JSON.stringify({
			extends: '$app/tsconfig',
			compilerOptions: { types: ['node'], isolatedModules: false }
		})
	);

	const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
	const config = process_config(validate_config({}), root);
	write_tsconfig(config, root);

	const calls = warn.mock.calls.map(([message]) => stripVTControlCharacters(message));

	assert.deepEqual(calls, [
		[
			'tsconfig_invalid',
			'Found issues while validating tsconfig.json:',
			'  - "types" was overwritten. It must include "$app/types"',
			'  - "isolatedModules" was overwritten. It should be true',
			'https://next.svelte.dev/e/@sveltejs/kit/tsconfig_invalid'
		].join('\n')
	]);
});

test('reports tsconfig parse errors with their location and no stack trace', () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'svelte-kit-tsconfig-'));
	dirs.push(root);
	vi.spyOn(process, 'cwd').mockReturnValue(root);

	fs.writeFileSync(path.join(root, 'tsconfig.json'), '{\n\t"extends": "$app/tsconfig",\n\t@\n}');

	const config = process_config(validate_config({}), root);

	/** @type {unknown} */
	let thrown;
	try {
		write_tsconfig(config, root);
	} catch (error) {
		thrown = error;
	}

	assert.instanceOf(thrown, Error);
	const error = /** @type {Error} */ (thrown);
	assert.equal(error.name, 'SvelteKit error');
	assert.match(
		error.message,
		/^tsconfig_parse_failed\nFailed to parse TypeScript config(: .+)?\nhttps:\/\/next\.svelte\.dev\/e\/@sveltejs\/kit\/tsconfig_parse_failed$/
	);
	assert.equal(error.stack, `${error.message}\n    at tsconfig.json:3:2`);
});
