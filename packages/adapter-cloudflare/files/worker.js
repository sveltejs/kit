import { server } from 'SERVER';
import { env } from 'cloudflare:workers';

const app_path = `/${server.manifest.app_path}`;

const immutable = `${app_path}/immutable/`;
const version_file = `${app_path}/version.json`;

/**
 * We don't know the origin until we receive a request, but
 * that's guaranteed to happen before we call `read`
 * @type {string}
 */
let origin;

const initialized = server.init({
	env: /** @type {Record<string, string>} */ (env),
	read: async (file) => {
		const url = `${origin}/${file}`;
		const response =
			await /** @type {{ ASSETS: { fetch: typeof fetch } }} */ (env).ASSETS.fetch(url);

		if (!response.ok) {
			throw new Error(
				`read(...) failed: could not fetch ${url} (${response.status} ${response.statusText})`
			);
		}

		return response.body;
	}
});

export default {
	/**
	 * @param {Request} req
	 * @param {{ ASSETS: { fetch: typeof fetch } }} env
	 * @param {ExecutionContext} ctx
	 * @returns {Promise<Response>}
	 */
	async fetch(req, env, ctx) {
		if (!origin) {
			origin = new URL(req.url).origin;
		}

		// always await initialization to prevent race condition with concurrent requests
		await initialized;

		let { pathname, search } = new URL(req.url);
		try {
			pathname = decodeURIComponent(pathname);
		} catch {
			// ignore invalid URI
		}

		const stripped_pathname = pathname.replace(/\/$/, '');

		// files in /static, the service worker, and Vite imported server assets
		let is_static_asset = false;
		const filename = stripped_pathname.slice(server.manifest.base_path.length + 1);
		if (filename) {
			is_static_asset =
				server.manifest.assets.has(filename) ||
				server.manifest.assets.has(filename + '/index.html');
		}

		let location = pathname.at(-1) === '/' ? stripped_pathname : pathname + '/';

		if (
			is_static_asset ||
			server.manifest.prerendered_routes.has(pathname) ||
			pathname === version_file ||
			pathname.startsWith(immutable)
		) {
			let res = await env.ASSETS.fetch(req);
			// `_headers` applies cache regardless of status, so we need to ensure an
			// error response does not get cached
			if (res.status >= 400) {
				res = new Response(res.body, res); // headers from ASSETS are immutable. see https://developers.cloudflare.com/workers/examples/alter-headers/
				res.headers.set('cache-control', 'no-store');
			}
			return res;
		}

		// trailing slash redirect for prerendered pages
		if (location && server.manifest.prerendered_routes.has(location)) {
			if (search) location += search;
			return new Response('', {
				status: 308,
				headers: {
					location
				}
			});
		}

		// dynamically-generated pages
		return await server.respond(req, {
			platform: {
				env,
				ctx,
				caches,
				cf: req.cf
			},
			getClientAddress() {
				return /** @type {string} */ (req.headers.get('cf-connecting-ip'));
			}
		});
	}
};
