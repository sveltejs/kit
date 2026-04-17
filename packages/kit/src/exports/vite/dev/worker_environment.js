/** @import { HotChannelClient, HotChannelListener, HotPayload } from 'vite' */

/**
 * Messages sent over the worker thread IPC are wrapped in this envelope
 * to distinguish them from other messages on the same port.
 */
export const CHANNEL = '__vite_hot__';

/** Channel for sending HTTP requests to the worker */
export const REQUEST_CHANNEL = '__sveltekit_request__';

/** Channel for receiving HTTP responses from the worker */
export const RESPONSE_CHANNEL = '__sveltekit_response__';

/**
 * @param {import('node:worker_threads').Worker} worker
 * @returns {import('vite').HotChannel}
 */
export function create_worker_hot_channel(worker) {
	const handler_to_worker_listener = new WeakMap();

	/** @type {HotChannelClient} */
	const client = {
		send(payload) {
			worker.postMessage({ _channel: CHANNEL, payload });
		}
	};

	return {
		send(payload) {
			worker.postMessage({ _channel: CHANNEL, payload });
		},
		/**
		 * @template T
		 * @param {T} event
		 * @param {HotChannelListener<T>} handler
		 */
		on(event, handler) {
			if (event === 'vite:client:connect') return;
			if (event === 'vite:client:disconnect') {
				const listener = (exitCode) => {
					handler(exitCode, client);
				};
				handler_to_worker_listener.set(handler, listener);
				worker.on('exit', listener);
				return;
			}

			/** @param {{ _channel?: string; payload?: HotPayload }} msg */
			const listener = ({ payload }) => {
				if (payload?.type === 'custom' && payload.event === event) {
					handler(payload.data, client);
				}
			};
			handler_to_worker_listener.set(handler, listener);
			worker.on('message', listener);
		},
		off(event, handler) {
			if (event === 'vite:client:connect') return;
			if (event === 'vite:client:disconnect') {
				const listener = handler_to_worker_listener.get(handler);
				if (listener) {
					worker.off('exit', listener);
				}
				return;
			}

			const listener = handler_to_worker_listener.get(handler);
			if (listener) {
				worker.off('message', listener);
				handler_to_worker_listener.delete(handler);
			}
		}
	};
}

let request_id = 0;

/**
 * Sends a Request to the worker thread for handling and returns the Response.
 * The worker must be running `worker_runner.js`.
 *
 * @param {import('node:worker_threads').Worker} worker
 * @param {Request} request
 * @param {string | undefined} remote_address
 * @returns {Promise<Response>}
 */
export async function dispatch_request(worker, request, remote_address) {
	const id = request_id++;

	const body = request.body ? new Uint8Array(await request.arrayBuffer()) : null;

	return new Promise((fulfil, reject) => {
		function handler(msg) {
			if (msg?._channel !== RESPONSE_CHANNEL || msg.id !== id) return;
			worker.off('message', handler);

			if (msg.error) {
				const error = new Error(msg.error.message);
				error.stack = msg.error.stack;
				reject(error);
				return;
			}

			const { status, statusText, headers } = msg.response;
			fulfil(new Response(msg.response.body, { status, statusText, headers }));
		}

		worker.on('message', handler);

		worker.postMessage(
			{
				_channel: REQUEST_CHANNEL,
				id,
				request: {
					url: request.url,
					method: request.method,
					headers: Object.fromEntries(request.headers),
					body
				},
				remote_address
			},
			body ? [body.buffer] : []
		);
	});
}
