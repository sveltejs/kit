import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { afterAll, expect, test, vi } from 'vitest';
import { check_spelling, write_if_changed } from './utils.js';

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
