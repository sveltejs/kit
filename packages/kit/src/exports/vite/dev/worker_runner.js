/** @import { ModuleRunnerTransport } from 'vite/module-runner' */
import { parentPort } from 'node:worker_threads';
import { ModuleRunner, ESModulesEvaluator, createNodeImportMeta } from 'vite/module-runner';
import { CHANNEL, REQUEST_CHANNEL, RESPONSE_CHANNEL } from './worker_environment.js';

if (!parentPort) {
	throw new Error('src/exports/vite/dev/worker_runner.js must be run as a worker thread');
}

const port = parentPort;

/** @type {(value: { _channel?: string; payload?: any }) => void} */
let message_handler;
/** @type {(ev: Event) => void} */
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
 * @property {'__sveltekit_request__'} _channel
 * @property {number} id
 * @property {Request} request
 * @property {string} remote_address
 */

port.on(
	'message',
	/** @param {Message | { _channel?: '__vite_hot__' }} msg */
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

			// TODO: TypeError: Received non-Uint8Array chunk /Users/teeming/git/sveltejs/kit-version-3/packages/kit/test/apps/basics/src/routes/endpoint-output/stream-throw-error/+server.js:6:11
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
			port.postMessage({
				_channel: RESPONSE_CHANNEL,
				id,
				error
			});
		}
	}
);
