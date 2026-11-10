/** @import { Server, ServerInitOptions } from '@sveltejs/kit' */
/** @import { DevRequestInfo } from 'types' */
import { assets, instrumentation, manifest } from '<sveltekit:generated>/server-manifest.js';
import { DEV_INFO_HEADER, DEV_REMOTE_EXPORTS_HEADER } from '../../constants.js';
import { read_asset } from './dev_host.js';
import { set_read_unlisted_assets } from './internal.js';
import { get_remote_function, has_remote_prefix, strip_remote_prefix } from './remote-functions.js';

// the runtime reports the features requests use in dev, which are not checked here
globalThis.__SVELTEKIT_TRACK__ = () => {};

/** @type {ServerInitOptions | undefined} */
let options;

/** @type {Server} */
export const server = {
	init(opts) {
		options = opts;
		return Promise.resolve();
	},

	async respond(request, request_options) {
		const env = options?.env ?? {};

		if (instrumentation) {
			// the instrumentation file may read environment variables, so set them first
			const { set_env } = await import('<sveltekit:generated>/env/config.js');
			set_env(env);
			await instrumentation();
		}

		const { configure } = await import('./index.js');

		// configures the runtime for each request, like the node dev server
		const server = await configure({
			manifest,
			env,
			assets,
			read: options?.read ?? ((file) => read_asset(assets, file))
		});
		set_read_unlisted_assets();
		await server.init();

		if (request.headers.has(DEV_REMOTE_EXPORTS_HEADER)) {
			return get_remote_exports(request);
		}

		// without read, like in production, since it is only for prerendering static files
		const response = await server.respond(
			request,
			/** @type {import('types').InternalRequestOptions} */ (request_options)
		);

		/** @type {DevRequestInfo} */
		const info = {};

		const url = new URL(request.url);
		if (has_remote_prefix(url)) {
			// for the request log, which would otherwise load the module in the vite process
			const remote = await get_remote_function(strip_remote_prefix(url), manifest).catch(
				() => undefined
			);

			if (remote) {
				const { type, dev_loc } = remote.fn.__;
				info.remote = { name: remote.name, type, dev_loc };
			}
		}

		if (!info.remote) return response;

		const reported = new Response(response.body, response);
		reported.headers.set(DEV_INFO_HEADER, encodeURIComponent(JSON.stringify(info)));
		return reported;
	}
};

/**
 * responds with the types of the remote functions in a module, so it only runs in this environment
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function get_remote_exports(request) {
	const prefix = `/${manifest.app_path}/remote/`;
	const { pathname } = new URL(request.url);
	const hash = pathname.slice(prefix.length);

	if (!pathname.startsWith(prefix) || !Object.hasOwn(manifest.remotes, hash)) {
		return new Response('Not Found', { status: 404 });
	}

	const module = await manifest.remotes[hash]();

	/** @type {Record<string, string>} */
	const exports = {};
	for (const [name, value] of Object.entries(module.default)) {
		const type = value?.__?.type;
		if (type) exports[name] = type;
	}

	return Response.json(exports);
}
