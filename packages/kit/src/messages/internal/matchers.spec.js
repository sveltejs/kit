import { describe, expect, test, vi } from 'vitest';
import '../../../test/matchers.js';
import { diagnostic_url, find_diagnostic } from '../../../test/diagnostics.js';

const url = diagnostic_url('some_code');

/** @param {string} message @param {string} [name] */
function error(message, name = 'SvelteKit error') {
	const error = new Error(message);
	error.name = name;
	return error;
}

describe('find_diagnostic', () => {
	test.each([
		[`some_code\nSome text\n${url}`, 'Some text'],
		[`some_code\nSome\nmultiline text\n${url}`, 'Some\nmultiline text'],
		[`\u001b[1m\u001b[33msome_code\nSome text\n${url}\u001b[39m\u001b[22m`, 'Some text'],
		[`%c[sveltekit] some_code\n%cSome text\n${url}`, 'Some text'],
		[`page says: "some_code\nSome text\n${url} (500 Internal Error)"`, 'Some text'],
		[url, ''],
		[`other_code\nSome text\n${diagnostic_url('other_code')}`, null],
		[`some_code_2\nSome text\n${diagnostic_url('some_code_2')}`, null],
		[`${url}_2`, null]
	])('finds the diagnostic in %j', (output, expected) => {
		expect(find_diagnostic(output, 'some_code')).toBe(expected);
	});
});

describe('toThrowKitError', () => {
	test('checks the code, and only the listed parts of the text', () => {
		const fn = () => {
			throw error(`some_code\nThe value 42 is invalid\n${url}`);
		};

		expect(fn).toThrowKitError('some_code');
		expect(fn).toThrowKitError('some_code', { contains: ['42', /\bvalue \d+/] });
		expect(fn).not.toThrowKitError('other_code');
		expect(fn).not.toThrowKitError('some_code', { contains: ['43'] });
		expect(fn).not.toThrowKitError('some_code', { url_only: true });
	});

	test('checks the name and class of the error', () => {
		const message = `some_code\nText\n${url}`;

		expect(() => {
			throw error(message, 'Error');
		}).not.toThrowKitError('some_code');

		expect(() => {
			throw new TypeError(message);
		}).not.toThrowKitError('some_code');

		expect(() => {}).not.toThrowKitError('some_code');
	});

	test('optionally checks whether the error has a stack', () => {
		const fn = () => {
			throw error(`some_code\nText\n${url}`);
		};
		const stackless = () => {
			const e = error(`some_code\nText\n${url}`);
			e.stack = '';
			throw e;
		};

		expect(fn).toThrowKitError('some_code', { stackless: false });
		expect(fn).not.toThrowKitError('some_code', { stackless: true });
		expect(stackless).toThrowKitError('some_code', { stackless: true });
		expect(stackless).not.toThrowKitError('some_code', { stackless: false });
		expect(stackless).toThrowKitError('some_code');
	});

	test('optionally checks the cause', () => {
		const cause = Object.assign(new Error('cause'), { code: 'ERR_X' });
		const fn = () => {
			throw new (class extends Error {})('x', { cause });
		};
		const with_cause = () => {
			const e = new Error(`some_code\nText\n${url}`, { cause });
			e.name = 'SvelteKit error';
			throw e;
		};

		expect(with_cause).toThrowKitError('some_code', { cause });
		expect(with_cause).toThrowKitError('some_code', {
			cause: expect.objectContaining({ code: 'ERR_X' })
		});
		expect(with_cause).not.toThrowKitError('some_code', { cause: new Error('other') });
		expect(with_cause).not.toThrowKitError('some_code', { cause: undefined });
		expect(fn).not.toThrowKitError('some_code', { cause });
	});

	test('supports production errors that only contain the URL', () => {
		const fn = () => {
			throw error(url, 'Error');
		};

		expect(fn).toThrowKitError('some_code', { url_only: true });
		expect(fn).not.toThrowKitError('some_code');
	});

	test('supports rejected promises and asymmetric use', async () => {
		const rejected = Promise.reject(error(`some_code\nText\n${url}`));

		await expect(rejected).rejects.toThrowKitError('some_code');
		expect({ error: error(`some_code\nText\n${url}`) }).toEqual({
			error: expect.toBeKitError('some_code')
		});
	});
});

describe('toContainKitDiagnostic', () => {
	test('checks strings and the calls of mocked functions', () => {
		const warn = vi.fn();
		warn('%c[sveltekit] some_code\n%cText with value 42\n' + url, 'font-weight: bold', '');

		expect(warn).toContainKitDiagnostic('some_code', { contains: ['42'] });
		expect(`log\nsome_code\nText\n${url}\nmore`).toContainKitDiagnostic('some_code');
		expect('some_code without a URL').not.toContainKitDiagnostic('some_code');
	});
});
