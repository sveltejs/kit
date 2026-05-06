import { describe, test, expect } from 'vitest';
import { get_status, get_message } from './error.js';
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

	test('falls back to name check when instanceof fails (SvelteKitError across bundle boundary)', () => {
		// Simulate a SvelteKitError that came from a different copy of @sveltejs/kit
		// (e.g. adapter-node's bundled copy). instanceof fails, but .name is preserved.
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

	test('falls back to name check when instanceof fails (SvelteKitError across bundle boundary)', () => {
		const foreign = {
			name: 'SvelteKitError',
			status: 413,
			text: 'Payload Too Large',
			message: 'Request body too large'
		};
		expect(get_message(foreign)).toBe('Payload Too Large');
	});
});
