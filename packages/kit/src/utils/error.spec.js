import { describe, test, expect } from 'vitest';
import { get_status, get_status_if_known, get_message, is_http_error } from './error.js';
import { HttpError, SvelteKitError } from '../exports/internal/index.js';

describe('get_status', () => {
	test('returns status from HttpError', () => {
		expect(get_status(new HttpError(404, 'Not Found'))).toBe(404);
	});

	test('returns status from SvelteKitError', () => {
		expect(get_status(new SvelteKitError(413, 'Payload Too Large', 'Request body too large'))).toBe(
			413
		);
	});

	test('returns 500 for plain Error', () => {
		expect(get_status(new Error('oops'))).toBe(500);
	});

	test('returns 500 for null', () => {
		expect(get_status(null)).toBe(500);
	});

	test('returns 500 for undefined', () => {
		expect(get_status(undefined)).toBe(500);
	});

	test('falls back to name check when instanceof fails (SvelteKitError across bundle boundary)', () => {
		// Simulates a SvelteKitError from a different @sveltejs/kit copy (e.g. adapter-node); instanceof fails but .name is preserved
		const foreign = {
			name: 'SvelteKitError',
			status: 413,
			text: 'Payload Too Large',
			message: 'Request body too large'
		};
		expect(get_status(foreign)).toBe(413);
	});

	test('falls back to name check when instanceof fails (HttpError across bundle boundary)', () => {
		const foreign = { name: 'HttpError', status: 404, body: { message: 'Not Found' } };
		expect(get_status(foreign)).toBe(404);
	});

	test('returns 500 when status is NaN (typeof NaN === "number" but Number.isFinite rejects it)', () => {
		const foreign = { name: 'SvelteKitError', status: NaN, text: 'Bad' };
		expect(get_status(foreign)).toBe(500);
	});

	test('returns 500 when status is a string', () => {
		const foreign = { name: 'SvelteKitError', status: '413', text: 'Bad' };
		expect(get_status(foreign)).toBe(500);
	});
});

describe('get_status_if_known', () => {
	test('returns status from HttpError', () => {
		expect(get_status_if_known(new HttpError(404, 'Not Found'))).toBe(404);
	});

	test('returns status from SvelteKitError', () => {
		expect(
			get_status_if_known(new SvelteKitError(413, 'Payload Too Large', 'Request body too large'))
		).toBe(413);
	});

	test('returns undefined for plain Error', () => {
		expect(get_status_if_known(new Error('oops'))).toBeUndefined();
	});

	test('returns undefined for null', () => {
		expect(get_status_if_known(null)).toBeUndefined();
	});

	test('falls back to name check when instanceof fails (SvelteKitError across bundle boundary)', () => {
		const foreign = {
			name: 'SvelteKitError',
			status: 413,
			text: 'Payload Too Large',
			message: 'Request body too large'
		};
		expect(get_status_if_known(foreign)).toBe(413);
	});

	test('falls back to name check when instanceof fails (HttpError across bundle boundary)', () => {
		const foreign = { name: 'HttpError', status: 404, body: { message: 'Not Found' } };
		expect(get_status_if_known(foreign)).toBe(404);
	});

	test('returns undefined when status is NaN', () => {
		const foreign = { name: 'SvelteKitError', status: NaN, text: 'Bad' };
		expect(get_status_if_known(foreign)).toBeUndefined();
	});
});

describe('get_message', () => {
	test('returns text from SvelteKitError', () => {
		expect(
			get_message(new SvelteKitError(413, 'Payload Too Large', 'Request body too large'))
		).toBe('Payload Too Large');
	});

	test('returns Internal Error for plain Error', () => {
		expect(get_message(new Error('oops'))).toBe('Internal Error');
	});

	test('returns Internal Error for null', () => {
		expect(get_message(null)).toBe('Internal Error');
	});

	test('falls back to name check when instanceof fails (SvelteKitError across bundle boundary)', () => {
		const foreign = {
			name: 'SvelteKitError',
			status: 413,
			text: 'Payload Too Large',
			message: 'Request body too large'
		};
		expect(get_message(foreign)).toBe('Payload Too Large');
	});

	test('returns Internal Error when text is not a string', () => {
		const foreign = { name: 'SvelteKitError', status: 413, text: 42 };
		expect(get_message(foreign)).toBe('Internal Error');
	});
});

describe('error branding', () => {
	// The cross-bundle fallback in get_status/get_status_if_known/get_message/is_http_error keys off
	// `error.name`, so the constructors must brand instances with a stable name. If these regress the
	// fallback silently stops working across bundle boundaries.
	test('HttpError instances are branded with name "HttpError"', () => {
		expect(new HttpError(404, 'Not Found').name).toBe('HttpError');
	});

	test('SvelteKitError instances are branded with name "SvelteKitError"', () => {
		expect(new SvelteKitError(413, 'Payload Too Large', 'Request body too large').name).toBe(
			'SvelteKitError'
		);
	});
});

describe('is_http_error', () => {
	test('returns true for HttpError', () => {
		expect(is_http_error(new HttpError(404, 'Not Found'))).toBe(true);
	});

	test('returns false for SvelteKitError', () => {
		expect(
			is_http_error(new SvelteKitError(413, 'Payload Too Large', 'Request body too large'))
		).toBe(false);
	});

	test('returns false for plain Error', () => {
		expect(is_http_error(new Error('oops'))).toBe(false);
	});

	test('returns false for null', () => {
		expect(is_http_error(null)).toBe(false);
	});

	test('falls back to name check when instanceof fails (HttpError across bundle boundary)', () => {
		const foreign = { name: 'HttpError', status: 404, body: { message: 'Not Found' } };
		expect(is_http_error(foreign)).toBe(true);
	});

	test('returns false for a name-branded object without a finite status', () => {
		expect(is_http_error({ name: 'HttpError' })).toBe(false);
		expect(is_http_error({ name: 'HttpError', status: NaN })).toBe(false);
	});

	test('returns false for a name-branded object without a body', () => {
		// The predicate narrows to HttpError, whose consumers read error.body.message; a spoofed
		// object with a finite status but no body would make those reads throw. A genuine HttpError
		// always has a body (the constructor defaults it), so this only rejects spoofs.
		expect(is_http_error({ name: 'HttpError', status: 404 })).toBe(false);
	});
});
