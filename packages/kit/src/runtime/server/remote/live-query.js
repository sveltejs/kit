/** @import { RequestEvent } from '@sveltejs/kit' */
/** @import { MaybePromise, RemoteQueryLiveInternals, RequestState, SSROptions } from 'types' */

import { HttpError, Redirect, SvelteKitError } from '@sveltejs/kit/internal';
import { parse_remote_arg, stringify } from '../../shared.js';
import { handle_error_and_jsonify } from '../utils.js';
import { assert_method, get_payload } from './parse.js';

/**
 * How long (in milliseconds) to wait after the last message was sent before
 * sending a `: keep-alive` SSE comment, to prevent proxies/load balancers with
 * an idle timeout from closing an otherwise-quiet `query.live` connection.
 */
const KEEP_ALIVE_INTERVAL = 30_000;

/**
 * Handles a `query.live` request, returning the `text/event-stream` response.
 * @param {RequestEvent} event
 * @param {RequestState} state
 * @param {SSROptions} options
 * @param {RemoteQueryLiveInternals} internals
 * @returns {Response}
 */
export function run_query_live(event, state, options, internals) {
	assert_method(event, 'GET', 'query.live');

	const transport = options.hooks.transport;
	const generator = internals.run(event, state, parse_remote_arg(get_payload(event), transport));

	return create_live_query_response(
		event.request.signal,
		generator,
		(value) => stringify(value, transport),
		(error) => handle_error_and_jsonify(event, state, options, error)
	);
}

/**
 * Builds the `text/event-stream` response for a `query.live` function, streaming
 * each changed value as an SSE `data:` message. A `: keep-alive` comment is sent
 * if no message has been emitted for `KEEP_ALIVE_INTERVAL`, which prevents
 * proxies/load balancers with an idle timeout from closing a quiet connection.
 * SSE comments are ignored by the client, so they have no observable effect.
 *
 * @param {AbortSignal} signal The request's abort signal
 * @param {AsyncGenerator<any>} generator The running live query generator
 * @param {(value: any) => string} serialize Serializes a yielded value (used to dedupe unchanged values)
 * @param {(error: unknown) => MaybePromise<any>} handle_error Turns a thrown error into a serializable payload
 * @returns {Response}
 */
export function create_live_query_response(signal, generator, serialize, handle_error) {
	const encoder = new TextEncoder();

	let closed = false;

	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let keep_alive;

	/**
	 * (Re)schedule the keep-alive comment. Called whenever a message is sent, so
	 * that a keep-alive is only emitted once `KEEP_ALIVE_INTERVAL` has elapsed
	 * without any other activity.
	 * @param {ReadableStreamDefaultController} controller
	 * @returns {void}
	 */
	function schedule_keep_alive(controller) {
		clearTimeout(keep_alive);
		keep_alive = setTimeout(() => {
			if (closed || signal.aborted) return;
			controller.enqueue(encoder.encode(': keep-alive\n\n'));
			schedule_keep_alive(controller);
		}, KEEP_ALIVE_INTERVAL);
	}

	/**
	 * @param {ReadableStreamDefaultController} controller
	 * @param {any} payload
	 * @returns {void}
	 */
	function send(controller, payload) {
		controller.enqueue(encoder.encode('data: ' + JSON.stringify(payload) + '\n\n'));
		schedule_keep_alive(controller);
	}

	/** @type {string | undefined} */
	let result = undefined;

	/** @returns {Promise<void>} */
	async function cancel() {
		if (closed) return;
		closed = true;
		clearTimeout(keep_alive);
		await generator.return(undefined);
	}

	signal.addEventListener('abort', cancel, { once: true });

	return new Response(
		new ReadableStream({
			start(controller) {
				schedule_keep_alive(controller);
			},
			async pull(controller) {
				if (signal.aborted) {
					await cancel();
					controller.close();
					return;
				}

				try {
					while (true) {
						const { value, done } = await generator.next();

						if (done) {
							await cancel();
							controller.close();
							return;
						}

						// only send changed data
						if (result !== (result = serialize(value))) {
							send(controller, {
								type: 'result',
								result
							});

							return;
						}
					}
				} catch (error) {
					if (!signal.aborted) {
						if (error instanceof Redirect) {
							send(controller, {
								type: 'redirect',
								location: error.location
							});
						} else {
							const status =
								error instanceof HttpError || error instanceof SvelteKitError ? error.status : 500;

							send(controller, {
								type: 'error',
								error: await handle_error(error),
								status
							});
						}
					}

					await cancel();
					controller.close();
				}
			},
			cancel
		}),
		{
			headers: {
				'cache-control': 'private, no-store',
				'content-type': 'text/event-stream'
			}
		}
	);
}
