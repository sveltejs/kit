import { Server } from 'SERVER';
import { manifest } from 'MANIFEST';

const server = new Server(manifest);
const initialized = server.init({
	env: /** @type {Record<string, string>} */ (process.env)
});

/**
 * @param {Request} request
 * @param {import('../index.js').RequestContext} context
 */
export default async (request, context) => {
	await initialized;

	return server.respond(request, {
		getClientAddress() {
			return /** @type {string} */ (request.headers.get('x-forwarded-for'));
		},
		platform: {
			context
		}
	});
};
