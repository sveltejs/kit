/** @import { RequestEvent } from '@sveltejs/kit' */
/** @import { RemoteFormInternals, RemoteQueryBatchInternals, RequestState, SSROptions } from 'types' */

import { with_request_store } from '@sveltejs/kit/internal/server';
import { parse_remote_arg } from '../../shared.js';
import { deserialize_binary_form } from '../../form-utils.js';
import { assert_form_content_type, assert_method, get_payload } from './parse.js';
import { create_requested_map } from './requested.js';
import { result_response } from './response.js';

/**
 * Runs a `query` remote function and returns its result.
 * @param {RequestEvent} event
 * @param {RequestState} state
 * @param {SSROptions} options
 * @param {(arg: any) => any} fn
 * @returns {any}
 */
export function run_query(event, state, options, fn) {
	const payload = get_payload(event);

	return with_request_store({ event, state }, () =>
		fn(parse_remote_arg(payload, options.hooks.transport))
	);
}

/**
 * Runs a `query.batch` remote function and returns its (array) result.
 * @param {RequestEvent} event
 * @param {RequestState} state
 * @param {SSROptions} options
 * @param {RemoteQueryBatchInternals} internals
 * @returns {Promise<any[]>}
 */
export async function run_query_batch(event, state, options, internals) {
	assert_method(event, 'POST', 'query.batch');

	/** @type {{ payloads: string[] }} */
	const { payloads } = await event.request.json();

	const transport = options.hooks.transport;
	const args = await Promise.all(payloads.map((payload) => parse_remote_arg(payload, transport)));

	return with_request_store({ event, state }, () => internals.run(args, options));
}

/**
 * Runs a `command` remote function and returns its result.
 * @param {RequestEvent} event
 * @param {RequestState} state
 * @param {SSROptions} options
 * @param {(arg: any) => any} fn
 * @returns {Promise<any>}
 */
export async function run_command(event, state, options, fn) {
	/** @type {{ payload: string, refreshes?: string[] }} */
	const { payload, refreshes } = await event.request.json();
	state.remote.requested = create_requested_map(refreshes);
	const arg = parse_remote_arg(payload, options.hooks.transport);

	return with_request_store(
		{ event, state: { ...state, is_in_remote_form_or_command: true } },
		() => fn(arg)
	);
}

/**
 * Runs a `prerender` remote function and returns its result.
 * @param {RequestEvent} event
 * @param {RequestState} state
 * @param {SSROptions} options
 * @param {(arg: any) => any} fn
 * @param {string} additional_args
 * @returns {any}
 */
export function run_prerender(event, state, options, fn, additional_args) {
	return with_request_store({ event, state }, () =>
		fn(parse_remote_arg(additional_args, options.hooks.transport))
	);
}

/**
 * Runs a `form` remote function. Returns either the result to serialize, or — in
 * the special case where the submission produced validation issues — a ready-made
 * response (which must not serialize refreshes/reconnects).
 * @param {RequestEvent} event
 * @param {RequestState} state
 * @param {SSROptions} options
 * @param {RemoteFormInternals} internals
 * @param {string} additional_args
 * @returns {Promise<{ data: any } | { response: Response }>}
 */
export async function run_form(event, state, options, internals, additional_args) {
	assert_method(event, 'POST', 'form');
	assert_form_content_type(event);

	const { data: input, meta, form_data } = await deserialize_binary_form(event.request);
	state.remote.requested = create_requested_map(meta.remote_refreshes);

	// If this is a keyed form instance (created via form.for(key)), add the key to the form data (unless already set)
	// Note that additional_args will only be set if the form is not enhanced, as enhanced forms transfer the key inside `data`.
	if (additional_args && !('id' in input)) {
		input.id = JSON.parse(decodeURIComponent(additional_args));
	}

	const fn = internals.fn;
	const result = await with_request_store(
		{ event, state: { ...state, is_in_remote_form_or_command: true } },
		() => fn(input, meta, form_data)
	);

	if (result.issues) {
		// special case — don't serialize refreshes/reconnects
		return { response: result_response({ _: result }, options.hooks.transport) };
	}

	return { data: result };
}
