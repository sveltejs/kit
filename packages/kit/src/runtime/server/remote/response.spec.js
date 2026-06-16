import { describe, expect, test } from 'vitest';
import * as devalue from 'devalue';
import { HttpError, SvelteKitError } from '@sveltejs/kit/internal';
import { error_to_status, error_response, result_response } from './response.js';

describe('error_to_status', () => {
	test('uses the status of an HttpError', () => {
		expect(error_to_status(new HttpError(404, 'Not Found'))).toBe(404);
	});

	test('uses the status of a SvelteKitError', () => {
		expect(error_to_status(new SvelteKitError(405, 'Method Not Allowed', 'nope'))).toBe(405);
	});

	test('defaults to 500 for ordinary errors', () => {
		expect(error_to_status(new Error('boom'))).toBe(500);
	});

	test('defaults to 500 for non-error values', () => {
		expect(error_to_status('boom')).toBe(500);
		expect(error_to_status(undefined)).toBe(500);
	});
});

describe('result_response', () => {
	test('serializes data into a `result` envelope', async () => {
		const response = result_response({ _: { hello: 'world' } }, {});

		expect(response.status).toBe(200);

		const body = await response.json();
		expect(body.type).toBe('result');
		// `data` is a devalue-stringified string
		expect(devalue.parse(body.data)).toEqual({ _: { hello: 'world' } });
	});
});

describe('error_response', () => {
	test('builds an `error` envelope with the given status', async () => {
		const response = error_response({ message: 'Boom' }, 500);

		const body = await response.json();
		expect(body).toEqual({ type: 'error', error: { message: 'Boom' }, status: 500 });
	});

	test('passes through the response init (status + headers)', () => {
		const response = error_response({ message: 'Boom' }, 503, {
			status: 503,
			headers: { 'cache-control': 'private, no-store' }
		});

		expect(response.status).toBe(503);
		expect(response.headers.get('cache-control')).toBe('private, no-store');
	});
});
