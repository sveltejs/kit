import { mkdtempSync, writeFileSync, readdirSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { assert, expect, beforeEach, test } from 'vitest';
import { copy, resolve_entry } from './filesystem.js';

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
	mkdirSync(dirname(filepath), { recursive: true });
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

test('rebases sourcemap sources', () => {
	write(
		'output/chunks/main.js.map',
		`${JSON.stringify({
			version: 3,
			file: 'main.js',
			sources: ['../../../src/main.js', 'https://example.com/external.js', '/absolute.js'],
			sourcesContent: ['source', 'external', 'absolute'],
			names: [],
			mappings: ''
		})}\n`
	);

	copy(join(source_dir, 'output'), join(dest_dir, 'nested/output'));

	const sourcemap = JSON.parse(
		readFileSync(join(dest_dir, 'nested/output/chunks/main.js.map'), 'utf8')
	);
	expect(sourcemap.sources).toEqual([
		'../../../../src/main.js',
		'https://example.com/external.js',
		'/absolute.js'
	]);
	expect(sourcemap.sourcesContent).toEqual(['source', 'external', 'absolute']);

	copy(join(source_dir, 'output/chunks/main.js.map'), join(dest_dir, 'renamed.json'));
	const renamed = JSON.parse(readFileSync(join(dest_dir, 'renamed.json'), 'utf8'));
	expect(renamed.sources[0]).toBe('../src/main.js');
});

test('leaves sourcemaps unchanged when sources are equally relative', () => {
	const contents = `{
		"version": 3,
		"sources": ["../shared.js"],
		"names": [],
		"mappings": ""
	}\n`;
	write('main.js.map', contents);

	copy(join(source_dir, 'main.js.map'), join(dest_dir, 'main.js.map'));

	expect(readFileSync(join(dest_dir, 'main.js.map'), 'utf8')).toBe(contents);
});

test('rebases a relative sourcemap sourceRoot', () => {
	write(
		'output/chunks/main.js.map',
		JSON.stringify({
			version: 3,
			sourceRoot: '../../../src',
			sources: ['main.js'],
			names: [],
			mappings: ''
		})
	);

	copy(join(source_dir, 'output'), join(dest_dir, 'nested/output'));

	const sourcemap = JSON.parse(
		readFileSync(join(dest_dir, 'nested/output/chunks/main.js.map'), 'utf8')
	);
	expect(sourcemap.sourceRoot).toBe('../../../../src');
	expect(sourcemap.sources).toEqual(['main.js']);
});

test('preserves a trailing slash when rebasing a relative sourcemap sourceRoot', () => {
	write(
		'output/chunks/main.js.map',
		JSON.stringify({
			version: 3,
			sourceRoot: '../../../src/',
			sources: ['main.js'],
			names: [],
			mappings: ''
		})
	);

	copy(join(source_dir, 'output'), join(dest_dir, 'nested/output'));

	const sourcemap = JSON.parse(
		readFileSync(join(dest_dir, 'nested/output/chunks/main.js.map'), 'utf8')
	);
	expect(sourcemap.sourceRoot).toBe('../../../../src/');
	expect(sourcemap.sources).toEqual(['main.js']);
});

test('leaves non-sourcemap .map files unchanged', () => {
	write('assets/image.map', 'not a sourcemap\n');
	copy(source_dir, dest_dir);
	expect(readFileSync(join(dest_dir, 'assets/image.map'), 'utf8')).toBe('not a sourcemap\n');
});

test('resolves index files', () => {
	write(join('service-worker', 'index.js'), '');

	expect(resolve_entry(source_dir + '/service-worker')).toBe(
		join(source_dir, 'service-worker', 'index.js')
	);
});

test('resolves entries that have an extension', () => {
	write('hooks.js', '');

	expect(resolve_entry(join(source_dir, 'hooks.js'))).toBe(join(source_dir, 'hooks.js'));
});

test('resolves universal hooks file when hooks folder exists', () => {
	write(join('hooks', 'not-index.js'), '');
	write('hooks.js', '');

	expect(resolve_entry(source_dir + '/hooks')).toBe(join(source_dir, 'hooks.js'));
});

test('ignores hooks.server folder when resolving universal hooks file', () => {
	write(join('hooks.server', 'index.js'), '');

	expect(resolve_entry(source_dir + '/hooks')).null;
});

test('ignores hooks folder when resolving universal hooks file', () => {
	write(join('hooks', 'hooks.server.js'), '');

	expect(resolve_entry(source_dir + '/hooks')).null;
});
