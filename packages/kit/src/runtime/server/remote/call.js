/** @import { RequestEvent, SSRManifest } from '@sveltejs/kit' */
/** @import { RemoteFunctionData, RemoteInternals, RequestState, SSROptions } from 'types' */

import { error } from '@sveltejs/kit';
import { Redirect } from '@sveltejs/kit/internal';
import { with_request_store, merge_tracing } from '@sveltejs/kit/internal/server';
import { record_span } from '../../telemetry/record_span.js';
import { handle_error_and_jsonify } from '../utils.js';
import { collect_remote_data } from './collect.js';
import { run_command, run_form, run_prerender, run_query, run_query_batch } from './dispatch.js';
import { run_query_live } from './live-query.js';
import { error_response, error_to_status, result_response } from './response.js';

/** @type {typeof handle_remote_call_internal} */
export async function handle_remote_call(event, state, options, manifest, id) {
	return record_span({
		name: 'sveltekit.remote.call',
		attributes: {
			'sveltekit.remote.call.id': id
		},
		fn: (current) => {
			const traced_event = merge_tracing(event, current);
			return with_request_store({ event: traced_event, state }, () =>
				handle_remote_call_internal(traced_event, state, options, manifest, id)
			);
		}
	});
}

/**
 * @param {RequestEvent} event
 * @param {RequestState} state
 * @param {SSROptions} options
 * @param {SSRManifest} manifest
 * @param {string} id
 * @returns {Promise<Response>}
 */
async function handle_remote_call_internal(event, state, options, manifest, id) {
	const [hash, name, additional_args] = id.split('/');
	const remotes = manifest._.remotes;

	if (!remotes[hash]) error(404);

	const module = await remotes[hash]();
	const fn = module.default[name];

	if (!fn) error(404);

	/** @type {RemoteInternals} */
	const internals = fn.__;
	const transport = options.hooks.transport;

	event.tracing.current.setAttributes({
		'sveltekit.remote.call.type': internals.type,
		'sveltekit.remote.call.name': internals.name
	});

	/** @param {unknown} e */
	const handle_error = (e) => handle_error_and_jsonify(event, state, options, e);

	try {
		/** @type {RemoteFunctionData} */
		const data = {};

		switch (internals.type) {
			case 'query_live':
				return run_query_live(event, state, options, internals);

			case 'query_batch':
				data._ = await run_query_batch(event, state, options, internals);
				break;

			case 'form': {
				const result = await run_form(event, state, options, internals, additional_args);

				if ('response' in result) {
					return result.response;
				}

				data._ = result.data;
				break;
			}

			case 'command':
				data._ = await run_command(event, state, options, fn);
				break;

			case 'prerender':
				data._ = await run_prerender(event, state, options, fn, additional_args);
				break;

			case 'query':
				data._ = await run_query(event, state, options, fn);
				break;
		}

		await collect_remote_data(data, state, handle_error);

		return result_response(data, transport);
	} catch (error) {
		if (error instanceof Redirect) {
			const data = await collect_remote_data({ redirect: error.location }, state, handle_error);

			return result_response(data, transport);
		}

		const status = error_to_status(error);

		return error_response(await handle_error(error), status, {
			// By setting a non-200 during prerendering we fail the prerender process (unless handleHttpError handles it).
			// Errors at runtime will be passed to the client and are handled there
			status: state.prerendering ? status : undefined,
			headers: {
				'cache-control': 'private, no-store'
			}
		});
	}
}
