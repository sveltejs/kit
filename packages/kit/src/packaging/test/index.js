import { join } from 'path';
import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { fileURLToPath } from 'url';
import { load_config } from '../../core/config/index.js';
import { make_package } from '../index.js';
import { rimraf, walk } from '../../utils/filesystem.js';
import { lstatSync, readdirSync, readFileSync } from 'fs';
import prettier from 'prettier';

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
			'Contains a different number of files. Expected ' +
				expected_files.join(',') +
				' , got ' +
				actual_files.join(',')
		);

		/**
		 * @param {string[]} files relative names
		 * @param {string} path absolute pathnames
		 */
		const traverse = (files, path) => {
			for (const file of files) {
				const current = join(path, file);
				if (lstatSync(current).isDirectory()) {
					traverse(readdirSync(current), current);
				} else {
					assert.equal(expected_files.includes(file), true, `Did not expect ${file}`);
					const expected_path = current.replace(/([/\\]test[/\\].+)package([/\\])/, '$1expected$2');
					const expected_content = readFileSync(expected_path, 'utf-8');
					const actual_content = readFileSync(current, 'utf-8');
					assert.equal(
						format(file, actual_content),
						format(file, expected_content),
						`Expected equal file contents for ${file}`
					);
				}
			}
		};

		traverse(actual_files, pwd);
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
		json.exports = Object.keys(json.exports)
			.sort()
			.map((key) => json.exports[key]);
		content = JSON.stringify(json);
	}
	return prettier.format(content, {
		parser: file.endsWith('.svelte') ? 'svelte' : file.endsWith('.json') ? 'json' : 'babel-ts',
		plugins: ['prettier-plugin-svelte']
	});
}

test('create standard package with javascript', async () => {
	// should also preserve filename casing
	// should also correctly handle nested folders
	await test_make_package('javascript');
});

test('create standard package with typescript', async () => {
	await test_make_package('typescript');
});

test('create package with emitTypes settings disabled', async () => {
	await test_make_package('emitTypes');
});

test('create package with default exports settings (replace)', async () => {
	await test_make_package('exports-replace');
});

test.run();
