/* eslint-disable n/prefer-global/process --
 Vercel Edge Runtime does not support node:process */
import { Server } from 'SERVER';
import { manifest } from 'MANIFEST';

const server = new Server(manifest);

/** @type {HeadersInit | undefined} */
let read_headers;
if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
	read_headers = {
		'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET
	};
}

/**
 * We don't know the origin until we receive a request, but
 * that's guaranteed to happen before we call `read`
 * @type {string}
 */
let origin;

const initialized = server.init({
	env: /** @type {Record<string, string>} */ (process.env),
	read: async (file) => {
		const url = `${origin}/${file}`;
		const response = await fetch(url, {
			// we need to add a bypass header if the user has deployment protection enabled
			// see https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation
			headers: read_headers
		});

		// TODO: if the user hasn't enabled protection bypass for automation we should probably tell them to do so but only if deployment protection is enabled

		if (!response.ok) {
			throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
		}

		return response.body;
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
