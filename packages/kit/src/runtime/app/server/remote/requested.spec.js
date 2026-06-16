import { describe, expect, test } from 'vitest';
import { HttpError } from '@sveltejs/kit/internal';
import { with_request_store } from '@sveltejs/kit/internal/server';
import { requested } from './requested.js';
import {
	create_mock_event,
	create_mock_internals,
	create_mock_remote,
	create_mock_state
} from '../../../../../test/mocks/server.js';

/**
 * Builds a query function (with attached `internals`) suitable for `requested()`.
 * @param {Record<string, any>} [internals]
 * @returns {any}
 */
function query_fn(internals) {
	return create_mock_remote(
		() => {},
		create_mock_internals({
			type: 'query',
			id: 'getPost',
			name: 'getPost',
			validate: (/** @type {any} */ arg) => arg,
			bind: () => ({}),
			...internals
		})
	);
}

describe('requested', () => {
	test('rejects requested refreshes that exceed the limit with a 400', async () => {
		const event = create_mock_event({ isRemoteRequest: true });
		const state = create_mock_state({
			is_in_remote_form_or_command: true,
			remote: { requested: new Map([['getPost', ['p1', 'p2', 'p3']]]) }
		});

		with_request_store({ event, state }, () => requested(query_fn(), 1));

		// the first payload is selected (only refreshed if the caller iterates);
		// the two over-limit payloads are recorded as failures
		const explicit = /** @type {Map<string, { promise: Promise<any> }>} */ (
			/** @type {any} */ (state.remote.explicit)
		);

		expect([...explicit.keys()].sort()).toEqual(['getPost/p2', 'getPost/p3']);

		await expect(explicit.get('getPost/p2')?.promise).rejects.toSatisfy(
			(/** @type {unknown} */ error) =>
				error instanceof HttpError &&
				error.status === 400 &&
				error.body.message.includes('exceeded requested(getPost, 1) limit')
		);
	});

	test('throws when called outside a command/form context', () => {
		const event = create_mock_event({ isRemoteRequest: true });
		const state = create_mock_state({
			is_in_remote_form_or_command: false,
			remote: { requested: new Map([['getPost', ['p1']]]) }
		});

		expect(() => with_request_store({ event, state }, () => requested(query_fn(), 1))).toThrow(
			/can only be called in the context of a command\/form/
		);
	});

	test('throws when given a function that is not a query', () => {
		const event = create_mock_event({ isRemoteRequest: true });
		const state = create_mock_state({ is_in_remote_form_or_command: true });
		const not_a_query = create_mock_remote(
			() => {},
			create_mock_internals({ type: 'command', id: 'doThing', name: 'doThing' })
		);

		expect(() =>
			with_request_store({ event, state }, () => requested(/** @type {any} */ (not_a_query), 1))
		).toThrow(/expects a query function/);
	});
});
