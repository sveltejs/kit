import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import * as devalue from 'devalue';
import { handle_remote_call } from './call.js';
import { BINARY_FORM_CONTENT_TYPE, serialize_binary_form } from '../../form-utils.js';
import {
	create_mock_event,
	create_mock_internals,
	create_mock_manifest,
	create_mock_options,
	create_mock_remote,
	create_mock_request,
	create_mock_state
} from '../../../../test/mocks/server.js';

describe('handle_remote_call', () => {
	beforeAll(() => {
		// referenced as a bare global by `handle_error_and_jsonify`
		// @ts-expect-error
		globalThis.__SVELTEKIT_DEV__ = false;
	});

	afterAll(() => {
		// @ts-expect-error
		delete globalThis.__SVELTEKIT_DEV__;
	});

	test('runs a query and serializes the result', async () => {
		const internals = create_mock_internals({ type: 'query', id: 'h/myquery', name: 'myquery' });
		const fn = create_mock_remote(() => 'query-result', internals);
		const manifest = create_mock_manifest({ h: { myquery: fn } });

		const event = create_mock_event({
			request: create_mock_request({ url: 'http://localhost/_app/remote/h/myquery?payload=' })
		});

		const response = await handle_remote_call(
			event,
			create_mock_state(),
			create_mock_options(),
			manifest,
			'h/myquery'
		);

		const body = await response.json();
		expect(body.type).toBe('result');
		expect(devalue.parse(body.data)).toEqual({ _: 'query-result' });
	});

	test('runs a command (reads the JSON body) and records requested refreshes', async () => {
		const internals = create_mock_internals({ type: 'command', id: 'h/cmd', name: 'cmd' });
		const fn = create_mock_remote(() => 'ran', internals);
		const manifest = create_mock_manifest({ h: { cmd: fn } });

		const event = create_mock_event({
			request: create_mock_request({
				method: 'POST',
				url: 'http://localhost/_app/remote/h/cmd',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ payload: '', refreshes: [] })
			})
		});
		const state = create_mock_state();

		const response = await handle_remote_call(
			event,
			state,
			create_mock_options(),
			manifest,
			'h/cmd'
		);

		const body = await response.json();
		expect(body.type).toBe('result');
		expect(devalue.parse(body.data)).toEqual({ _: 'ran' });
		// the command handler populates the requested map from the body
		expect(state.remote.requested).toBeInstanceOf(Map);
	});

	test('returns a 405 error envelope when a query.batch is not POSTed', async () => {
		const internals = create_mock_internals({
			type: 'query_batch',
			id: 'h/b',
			name: 'b',
			run: () => Promise.resolve([])
		});
		const fn = create_mock_remote(() => {}, internals);
		const manifest = create_mock_manifest({ h: { b: fn } });

		const event = create_mock_event({
			request: create_mock_request({ method: 'GET', url: 'http://localhost/_app/remote/h/b' })
		});

		const response = await handle_remote_call(
			event,
			create_mock_state(),
			create_mock_options(),
			manifest,
			'h/b'
		);

		const body = await response.json();
		expect(body.type).toBe('error');
		expect(body.status).toBe(405);
	});

	test('rejects with a 404 when the remote function does not exist', async () => {
		const event = create_mock_event();

		await expect(
			handle_remote_call(
				event,
				create_mock_state(),
				create_mock_options(),
				create_mock_manifest({}),
				'missing/fn'
			)
		).rejects.toMatchObject({ status: 404 });
	});

	test('returns an event-stream response for query.live', async () => {
		const internals = create_mock_internals({
			type: 'query_live',
			id: 'h/live',
			name: 'live',
			*run() {
				yield 1;
			}
		});
		const fn = create_mock_remote(() => {}, internals);
		const manifest = create_mock_manifest({ h: { live: fn } });

		const event = create_mock_event({
			request: create_mock_request({
				method: 'GET',
				url: 'http://localhost/_app/remote/h/live?payload='
			})
		});

		const response = await handle_remote_call(
			event,
			create_mock_state(),
			create_mock_options(),
			manifest,
			'h/live'
		);

		expect(response.headers.get('content-type')).toBe('text/event-stream');

		// tear the stream down so the keep-alive timer doesn't dangle
		await response.body?.cancel();
	});

	describe('enhanced form submissions', () => {
		/** @returns {import('@sveltejs/kit').RequestEvent} */
		function form_event() {
			const { blob } = serialize_binary_form({}, {});
			return create_mock_event({
				request: create_mock_request({
					method: 'POST',
					url: 'http://localhost/_app/remote/h/myform',
					headers: {
						'content-type': BINARY_FORM_CONTENT_TYPE,
						'content-length': blob.size.toString()
					},
					body: blob
				})
			});
		}

		test('runs the form handler and serializes the result', async () => {
			const internals = create_mock_internals({ type: 'form', fn: () => 'form-result' });
			const fn = create_mock_remote(() => {}, internals);
			const manifest = create_mock_manifest({ h: { myform: fn } });

			const response = await handle_remote_call(
				form_event(),
				create_mock_state(),
				create_mock_options(),
				manifest,
				'h/myform'
			);

			const body = await response.json();
			expect(body.type).toBe('result');
			expect(devalue.parse(body.data)).toEqual({ _: 'form-result' });
		});

		test('returns validation issues without serializing refreshes/reconnects', async () => {
			const internals = create_mock_internals({
				type: 'form',
				fn: () => ({ issues: ['too short'] })
			});
			const fn = create_mock_remote(() => {}, internals);
			const manifest = create_mock_manifest({ h: { myform: fn } });

			const response = await handle_remote_call(
				form_event(),
				create_mock_state(),
				create_mock_options(),
				manifest,
				'h/myform'
			);

			const body = await response.json();
			expect(body.type).toBe('result');
			expect(devalue.parse(body.data)).toEqual({ _: { issues: ['too short'] } });
		});
	});
});
