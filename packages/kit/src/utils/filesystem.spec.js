import { mkdtempSync, writeFileSync, readdirSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { assert, expect, beforeEach, test } from 'vitest';
import { copy, mkdirp, resolve_entry } from './filesystem.js';

/** @type {string} */
let source_dir;
/** @type {string} */
let dest_dir;

beforeEach(() => {
	const temp_dir = mkdtempSync(join(tmpdir(), 'kit-core-filesystem-'));
	source_dir = join(temp_dir, 'source');
	dest_dir = join(temp_dir, 'dest');
	mkdirSync(source_dir);
	mkdirSync(dest_dir);
});

/**
 * @param {string} file
 * @param {string} contents
 */
const write = (file, contents) => {
	const filepath = join(source_dir, file);
	mkdirp(dirname(filepath));
	writeFileSync(filepath, contents);
};

test('without filter', () => {
	write('file-one.js', '');
	write('file-two.css', '');
	write('file-three', '');

	copy(source_dir, dest_dir);

	const copied = readdirSync(dest_dir);

	expect(copied.sort()).toEqual(['file-one.js', 'file-two.css', 'file-three'].sort());
});

test('filters out subdirectory contents', () => {
	write('file-one.js', '');
	write('file-two.css', '');
	write('no-copy/do-not-copy.js', '');

	copy(source_dir, dest_dir, {
		filter: (f) => f !== 'no-copy'
	});

	const copied = readdirSync(dest_dir);

	expect(copied.sort()).toEqual(['file-one.js', 'file-two.css'].sort());
});

test('copies recursively', () => {
	write('file-one.js', '');
	write('file-two.css', '');
	write('deep/a.js', '');
	write('deep/b.js', '');

	copy(source_dir, dest_dir);

	const root = readdirSync(dest_dir);

	expect(root.sort()).toEqual(['file-one.js', 'file-two.css', 'deep'].sort());

	const subdir = readdirSync(join(dest_dir, 'deep'));

	expect(subdir.sort()).toEqual(['a.js', 'b.js'].sort());
});

test('returns a list of copied files', () => {
	write('file-one.js', '');
	write('file-two.css', '');
	write('deep/a.js', '');
	write('deep/b.js', '');

	let file_list = copy(source_dir, dest_dir);
	expect(file_list.sort()).toEqual(
		['file-one.js', 'file-two.css', 'deep/a.js', 'deep/b.js'].sort()
	);

	file_list = copy(`${source_dir}/file-one.js`, `${dest_dir}/file-one-renamed.js`);
	expect(file_list).toEqual(['file-one-renamed.js']);
});

test('replaces strings', () => {
	write('foo.md', 'the quick brown JUMPER jumps over the lazy JUMPEE');
	copy(source_dir, dest_dir, {
		replace: {
			JUMPER: 'fox',
			JUMPEE: 'dog'
		}
	});

	assert.equal(
		readFileSync(join(dest_dir, 'foo.md'), 'utf8'),
		'the quick brown fox jumps over the lazy dog'
	);
});

test('ignores hooks.server folder when resolving hooks', () => {
	write(join('hooks.server', 'index.js'), '');

	expect(resolve_entry(source_dir + '/hooks')).null;
});

test('ignores hooks folder that has no index file when resolving hooks', () => {
	write(join('hooks', 'not-index.js'), '');
	write('hooks.js', '');

	expect(resolve_entry(source_dir + '/hooks')).toBe(join(source_dir, 'hooks.js'));
});

test('ignores hooks folder when resolving universal hooks', () => {
	write(join('hooks', 'hooks.server.js'), '');

	expect(resolve_entry(source_dir + '/hooks')).null;
});

test('resolves entries that have an extension', () => {
	write('hooks.js', '');

	expect(resolve_entry(join(source_dir, 'hooks.js'))).toBe(join(source_dir, 'hooks.js'));
});
