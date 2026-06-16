import { describe, expect, test, vi } from 'vitest';
import { Redirect } from '@sveltejs/kit/internal';
import { handle_remote_form_post } from './form-post.js';
import { BINARY_FORM_CONTENT_TYPE, serialize_binary_form } from '../../form-utils.js';
import {
	create_mock_event,
	create_mock_internals,
	create_mock_manifest,
	create_mock_remote,
	create_mock_request,
	create_mock_state
} from '../../../../test/mocks/server.js';

/**
 * Wraps a form handler `fn` into the module shape the manifest exposes
 * (`module.default[name].__.fn`).
 * @param {(...args: any[]) => any} fn
 */
function form_module(fn) {
	return create_mock_remote(() => {}, create_mock_internals({ type: 'form', fn }));
}

/**
 * Builds a `RequestEvent` carrying a serialized (binary) form submission.
 * @param {Record<string, any>} [data]
 * @param {Partial<import('@sveltejs/kit').RequestEvent>} [overrides]
 */
function form_event(data = {}, overrides) {
	const { blob } = serialize_binary_form(data, {});

	return create_mock_event({
		request: create_mock_request({
			method: 'POST',
			headers: {
				'content-type': BINARY_FORM_CONTENT_TYPE,
				'content-length': blob.size.toString()
			},
			body: blob
		}),
		...overrides
	});
}

describe('handle_remote_form_post', () => {
	test('returns a 405 error and sets the Allow header when no form action exists', async () => {
		const setHeaders = vi.fn();
		const event = create_mock_event({
			setHeaders,
			request: create_mock_request({ method: 'POST' })
		});

		const result = await handle_remote_form_post(
			event,
			create_mock_state(),
			create_mock_manifest({ h: {} }),
			'h/missing'
		);

		expect(result.type).toBe('error');
		const error = /** @type {any} */ (result).error;
		expect(error.status).toBe(405);
		expect(error.message).toContain('POST method not allowed');
		expect(setHeaders).toHaveBeenCalledWith({ allow: 'GET' });
	});

	test('runs the form handler and returns success', async () => {
		const fn = vi.fn(() => Promise.resolve());
		const manifest = create_mock_manifest({ h: { myform: form_module(fn) } });

		const result = await handle_remote_form_post(
			form_event(),
			create_mock_state(),
			manifest,
			'h/myform'
		);

		expect(result).toEqual({ type: 'success', status: 200 });
		expect(fn).toHaveBeenCalledOnce();
	});

	test('converts a thrown redirect into a redirect result', async () => {
		const fn = vi.fn(() => {
			throw new Redirect(303, '/login');
		});
		const manifest = create_mock_manifest({ h: { myform: form_module(fn) } });

		const result = await handle_remote_form_post(
			form_event(),
			create_mock_state(),
			manifest,
			'h/myform'
		);

		expect(result).toEqual({ type: 'redirect', status: 303, location: '/login' });
	});

	test('returns an error result when the handler throws', async () => {
		const error = new Error('boom');
		const fn = vi.fn(() => {
			throw error;
		});
		const manifest = create_mock_manifest({ h: { myform: form_module(fn) } });

		const result = await handle_remote_form_post(
			form_event(),
			create_mock_state(),
			manifest,
			'h/myform'
		);

		expect(result.type).toBe('error');
		expect(/** @type {any} */ (result).error).toBe(error);
	});

	describe('keyed instances (form.for)', () => {
		/**
		 * @param {(...args: any[]) => any} fn the keyed instance's handler
		 * @returns {{ base: any, for_spy: import('vitest').Mock }}
		 */
		function keyed_form(fn) {
			const keyed = { __: { type: 'form', fn } };
			const for_spy = vi.fn(() => keyed);
			// the base form is only used to resolve the keyed instance via `.for(key)`
			const base = {
				__: {
					type: 'form',
					fn: () => {
						throw new Error('base handler should not run for keyed submissions');
					}
				},
				for: for_spy
			};
			return { base, for_spy };
		}

		test('dispatches to the keyed instance and injects the key as `id`', async () => {
			const fn = vi.fn((/** @type {Record<string, any>} */ _data) => Promise.resolve());
			const { base, for_spy } = keyed_form(fn);
			const manifest = create_mock_manifest({ h: { myform: base } });

			const result = await handle_remote_form_post(
				form_event(),
				create_mock_state(),
				manifest,
				'h/myform/"my-key"'
			);

			expect(result).toEqual({ type: 'success', status: 200 });
			expect(for_spy).toHaveBeenCalledWith('my-key');
			// the key is injected into the submitted data as `id`
			expect(fn.mock.calls[0][0]).toMatchObject({ id: 'my-key' });
		});

		test('rejoins keys that contain slashes', async () => {
			const fn = vi.fn(() => Promise.resolve());
			const { base, for_spy } = keyed_form(fn);
			const manifest = create_mock_manifest({ h: { myform: base } });

			const result = await handle_remote_form_post(
				form_event(),
				create_mock_state(),
				manifest,
				'h/myform/"a/b/c"'
			);

			expect(result).toEqual({ type: 'success', status: 200 });
			expect(for_spy).toHaveBeenCalledWith('a/b/c');
		});
	});
});
