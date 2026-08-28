import { describe, expect, it, vi } from 'vitest';
import { HttpError, SvelteKitError } from '@sveltejs/kit/internal';
import { add_deprecated_handle_error_properties, get_status } from './error.js';

describe('get_status', () => {
	it('returns the status of an HttpError', () => {
		expect(get_status(new HttpError({ status: 418, message: 'teapot' }))).toBe(418);
	});

	it('returns the status of a SvelteKitError', () => {
		expect(get_status(new SvelteKitError(404, 'Not Found', 'missing'))).toBe(404);
	});

	it('returns 500 for plain errors', () => {
		expect(get_status(new Error('oops'))).toBe(500);
	});

	it('returns 500 for non-errors', () => {
		expect(get_status({ status: 404 })).toBe(500);
		expect(get_status(undefined)).toBe(500);
	});
});

describe('add_deprecated_handle_error_properties', () => {
	it('adds non-enumerable accessors that warn and return the fallback values', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const input = add_deprecated_handle_error_properties(
			{ kind: 'unknown', error: new Error('nope') },
			{ status: 500, message: 'Internal Error' }
		);

		expect(Object.keys(input)).toEqual(['kind', 'error']);
		expect(/** @type {any} */ (input).status).toBe(500);
		expect(/** @type {any} */ (input).message).toBe('Internal Error');
		expect(warn).toHaveBeenCalledTimes(2);
		expect(warn.mock.calls[0][0]).toContain('Use `error.status`');
		expect(warn.mock.calls[1][0]).toContain('Use `error.message`');

		warn.mockRestore();
	});
});
