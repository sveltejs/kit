import { Server } from 'SERVER';
import { manifest } from 'MANIFEST';

const server = new Server(manifest);

/**
 * We don't know the origin until we receive a request, but
 * that's guaranteed to happen before we call `read`
 * @type {string}
 */
let origin;

const initialized = server.init({
	env: /** @type {Record<string, string>} */ (process.env),
	read: (file) => {
		const controller = new AbortController();
		const signal = controller.signal;

		return new ReadableStream({
			async start(controller) {
				try {
					const response = await fetch(`${origin}/${file}`, { signal });
					const reader = /** @type {ReadableStream} */ (response.body).getReader();

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
});

/**
 * @param {Request} request
 * @param {import('../index.js').RequestContext} context
 */
export default async (request, context) => {
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
