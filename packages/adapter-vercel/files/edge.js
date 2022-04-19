import { Server } from 'SERVER';
import { manifest } from 'MANIFEST';

const server = new Server(manifest);

/**
 * @param {Request} request
 * @param {any} event
 */
export default (request, event) => {
	return server.respond(request, {
		getClientAddress() {
			return request.headers.get('x-forwarded-for');
		}
	});
};
