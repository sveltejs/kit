import fs from 'node:fs';
import process from 'node:process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import prettier from 'prettier';
import { test, expect } from 'vitest';

import { build, watch } from '../src/index.js';
import { load_config } from '../src/config.js';
import { rimraf, walk } from '../src/filesystem.js';
import { _create_validator } from '../src/validate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

/**
 * @param {string} path
 * @param {Partial<import('../src/types.js').Options>} [options]
 */
async function test_make_package(path, options) {
	const cwd = join(__dirname, 'fixtures', path);
	const ewd = join(cwd, 'expected');
	const output = join(cwd, 'dist');

	const config = await load_config({ cwd });

	const input = resolve(cwd, config.kit?.files?.lib ?? 'src/lib');

	await build({
		cwd,
		input,
		output,
		types: true,
		config,
		...options
	});

	const expected_files = walk(ewd, true);
	const actual_files = walk(output, true);

	expect(actual_files).toEqual(expected_files);

	const extensions = ['.json', '.svelte', '.ts', 'js', '.map'];
	for (const file of actual_files) {
		const pathname = join(output, file);
		if (fs.statSync(pathname).isDirectory()) continue;
		expect(expected_files.includes(file), `Did not expect ${file} in ${path}`).toBeTruthy();

		const expected = fs.readFileSync(join(ewd, file));
		const actual = fs.readFileSync(join(output, file));
		const err_msg = `Expected equal file contents for ${file} in ${path}`;

		if (extensions.some((ext) => pathname.endsWith(ext))) {
			const expected_content = await format(file, expected.toString('utf-8'));
			const actual_content = await format(file, actual.toString('utf-8'));
			expect(actual_content, err_msg).toBe(expected_content);
		} else {
			expect(expected.equals(actual)).toBeTruthy();
		}
	}
}

/**
 * Format with Prettier in order to get expected and actual content aligned
 * @param {string} file
 * @param {string} content
 */
async function format(file, content) {
	if (file.endsWith('.map')) {
		return content;
	}

	if (file.endsWith('package.json')) {
		// For some reason these are ordered differently in different test environments
		const json = JSON.parse(content);
		json.exports = Object.entries(json.exports).sort(([ak], [bk]) => ak.localeCompare(bk));
		content = JSON.stringify(json);
	}
	return await prettier.format(content, {
		parser: file.endsWith('.svelte') ? 'svelte' : file.endsWith('.json') ? 'json' : 'typescript',
		plugins: ['prettier-plugin-svelte']
	});
}

for (const dir of fs.readdirSync(join(__dirname, 'errors'))) {
	test(`package error [${dir}]`, async () => {
		const cwd = join(__dirname, 'errors', dir);
		const output = join(cwd, 'dist');

		const config = await load_config({ cwd });

		const input = resolve(cwd, config.kit?.files?.lib ?? 'src/lib');

		try {
			await build({ cwd, input, output, types: true, config });
			throw new Error('Must not pass build');
		} catch (/** @type {any} */ error) {
			expect(error).toBeInstanceOf(Error);
			switch (dir) {
				case 'no-lib-folder':
					expect(error.message.replace(/\\/g, '/')).toMatch(
						'test/errors/no-lib-folder/src/lib does not exist'
					);
					break;
				// TODO: non-existent tsconfig passes without error
				// 	it detects tsconfig in packages/kit instead and creates package folder
				// 	in packages/kit/package, not sure how to handle and test this yet
				// case 'no-tsconfig':
				// 	expect(error.message).toMatch('Failed to locate tsconfig or jsconfig');
				// 	break;

				default:
					throw new Error('All error test must be handled');
			}
		} finally {
			rimraf(output);
		}
	});
}

test('create package with javascript', async () => {
	// should also preserve filename casing
	// should also correctly handle nested folders
	await test_make_package('javascript');
});

test('create package with typescript using esnext', async () => {
	await test_make_package('typescript-esnext');
});

test('create package with typescript using nodenext', async () => {
	await test_make_package('typescript-nodenext');
});

// only run this test in newer Node versions
// TODO: remove after dropping support for Node < 22.18
const [major, minor] = process.versions.node.split('.', 2).map((str) => +str);
const has_ts_support = major > 22 || (major === 22 && minor >= 18);

if (has_ts_support) {
	test('create package with typescript using nodenext and svelte.config.ts', async () => {
		await test_make_package('typescript-svelte-config');
	});
}

test('create package and assets are not tampered', async () => {
	await test_make_package('assets');
});

test('create package with emitTypes settings disabled', async () => {
	await test_make_package('emitTypes-false', { types: false });
});

test('create package with SvelteComponentTyped for backwards compatibility', async () => {
	await test_make_package('svelte-3-types');
});

