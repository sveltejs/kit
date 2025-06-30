import { Server } from 'SERVER';
import { manifest } from 'MANIFEST';

/**
 * Synchronously returns a `ReadableStream` containing the body of an
 * asynchronously fetched asset.
 * @param {{
 * 	origin: string;
 * 	file: string;
 * 	fetch?: typeof globalThis.fetch;
 * }} options
 * @returns {ReadableStream}
 * @since 2.23.0
 */
function streamFileContent({ origin, file, fetch = globalThis.fetch }) {
	const controller = new AbortController();
	const signal = controller.signal;

	return new ReadableStream({
		async start(controller) {
			try {
				const response = await fetch(`${origin}/${file}`, { signal });
				if (!response.ok) {
					throw new Error(`Failed to fetch ${file}: ${response.status} ${response.statusText}`);
				}

				if (!response.body) {
					controller.close();
					return;
				}

				const reader = response.body.getReader();

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					controller.enqueue(value);
				}

				controller.close();
			} catch (error) {
				controller.error(error);
			}
		},
		cancel(reason) {
			controller.abort(reason);
		}
	});
}

/* eslint-disable n/prefer-global/process --
 Vercel Edge Runtime does not support node:process */

const server = new Server(manifest);

/**
 * We don't know the origin until we receive a request, but
 * that's guaranteed to happen before we call `read`
 * @type {string}
 */
let origin;

const initialized = server.init({
	env: /** @type {Record<string, string>} */ (process.env),
	read: (file) => streamFileContent({ origin, file })
});

/**
 * @param {Request} request
 * @param {import('../index.js').RequestContext} context
 */
var edge = async (request, context) => {
	if (!origin) {
		origin = new URL(request.url).origin;
		await initialized;
	}

	return server.respond(request, {
		getClientAddress() {
			return /** @type {string} */ (request.headers.get('x-forwarded-for'));
		},
		platform: {
			context
		}
	});
};

export { edge as default };
