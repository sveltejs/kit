/** @import { SSRManifest } from '@sveltejs/kit' */
/** @import { InternalServer, RemotePrerenderInternals } from 'types' */
/** @import { SerialisedResponse } from '../../exports/vite/types.js' */
import { get_hooks, set_building, set_prerendering } from '__SERVER__/internal.js';
import { get } from '__sveltekit/manifest-data';
import { stringify_remote_arg } from '../../runtime/shared.js';
import { Server as KitServer } from '__SERVER__/index.js';

const app_path = `${__SVELTEKIT_PATHS_BASE__}/${__SVELTEKIT_APP_DIR__}`;

set_building();
set_prerendering();

export class Server extends KitServer {
	#manifest;

	/** @param {SSRManifest} manifest */
	constructor(manifest) {
		super(manifest);

		this.#manifest = manifest;

		import.meta.hot?.on('sveltekit:prerender-assets-update', (data) => {
			manifest.assets.add(data);
		});
	}

	/** @type {InternalServer['init']} */
	async init(options) {
		options.read = async (file) => {
			const response = await get(`/read?${new URLSearchParams({ file })}`);
			if (!response.ok) {
				throw new Error(
					`read(...) failed: could not fetch ${file} (${response.status} ${response.statusText})`
				);
			}
			return response.body;
		};

		return super.init(options);
	}

	/** @type {InternalServer['respond']} */
	async respond(request, options) {
		options.getClientAddress = () => {
			throw new Error('Cannot read clientAddress during prerendering');
		};

		options.prerendering = {
			fallback: request.url.endsWith('/[fallback]'),
			dependencies: new Map(),
			remote_responses: import.meta.hot?.data.remote_responses
		};

		options.read = async (file) => {
			const response = await get(`/prerender-read?${new URLSearchParams({ file })}`);
			return Buffer.from(await response.arrayBuffer());
		};

		const url = new URL(request.url);

		if (url.pathname === `${app_path}/prerender-functions`) {
			const names = url.searchParams.getAll('name');
			const pathnames = await get_prerender_function_paths(this.#manifest, names);
			return Response.json(pathnames);
		}

		const response = await super.respond(request, options);

		/** @type {Map<string, { response: SerialisedResponse; body: null | string | Uint8Array }>} */
		const dependencies = new Map();
		for (const [key, value] of options.prerendering.dependencies) {
			dependencies.set(key, {
				response: {
					status: value.response.status,
					statusText: value.response.statusText,
					headers: Object.fromEntries(value.response.headers),
					body: await value.response.arrayBuffer()
				},
				body: value.body
			});
		}
		// TODO: figure out why import.meta.hot.send doesn't trigger .hot.on from vite side
		import.meta.hot?.send('sveltekit:prerender-dependencies', Object.fromEntries(dependencies));

		return response;
	}
}

const remote_prefix = `${app_path}/remote/`;

/**
 * @param {SSRManifest} manifest
 * @param {string[]} names
 * @returns {Promise<string[]>}
 */
async function get_prerender_function_paths(manifest, names) {
	/** @type {RemotePrerenderInternals[]} */
	const prerender_functions = [];

	for (const name of names) {
		const module = await manifest._.remotes[name]();

		for (const fn of Object.values(module.default)) {
			if (fn?.__?.type === 'prerender') {
				prerender_functions.push(fn.__);
			}
		}
	}

	/** @type {string[]} */
	const pathnames = [];

	const transport = (await get_hooks()).transport ?? {};
	for (const internals of prerender_functions) {
		if (internals.has_arg) {
			for (const arg of (await internals.inputs?.()) ?? []) {
				pathnames.push(remote_prefix + internals.id + '/' + stringify_remote_arg(arg, transport));
			}
		} else {
			pathnames.push(remote_prefix + internals.id);
		}
	}
	return pathnames;
}

if (import.meta.hot) {
	import.meta.hot.data.remote_responses ??= new Map();
}
