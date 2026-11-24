import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';
import { afterEach, expect, test, vi } from 'vitest';
import { fix_stack_trace } from './sourcemaps.js';

afterEach(() => {
	vi.restoreAllMocks();
});

test('only reads files referenced by stack frames, not by the error message', () => {
	const read = vi.spyOn(fs, 'readFileSync');
	const file = 'file:///nonexistent-sveltekit-test/message.js';
	const error = new Error(`oops\n    at a (${file}:1:1)`);

	fix_stack_trace(error);

	expect(read).not.toHaveBeenCalledWith('/nonexistent-sveltekit-test/message.js', 'utf8');
	expect(error.stack?.startsWith(`Error: oops\n    at a (${file}:1:1)\n`)).toBe(true);
});

test('does not read files that are not regular files', () => {
	const read = vi.spyOn(fs, 'readFileSync');
	const error = new Error('oops');
	error.stack = `Error: oops\n    at a (file:///dev/null:1:1)`;

	fix_stack_trace(error);

	expect(read).not.toHaveBeenCalled();
});

test('still applies to genuine stack frames', () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-sourcemaps-'));
	const file = path.join(dir, 'bundle.js');
	fs.writeFileSync(file, 'throw new Error();\n//# sourceMappingURL=bundle.js.map\n');
	fs.writeFileSync(
		`${file}.map`,
		JSON.stringify({ version: 3, sources: ['original.js'], names: [], mappings: 'AAAA' })
	);

	try {
		const error = new Error('oops');
		error.stack = `Error: oops\n    at a (${url.pathToFileURL(file).href}:1:1)`;

		fix_stack_trace(error);

		expect(error.stack).toContain('original.js:1:1');
		expect(error.stack).not.toContain('bundle.js');
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
});