test('create package and resolves $lib alias', async () => {
	await test_make_package('resolve-alias');
});

test('SvelteKit interop', async () => {
	await test_make_package('svelte-kit');
});

test('create package with declaration map', async () => {
	await test_make_package('typescript-declaration-map');
});

test('create package with tsconfig specified', async () => {
	await test_make_package('tsconfig-specified', { tsconfig: 'tsconfig.build.json' });
});

// chokidar doesn't fire events in github actions :shrug:
if (!process.env.CI) {
	test('watches for changes', async () => {
		const cwd = join(__dirname, 'watch');

		const config = await load_config({ cwd });

		const { watcher, ready, settled } = await watch({
			cwd,
			input: 'src/lib',
			output: 'package',
			types: true,
			config
		});

		/** @param {string} file */
		function compare(file) {
			expect(read(`package/${file}`)).toEqual(read(`expected/${file}`));
		}

		/** @param {string} file */
		function read(file) {
			return fs.readFileSync(join(__dirname, 'watch', file), 'utf-8');
		}

		/**
		 * @param {string} file
		 * @param {string} data
		 */
		function write(file, data) {
			return fs.writeFileSync(join(__dirname, 'watch', file), data);
		}

		/** @param {string} file */
		function remove(file) {
			const filepath = join(__dirname, 'watch', file);
			if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
		}

		try {
			await ready;

			// completes initial build
			compare('index.js');

			// processes a .js file
			write('src/lib/a.js', "export const a = 'a';");
			await settled();
			compare('a.js');
			compare('a.d.ts');

			// processes a .ts file
			write('src/lib/b.ts', "export const b = 'b';");
			await settled();
			compare('b.js');
			compare('b.d.ts');

			// processes a Svelte file
			write('src/lib/Test.svelte', '<script lang="ts">export let answer: number</script>');
			await settled();
			compare('Test.svelte');
			compare('Test.svelte.d.ts');

			// doesn't crash on an error
			write('src/lib/post-error.svelte', '<button on:={foo}>click me</button>');
			await settled();

			// recovers on subsequent change
			write('src/lib/post-error.svelte', '<button on:click={foo}>click me</button>');
			await settled();
			compare('post-error.svelte');
		} finally {
			await watcher.close();

			remove('src/lib/Test.svelte');
			remove('src/lib/a.js');
			remove('src/lib/b.ts');
			remove('src/lib/post-error.svelte');
		}
	}, 30_000);
}

/**
 * @param {string[]} actual
 * @param {string[]} expected
 */
function has_warnings(actual, expected) {
	expect(actual.length).toEqual(expected.length);
	expect(
		actual.filter((warning) => expected.some((str) => warning.startsWith(str))).length
	).toEqual(expected.length);
}

test('validates package (1)', () => {
	const { analyse_code, validate } = _create_validator({
		config: {},
		cwd: '',
		input: '',
		output: '',
		types: true
	});
	analyse_code('src/lib/index.js', 'export const a = 1;import.meta.env;');
	analyse_code('src/lib/C.svelte', '');
	const warnings = validate({});

	has_warnings(warnings, [
		'No `exports` field found in `package.json`, please provide one.',
		'Avoid usage of `import.meta.env` in your code',
		'You are using Svelte components or Svelte-specific imports in your code, but you have not declared a dependency on `svelte` in your `package.json`. '
	]);
});

test('validates package (2)', () => {
	const { analyse_code, validate } = _create_validator({
		config: {},
		cwd: '',
		input: '',
		output: '',
		types: true
	});
	analyse_code('src/lib/C.svelte', '');
	const warnings = validate({
		exports: { '.': './dist/C.svelte' },
		peerDependencies: { svelte: '^3.55.0' }
	});

	has_warnings(warnings, [
		'You are using Svelte files, but did not declare a `svelte` condition in one of your `exports` in your `package.json`. '
	]);
});

test('validates package (all ok 1)', () => {
	const { analyse_code, validate } = _create_validator({
		config: {},
		cwd: '',
		input: '',
		output: '',
		types: true
	});
	analyse_code('src/lib/C.svelte', '');
	const warnings = validate({
		exports: { '.': { svelte: './dist/C.svelte' } },
		peerDependencies: { svelte: '^3.55.0' }
	});

	expect(warnings.length).toEqual(0);
});

test('validates package (all ok 2)', () => {
	const { analyse_code, validate } = _create_validator({
		config: {},
		cwd: '',
		input: '',
		output: '',
		types: true
	});
	analyse_code('src/lib/C.svelte', '');
	const warnings = validate({
		exports: { '.': { svelte: './dist/C.svelte' } },
		peerDependencies: { svelte: '^3.55.0' },
		svelte: './dist/C.svelte'
	});

	expect(warnings.length).toEqual(0);
});
