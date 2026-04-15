import { manifest } from 'sveltekit:server-manifest';
import { get } from '__sveltekit/manifest-data';
import { set_manifest, set_read_implementation } from '__sveltekit/server';
import { get_hooks } from '__SERVER__/internal.js';
import { set_private_env, set_public_env } from '../../runtime/shared-server.js';
import { create_synchronous_read } from '../../runtime/server/utils.js';
import { stringify_remote_arg } from '../../runtime/shared.js';

if (import.meta.hot) {
	/** @type {Array<import('types').RemotePrerenderInternals>} */
	const prerender_functions = (import.meta.hot.data.prerender_functions = []);

	import.meta.hot.on(
		'sveltekit:analyse-prerender-functions-request',
		async ({ private_env, public_env }) => {
			// the user's remote function modules may reference environment variables,
			// `read` or the `manifest` at the top-level so we need to set them before
			// evaluating those modules to avoid potential runtime errors
			set_private_env(private_env);
			set_public_env(public_env);
			set_manifest(manifest);
			set_read_implementation(
				create_synchronous_read(async (file) => {
					const response = await get(`/read?${new URLSearchParams({ file })}`);

					if (!response.ok) {
						throw new Error(
							`read(...) failed: could not fetch ${file} (${response.status} ${response.statusText})`
						);
					}

					return response.body;
				})
			);

			for (const loader of Object.values(manifest._.remotes)) {
				const module = await loader();

				for (const fn of Object.values(module.default)) {
					if (fn?.__?.type === 'prerender') {
						prerender_functions.push(fn.__);
					}
				}
			}

			import.meta.hot?.send(
				'sveltekit:analyse-prerender-functions-response',
				!!prerender_functions.length
			);
		}
	);

	import.meta.hot.on('sveltekit:prerender-assets-update', manifest.assets.add);

	const remote_prefix = `${__SVELTEKIT_PATHS_BASE__}/${__SVELTEKIT_APP_DIR__}/remote/`;

	import.meta.hot.on('sveltekit:prerender-functions-request', async () => {
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

		import.meta.hot?.send('sveltekit:prerender-functions-response', pathnames);
	});
}
