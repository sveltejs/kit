import { test, expect } from 'vitest';

import { list_files } from './utils.js';
import { writeFileSync, rmSync, symlinkSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('skip broken symlinks', () => {
	const temp_dir = mkdtempSync(join(tmpdir(), 'kit-core-utils-'));
	const f1 = join(temp_dir, 'file1');
	writeFileSync(f1, '1');
	const f2 = join(temp_dir, 'unrelated_file');
	writeFileSync(f2, '2');
	const link_to_f = join(temp_dir, 'link_to_file');
	symlinkSync(f1, link_to_f);
	rmSync(f1);
	const files = list_files(temp_dir);
	expect(files).toEqual(['unrelated_file']);
});
