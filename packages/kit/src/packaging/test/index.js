import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

import prettier from 'prettier';
import { test } from 'uvu';
import * as assert from 'uvu/assert';

import { make_package } from '../index.js';
import { load_config } from '../../core/config/index.js';
import { rimraf, walk } from '../../utils/filesystem.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

/**
 * @param {string} path
 */
async function test_make_package(path) {
	const cwd = join(__dirname, 'fixtures', path);
	const ewd = join(cwd, 'expected');
	const pwd = join(cwd, 'package');

	try {
		const config = await load_config({ cwd });
		await make_package(config, cwd);
		const expected_files = walk(ewd);
		const actual_files = walk(pwd);
		assert.equal(
			actual_files.length,
			expected_files.length,
			'Contains a different number of files.' +
				`\n\t expected: ${JSON.stringify(expected_files)}` +
				`\n\t actually: ${JSON.stringify(actual_files)}`
		);

		for (const file of actual_files) {
			assert.equal(expected_files.includes(file), true, `Did not expect ${file}`);
			const expected_content = format(file, readFileSync(join(ewd, file), 'utf-8'));
			const actual_content = format(file, readFileSync(join(pwd, file), 'utf-8'));
			assert.equal(actual_content, expected_content, `Expected equal file contents for ${file}`);
		}
	} finally {
		rimraf(pwd);
	}
}

/**
 * Format with Prettier in order to get expected and actual content aligned
 * @param {string} file
 * @param {string} content
 */
function format(file, content) {
	if (file.endsWith('package.json')) {
		// For some reason these are ordered differently in different test environments
		const json = JSON.parse(content);
		json.exports = Object.entries(json.exports).sort(([ak], [bk]) => ak.localeCompare(bk));
		content = JSON.stringify(json);
	}
	return prettier.format(content, {
		parser: file.endsWith('.svelte') ? 'svelte' : file.endsWith('.json') ? 'json' : 'babel-ts',
		plugins: ['prettier-plugin-svelte']
	});
}

test('standard package errors', async () => {
	// TODO: refactor and allow this to handle multiple errors
	const cwd = join(__dirname, 'fixtures', 'errors/duplicate-export');
	const pwd = join(cwd, 'package');

	const config = await load_config({ cwd });
	try {
		// TODO: use assert.throws, does not seem to work with async/await
		await make_package(config, cwd);
	} catch (/** @type {any} */ e) {
		assert.equal(
			e.message,
			'Duplicate "./utils" export. Please remove or rename either ./utils/index.js or utils.js',
			'Duplicate export are not thrown'
		);
	} finally {
		rimraf(pwd);
	}
});

test('create standard package with javascript', async () => {
	// should also preserve filename casing
	// should also correctly handle nested folders
	await test_make_package('javascript');
});

test('create standard package with typescript', async () => {
	await test_make_package('typescript');
});

test('create package with emitTypes settings disabled', async () => {
	await test_make_package('emitTypes-false');
});

test('create package and properly merge exports map', async () => {
	await test_make_package('exports-merge');
});

test('create package and properly exclude all exports', async () => {
	await test_make_package('exports-replace');
});

test('create package with files.exclude settings', async () => {
	await test_make_package('files-exclude');
});

test.run();
