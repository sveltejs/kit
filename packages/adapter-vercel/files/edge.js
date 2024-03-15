import { Server } from 'SERVER';
import { manifest, base, version_file, skew_protection, deployment_id } from 'MANIFEST';

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

	const response = await server.respond(request, {
		getClientAddress() {
			return /** @type {string} */ (request.headers.get('x-forwarded-for'));
		},
		platform: {
			context
		}
	});

	if (skew_protection) {
		response.headers.set('Set-Cookie', `__vdpl=${deployment_id}; Path=${base}; SameSite=Lax; Secure; HttpOnly`);
		response.headers.set('Set-Cookie', `__vdpl=; Path=${version_file}; SameSite=Lax; Secure; HttpOnly`);
	}

	return response;
};
