import { join } from 'path';
import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { fileURLToPath } from 'url';
import { load_config } from '../../config/index.js';
import { make_package } from '../index.js';
import { rimraf } from '../../filesystem/index.js';
import { readdirSync, readFileSync } from 'fs';
import prettier from 'prettier';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

/**
 * @param {string} path
 */
async function test_make_package(path) {
	const cwd = join(__dirname, 'fixtures', path);

	try {
		const config = await load_config({ cwd });
		await make_package(config, cwd);
		const expected_files = readdirSync(join(cwd, 'expected'));
		const actual_files = readdirSync(join(cwd, 'package'));
		assert.equal(
			actual_files.length,
			expected_files.length,
			'Contains a different number of files. Expected ' +
				expected_files.join(',') +
				' , got ' +
				actual_files.join(',')
		);

		for (const file of actual_files) {
			assert.equal(expected_files.includes(file), true, `Did not expect ${file}`);
			const expected_content = readFileSync(join(cwd, 'expected', file), 'utf-8');
			const actual_content = readFileSync(join(cwd, 'package', file), 'utf-8');
			assert.equal(
				format(file, actual_content),
				format(file, expected_content),
				'Expected equal file contents'
			);
		}
	} finally {
		rimraf(join(cwd, 'package'));
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

test('create package (javascript)', async () => {
	await test_make_package('javascript');
});

test('create package (typescript)', async () => {
	await test_make_package('typescript');
});

test.run();
