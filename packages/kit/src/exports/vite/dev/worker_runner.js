/** @import { ModuleRunnerTransport } from 'vite/module-runner' */
import { parentPort } from 'node:worker_threads';
import { ModuleRunner, ESModulesEvaluator, createNodeImportMeta } from 'vite/module-runner';
import { CHANNEL, REQUEST_CHANNEL, RESPONSE_CHANNEL } from './worker_environment.js';

if (!parentPort) {
	throw new Error('src/exports/vite/dev/worker_runner.js must be run as a worker thread');
}

const port = parentPort;

let message_handler;
let close_handler;

/** @type {ModuleRunnerTransport} */
const transport = {
	connect({ onMessage, onDisconnection }) {
		message_handler = (msg) => {
			if (msg?._channel === CHANNEL) {
				onMessage(msg.payload);
			}
		};
		port.on('message', message_handler);
		close_handler = onDisconnection;
		port.on('close', close_handler);
	},
	send(data) {
		port.postMessage({ _channel: CHANNEL, payload: data });
	},
	disconnect() {
		port.off('message', message_handler);
		port.off('close', close_handler);
	}
};

const runner = new ModuleRunner(
	{
		transport,
		createImportMeta: createNodeImportMeta
	},
	new ESModulesEvaluator()
);

/**
 * @typedef {object} Message
 * @property {string} _channel
 * @property {number} id
 * @property {Request} request
 * @property {string} remote_address
 */

port.on(
	'message',
	/** @param {Message} msg */
	async (msg) => {
		if (msg?._channel !== REQUEST_CHANNEL) return;

		const { id, request: data, remote_address } = msg;

		try {
			const request = new Request(data.url, {
				method: data.method,
				headers: data.headers,
				body: data.body,
				// @ts-expect-error duplex is needed for request bodies in Node.js
				duplex: data.body ? 'half' : undefined
			});

			/** @type {import('./ssr_entry.js')} */
			const { respond } = await runner.import('__sveltekit/dev-server-entry');
			const response = await respond(request, remote_address);

			const body = response.body ? new Uint8Array(await response.arrayBuffer()) : null;

			port.postMessage(
				{
					_channel: RESPONSE_CHANNEL,
					id,
					response: {
						status: response.status,
						statusText: response.statusText,
						headers: Object.fromEntries(response.headers),
						body
					}
				},
				body ? [body.buffer] : []
			);
		} catch (error) {
			const err = /** @type {Error} */ (error);

			// Log in the worker so the error is visible
			console.error(err);

			port.postMessage({
				_channel: RESPONSE_CHANNEL,
				id,
				error: { message: err.message, stack: err.stack ?? '' }
			});
		}
	}
);
