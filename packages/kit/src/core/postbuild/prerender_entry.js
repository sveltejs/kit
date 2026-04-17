/** @import { SSRManifest } from '@sveltejs/kit' */
/** @import { RemotePrerenderInternals } from 'types' */
import { get_hooks } from '__SERVER__/internal.js';
import { stringify_remote_arg } from '../../runtime/shared.js';
import { StubServer } from './server.js';

export class Server extends StubServer {
	/**  @param {SSRManifest} manifest */
	constructor(manifest) {
		super(manifest);
		import.meta.hot?.on('sveltekit:prerender-assets-update', (data) => {
			this.manifest.assets.add(data);
		});
	}

	/** @type {StubServer['respond']} */
	async respond(request, _) {
		if (request.url.endsWith('/analyse-prerender-functions')) {
			const should_prerender = await analyse_prerender_functions(this.manifest);

			// TODO: after analysis, we should switch back to the normal server implementation

			return new Response(null, { status: should_prerender ? 204 : 403 });
		}

		const prerendered = await prerender_remote_functions(
			import.meta.hot?.data.prerender_functions ?? prerender_functions
		);

		return Response.json(JSON.stringify(prerendered));
	}
}

/** @type {RemotePrerenderInternals[]} */
let prerender_functions = [];

/**
 * @param {import('@sveltejs/kit').SSRManifest} manifest
 * @return {Promise<boolean>}
 */
async function analyse_prerender_functions(manifest) {
	prerender_functions = [];

	if (import.meta.hot) {
		import.meta.hot.data.prerender_functions = prerender_functions;
	}

	for (const loader of Object.values(manifest._.remotes)) {
		const module = await loader();

		for (const fn of Object.values(module.default)) {
			if (fn?.__?.type === 'prerender') {
				prerender_functions.push(fn.__);
			}
		}
	}

	return !!prerender_functions.length;
}

const remote_prefix = `${__SVELTEKIT_PATHS_BASE__}/${__SVELTEKIT_APP_DIR__}/remote/`;

/**
 * @param {RemotePrerenderInternals[]} prerender_functions
 * @returns {Promise<string[]>}
 */
async function prerender_remote_functions(prerender_functions) {
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
