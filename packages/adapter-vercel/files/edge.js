import { Server } from 'SERVER';
import { manifest } from 'MANIFEST';

const server = new Server(manifest);

await server.init({
	env: process.env
});

/**
 * @param {Request} request
 */
export default (request) => {
	return server.respond(request, {
		getClientAddress() {
			return request.headers.get('x-forwarded-for');
		}
	});
};
