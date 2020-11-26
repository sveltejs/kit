import { mkdtempSync, writeFileSync, readdirSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { suite } from 'uvu';
import * as assert from 'uvu/assert';
import { copy } from '.';

const suite_copy = suite('#copy()');

let source_dir;
let dest_dir;

suite_copy.before.each(() => {
	const temp_dir = mkdtempSync(join(tmpdir(), 'app-utils-'));
	source_dir = join(temp_dir, 'source');
	dest_dir = join(temp_dir, 'dest');
	mkdirSync(source_dir);
	mkdirSync(dest_dir);
});

suite_copy('without filter', () => {
	writeFileSync(join(source_dir, 'file-one.js'), '');
	writeFileSync(join(source_dir, 'file-two.css'), '');
	writeFileSync(join(source_dir, 'file-three'), '');

	copy(source_dir, dest_dir);

	const copied = readdirSync(dest_dir);

	assert.equal(copied.sort(), ['file-one.js', 'file-two.css', 'file-three'].sort());
});

suite_copy('filters out subdirectory contents', () => {
	writeFileSync(join(source_dir, 'file-one.js'), '');
	writeFileSync(join(source_dir, 'file-two.css'), '');
	mkdirSync(join(source_dir, 'no-copy'));
	writeFileSync(join(source_dir, 'no-copy', 'do-not-copy.js'), '');

	copy(source_dir, dest_dir, (f) => f === 'source');

	const copied = readdirSync(dest_dir);

	assert.equal(copied.sort(), ['file-one.js', 'file-two.css', 'no-copy'].sort());
});

suite_copy('copies recursively', () => {
	writeFileSync(join(source_dir, 'file-one.js'), '');
	writeFileSync(join(source_dir, 'file-two.css'), '');
	const sub_dir = join(source_dir, 'deep');
	mkdirSync(sub_dir);
	writeFileSync(join(sub_dir, 'a.js'), '');
	writeFileSync(join(sub_dir, 'b.js'), '');

	copy(source_dir, dest_dir);

	const root = readdirSync(dest_dir);

	assert.equal(root.sort(), ['file-one.js', 'file-two.css', 'deep'].sort());

	const subdir = readdirSync(sub_dir);

	assert.equal(subdir.sort(), ['a.js', 'b.js'].sort());
});

suite_copy('returns a list of copied files', () => {
	writeFileSync(join(source_dir, 'file-one.js'), '');
	writeFileSync(join(source_dir, 'file-two.css'), '');
	const sub_dir = join(source_dir, 'deep');
	mkdirSync(sub_dir);
	writeFileSync(join(sub_dir, 'a.js'), '');
	writeFileSync(join(sub_dir, 'b.js'), '');

	const file_list = copy(source_dir, dest_dir);

	assert.equal(
		file_list.sort(),
		[
			join(dest_dir, 'file-one.js'),
			join(dest_dir, 'file-two.css'),
			join(dest_dir, 'deep/a.js'),
			join(dest_dir, 'deep/b.js')
		].sort()
	);
});

suite_copy.run();
