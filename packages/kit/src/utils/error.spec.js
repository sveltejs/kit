import { describe, expect, it } from 'vitest';
import { HttpError, SvelteKitError } from '@sveltejs/kit/internal';
import { get_status } from './error.js';

describe('get_status', () => {
	it('returns status from transformed error', () => {
		expect(get_status({ message: 'not found', status: 404 }, new Error('oops'))).toBe(404);
	});

	it('falls back to HttpError status', () => {
		const error = new HttpError(403, { message: 'forbidden' });
		expect(get_status({ message: 'forbidden' }, error)).toBe(403);
	});

	it('falls back to SvelteKitError status', () => {
		const error = new SvelteKitError(404, 'Not Found', 'missing');
		expect(get_status({ message: 'missing' }, error)).toBe(404);
	});

	it('returns 500 for plain errors', () => {
		expect(get_status({ message: 'oops' }, new Error('oops'))).toBe(500);
	});

	it('works with a single HttpError argument', () => {
		const error = new HttpError(418, { message: 'teapot' });
		expect(get_status(error)).toBe(418);
	});

	it('works with a single plain Error argument', () => {
		expect(get_status(new Error('oops'))).toBe(500);
	});
});
