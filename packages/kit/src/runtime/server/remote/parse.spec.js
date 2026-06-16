import { describe, expect, test } from 'vitest';
import { SvelteKitError } from '@sveltejs/kit/internal';
import { assert_form_content_type, assert_method, get_payload } from './parse.js';
import { create_mock_event, create_mock_request } from '../../../../test/mocks/server.js';

describe('assert_method', () => {
	test('does not throw when the method matches', () => {
		const event = create_mock_event({ request: create_mock_request({ method: 'GET' }) });
		expect(() => assert_method(event, 'GET', 'query.live')).not.toThrow();
	});

	test('throws a 405 SvelteKitError when the method is wrong', () => {
		const event = create_mock_event({ request: create_mock_request({ method: 'GET' }) });

		try {
			assert_method(event, 'POST', 'form');
			expect.unreachable();
		} catch (e) {
			const error = /** @type {SvelteKitError} */ (e);
			expect(error).toBeInstanceOf(SvelteKitError);
			expect(error.status).toBe(405);
			expect(error.message).toBe('`form` functions must be invoked via POST request, not GET');
		}
	});
});

describe('assert_form_content_type', () => {
	test('does not throw for form-encoded requests', () => {
		const event = create_mock_event({
			request: create_mock_request({
				method: 'POST',
				headers: { 'content-type': 'application/x-www-form-urlencoded' }
			})
		});

		expect(() => assert_form_content_type(event)).not.toThrow();
	});

	test('throws a 415 SvelteKitError otherwise', () => {
		const event = create_mock_event({
			request: create_mock_request({
				method: 'POST',
				headers: { 'content-type': 'application/json' }
			})
		});

		try {
			assert_form_content_type(event);
			expect.unreachable();
		} catch (e) {
			const error = /** @type {SvelteKitError} */ (e);
			expect(error).toBeInstanceOf(SvelteKitError);
			expect(error.status).toBe(415);
		}
	});
});

describe('get_payload', () => {
	test('reads the `payload` search param', () => {
		const event = create_mock_event({
			request: create_mock_request({ url: 'http://localhost/_app/remote/x?payload=abc' })
		});

		expect(get_payload(event)).toBe('abc');
	});

	test('returns null when absent', () => {
		const event = create_mock_event({
			request: create_mock_request({ url: 'http://localhost/_app/remote/x' })
		});

		expect(get_payload(event)).toBe(null);
	});
});
