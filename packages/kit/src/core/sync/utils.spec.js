import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { afterAll, expect, test, vi } from 'vitest';
import { check_spelling, write, write_if_changed } from './utils.js';

const fixtures = path.join(import.meta.dirname, 'fixtures');

const EXTENSIONS = ['.js', '.ts'];

test.describe('check_spelling', () => {
	const console_warn_spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
	const cwd_spy = vi.spyOn(process, 'cwd').mockReturnValue(fixtures);

	afterAll(() => {
		console_warn_spy.mockReset();
		cwd_spy.mockReset();
	});

	test('does not warn if the misspelled file does not exist', () => {
		check_spelling(
			'src/hooks.server',
			path.resolve('src/+hooks.server'),
			'Unexpected + prefix',
			EXTENSIONS
		);

		expect(console_warn_spy).not.toHaveBeenCalled();
	});

	test('replaces the last occurrence of the typo in the suggested filename', () => {
		check_spelling(
			`src/hooks.server`,
			path.resolve('src/hook.server'),
			'Missing s suffix',
			EXTENSIONS
		);

		expect(console_warn_spy).toHaveBeenCalledOnce();
		expect(console_warn_spy).toContainKitDiagnostic('file_name_misspelled', {
			contains: ['Missing s suffix', 'hooks.server.js', path.join(fixtures, 'src/hook.server.js')]
		});
	});
});

test.describe('write', () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'svelte-kit-sync-utils-'));
	const long_ago = new Date('2020-01-01T00:00:00Z');

	afterAll(() => {
		fs.rmSync(dir, { recursive: true, force: true });
	});

	test('writes files with basenames near the filesystem length limit', () => {
		const directory = path.join(dir, 'long-filename');
		const basename = `${'a'.repeat(230)}.html`;
		const file = path.join(directory, basename);

		write(file, 'before');
		write(file, 'after');

		expect(fs.readFileSync(file, 'utf-8')).toBe('after');
		expect(fs.readdirSync(directory)).toEqual([basename]);
	});

	test('concurrent writes of different lengths do not leave trailing bytes', () => {
		const file = path.join(dir, 'concurrent.json');
		const shorter = JSON.stringify({ rootDirs: ['.svelte-kit-a/types'] });
		const longer = JSON.stringify({ rootDirs: ['.svelte-kit-ab/types'] });
		const write_file = fs.writeFileSync;
		let interleaved = false;

		// Reproduce the OS interleaving deterministically: both writers open/truncate
		// their destination before the longer write finishes, then the shorter one wins.
		const spy = vi.spyOn(fs, 'writeFileSync').mockImplementation((target, code, options) => {
			const fd = fs.openSync(/** @type {string} */ (target), 'w');
			try {
				if (!interleaved) {
					interleaved = true;
					write_if_changed(file, longer);
				}
				write_file(fd, code, options);
			} finally {
				fs.closeSync(fd);
			}
		});

		try {
			write_if_changed(file, shorter);
		} finally {
			spy.mockRestore();
		}

		expect(fs.readFileSync(file, 'utf-8')).toBe(shorter);
		expect(JSON.parse(fs.readFileSync(file, 'utf-8'))).toEqual(JSON.parse(shorter));
		expect(fs.readdirSync(dir).filter((name) => name.endsWith('.tmp'))).toEqual([]);
	});

	test('readers see the previous contents until the replacement is complete', () => {
		const file = path.join(dir, 'reader.js');
		write(file, 'before');

		const write_file = fs.writeFileSync;
		const spy = vi.spyOn(fs, 'writeFileSync').mockImplementationOnce((target, code, options) => {
			write_file(target, code, options);
			expect(fs.readFileSync(file, 'utf-8')).toBe('before');
		});

		try {
			write(file, 'after');
		} finally {
			spy.mockRestore();
		}

		expect(fs.readFileSync(file, 'utf-8')).toBe('after');
	});

	test('a failed temporary write preserves the destination and removes partial output', () => {
		const directory = path.join(dir, 'failed-write');
		const file = path.join(directory, 'generated.js');
		write(file, 'before');

		const error = new Error('write failed');
		const write_file = fs.writeFileSync;
		const spy = vi.spyOn(fs, 'writeFileSync').mockImplementationOnce((target) => {
			write_file(target, 'partial');
			throw error;
		});

		try {
			expect(() => write(file, 'after')).toThrow(error);
		} finally {
			spy.mockRestore();
		}

		expect(fs.readFileSync(file, 'utf-8')).toBe('before');
		expect(fs.readdirSync(directory)).toEqual(['generated.js']);
	});

	test('a failed rename preserves the destination and removes temporary output', () => {
		const directory = path.join(dir, 'failed-rename');
		const file = path.join(directory, 'generated.js');
		write(file, 'before');

		const error = Object.assign(new Error('rename failed'), { code: 'EACCES' });
		const spy = vi.spyOn(fs, 'renameSync').mockImplementationOnce(() => {
			throw error;
		});

		try {
			expect(() => write(file, 'after')).toThrow(error);
		} finally {
			spy.mockRestore();
		}

		expect(fs.readFileSync(file, 'utf-8')).toBe('before');
		expect(fs.readdirSync(directory)).toEqual(['generated.js']);
	});

	test('write_if_changed leaves a file that another process already wrote alone', () => {
		const file = path.join(dir, 'unchanged.js');

		// written by something other than this process, so `write_if_changed` has no record of it
		fs.writeFileSync(file, 'export const a = 1;');
		fs.utimesSync(file, long_ago, long_ago);

		write_if_changed(file, 'export const a = 1;');

		expect(fs.statSync(file).mtime).toEqual(long_ago);
	});

	test('write_if_changed replaces a file whose contents differ', () => {
		const file = path.join(dir, 'changed.js');

		fs.writeFileSync(file, 'export const a = 1;');
		fs.utimesSync(file, long_ago, long_ago);

		write_if_changed(file, 'export const a = 2;');

		expect(fs.readFileSync(file, 'utf-8')).toBe('export const a = 2;');
		expect(fs.statSync(file).mtime).not.toEqual(long_ago);
	});

	test('write_if_changed recreates a file that another process deleted', () => {
		const file = path.join(dir, 'nested/deleted.js');

		write_if_changed(file, 'export const a = 1;');
		fs.rmSync(file);
		write_if_changed(file, 'export const a = 1;');

		expect(fs.readFileSync(file, 'utf-8')).toBe('export const a = 1;');
	});
});
