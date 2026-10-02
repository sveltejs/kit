import path from 'node:path';
import process from 'node:process';
import { stripVTControlCharacters } from 'node:util';
import { afterAll, afterEach, expect, test, vi } from 'vitest';
import { check_spelling } from './utils.js';

const fixtures = path.join(import.meta.dirname, 'fixtures');

test.describe('check_spelling', () => {
	const console_warn_spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
	const cwd_spy = vi.spyOn(process, 'cwd').mockReturnValue(fixtures);

	afterEach(() => {
		console_warn_spy.mockClear();
		cwd_spy.mockClear();
	});

	afterAll(() => {
		console_warn_spy.mockReset();
		cwd_spy.mockReset();
	});

	test('does not warn if the misspelled file does not exist', () => {
		check_spelling('src/hooks.server', path.resolve('src/+hooks.server'), 'Unexpected + prefix');

		expect(console_warn_spy).not.toHaveBeenCalled();
	});

	test('replaces the last occurrence of the typo in the suggested filename', () => {
		check_spelling(`src/hooks.server`, path.resolve('src/hook.server'), 'Missing s suffix');

		expect(console_warn_spy).toHaveBeenCalledOnce();
		expect(stripVTControlCharacters(console_warn_spy.mock.calls[0][0])).toBe(
			`Missing s suffix. Did you mean hooks.server.js? at ${path.join(fixtures, `src/hook.server.js`)}`
		);
	});
});
