import { describe, expect, test } from 'vitest';
import { Redirect } from '@sveltejs/kit/internal';
import { collect_remote_data } from './collect.js';
import { create_mock_internals, create_mock_state } from '../../../../test/mocks/server.js';

/** @type {(error: unknown) => Promise<App.Error>} */
const handle_error = (error) =>
	Promise.resolve({ message: error instanceof Error ? error.message : String(error) });

describe('collect_remote_data', () => {
	test('returns data untouched when there is no remote data', async () => {
		const data = await collect_remote_data({}, create_mock_state(), handle_error);
		expect(data).toEqual({});
	});

	describe('explicit', () => {
		test('serializes a resolved value and flags single-flight updates', async () => {
			const internals = create_mock_internals({ type: 'query', id: 'q', name: 'q' });
			const state = create_mock_state({
				remote: {
					explicit: new Map([['q/payload', { internals, promise: Promise.resolve(42) }]])
				}
			});

			const data = await collect_remote_data({}, state, handle_error);

			expect(data).toEqual({ r: true, q: { 'q/payload': { v: 42 } } });
		});

		test('serializes a rejected value as [status, error]', async () => {
			const internals = create_mock_internals({ type: 'query', id: 'q', name: 'q' });
			const state = create_mock_state({
				remote: {
					explicit: new Map([
						['q/payload', { internals, promise: Promise.reject(new Error('boom')) }]
					])
				}
			});

			const data = await collect_remote_data({}, state, handle_error);

			expect(data).toEqual({ r: true, q: { 'q/payload': { e: [500, { message: 'boom' }] } } });
		});

		test('uses `l` as the type prefix for live queries', async () => {
			const internals = create_mock_internals({ type: 'query_live', id: 'l', name: 'l' });
			const state = create_mock_state({
				remote: {
					explicit: new Map([['l/payload', { internals, promise: Promise.resolve('tick') }]])
				}
			});

			const data = await collect_remote_data({}, state, handle_error);

			expect(data).toEqual({ r: true, l: { 'l/payload': { v: 'tick' } } });
		});

		test('skips a promise that rejects with a redirect (handled elsewhere)', async () => {
			const internals = create_mock_internals({ type: 'query', id: 'q', name: 'q' });
			const state = create_mock_state({
				remote: {
					explicit: new Map([
						['q/payload', { internals, promise: Promise.reject(new Redirect(307, '/login')) }]
					])
				}
			});

			const data = await collect_remote_data({}, state, handle_error);

			// single-flight is still flagged, but no value/error is serialized for the redirected query
			expect(data).toEqual({ r: true });
		});
	});

	describe('implicit', () => {
		test('serializes a synchronously-resolved value under its remote key', async () => {
			const internals = create_mock_internals({ type: 'query', id: 'q', name: 'q' });
			const state = create_mock_state({
				remote: {
					implicit: new Map([[internals, { payload: () => Promise.resolve('hi') }]])
				}
			});

			const data = await collect_remote_data({}, state, handle_error);

			expect(data).toEqual({ q: { 'q/payload': { v: 'hi' } } });
		});

		test('omits a still-pending promise so the client fetches it itself', async () => {
			const internals = create_mock_internals({ type: 'query', id: 'q', name: 'q' });
			const state = create_mock_state({
				remote: {
					implicit: new Map([[internals, { payload: () => new Promise(() => {}) }]])
				}
			});

			const data = await collect_remote_data({}, state, handle_error);

			expect(data).toEqual({});
		});

		test('skips a promise that rejects with a redirect (handled elsewhere)', async () => {
			const internals = create_mock_internals({ type: 'query', id: 'q', name: 'q' });
			const state = create_mock_state({
				remote: {
					implicit: new Map([
						[internals, { payload: () => Promise.reject(new Redirect(307, '/login')) }]
					])
				}
			});

			const data = await collect_remote_data({}, state, handle_error);

			expect(data).toEqual({});
		});

		test('skips private (non-exported) functions that have no id', async () => {
			const internals = create_mock_internals({ type: 'query', id: '', name: 'private' });
			const state = create_mock_state({
				remote: {
					implicit: new Map([[internals, { payload: () => Promise.resolve('secret') }]])
				}
			});

			const data = await collect_remote_data({}, state, handle_error);

			expect(data).toEqual({});
		});

		test('registers form outputs under the action key directly', async () => {
			const internals = create_mock_internals({ type: 'form', id: 'f', name: 'f' });
			const state = create_mock_state({
				remote: {
					implicit: new Map([[internals, { 'action-key': () => Promise.resolve('ok') }]])
				}
			});

			const data = await collect_remote_data({}, state, handle_error);

			expect(data).toEqual({ f: { 'action-key': { v: 'ok' } } });
		});

		test('prefers an already-resolved value from the request cache', async () => {
			const internals = create_mock_internals({ type: 'query', id: 'q', name: 'q' });
			const state = create_mock_state({
				remote: {
					data: new Map([[internals, { payload: Promise.resolve('cached') }]]),
					implicit: new Map([[internals, { payload: () => Promise.resolve('fresh') }]])
				}
			});

			const data = await collect_remote_data({}, state, handle_error);

			expect(data).toEqual({ q: { 'q/payload': { v: 'cached' } } });
		});
	});
});
