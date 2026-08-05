import { describe, expect, it } from 'vitest';
import { HttpError, SvelteKitError } from '@sveltejs/kit/internal';
import { get_status } from './error.js';

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
