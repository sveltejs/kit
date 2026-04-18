/** @import { ModuleRunnerTransport } from 'vite/module-runner' */
import { parentPort } from 'node:worker_threads';
import { ModuleRunner, ESModulesEvaluator, createNodeImportMeta } from 'vite/module-runner';
import { CHANNEL, REQUEST_CHANNEL, RESPONSE_CHANNEL } from './worker_environment.js';

if (!parentPort) {
	throw new Error('This file must be run as a worker thread');
}

const port = parentPort;

/** @type {ModuleRunnerTransport} */
const transport = {
	connect({ onMessage, onDisconnection }) {
		port.on('message', (msg) => {
			if (msg?._channel === CHANNEL) {
				onMessage(msg.payload);
			}
		});
		port.on('close', onDisconnection);
	},
	send(data) {
		port.postMessage({ _channel: CHANNEL, payload: data });
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
 * @typedef {object} MyMessage
 * @property {'__sveltekit_request__'} _channel
 * @property {number} id
 * @property {Request} request
 * @property {string} remote_address
 */

port.on(
	'message',
	/** @param {MyMessage} msg */
	async (msg) => {
		if (msg?._channel !== REQUEST_CHANNEL) return;

		const { id, request: data, remote_address } = msg;

		try {
			const request = new Request(data.url, {
				method: data.method,
				headers: data.headers,
				body: data.body,
				// @ts-ignore duplex is needed for request bodies in Node.js
				duplex: data.body ? 'half' : undefined
			});

			/** @type {import('./entry.js')} */
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
