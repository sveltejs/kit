/** @import { Plugin } from 'vite' */
import { escape_for_regexp } from '../../utils/escape.js';
import { create_build_server } from '../../exports/vite/build/vite_server.js';
import { forked } from '../../utils/fork.js';
import { get_address } from '../utils.js';
import { extract_svelte_config, load_vite_config } from '../config/index.js';

export default forked(import.meta.url, generate_fallback);

const prerender_entry = import.meta.resolve('./prerender_entry.js');

/**
 * @param {object} opts Arguments must be serialisable via the structured clone algorithm
 * @param {string} opts.manifest_path
 * @param {string} opts.out
 * @param {string} opts.root
 * @returns {Promise<string>}
 */
async function generate_fallback({ manifest_path, out, root }) {
	const vite_config = await load_vite_config(); // TODO configFile
	const svelte_config = extract_svelte_config(vite_config);

	const prerender_origin = svelte_config.kit.paths.origin || 'http://sveltekit-prerender';

	/** @type {Plugin} */
	const plugin_generate_fallback = {
		name: 'vite-plugin-sveltekit-compile:generate-fallback',
		configureServer(vite) {
			return () => {
				vite.middlewares.use((req, _, next) => {
					req.url = req.url?.replace(
						new RegExp(escape_for_regexp(`^${address}`)),
						prerender_origin
					);
					req.headers.host = new URL(prerender_origin).host;

					next();
				});
			};
		}
	};

	const server = await create_build_server({
		name: 'generate-fallback',
		svelte_config,
		out,
		root,
		manifest_path,
		server_path: prerender_entry,
		vite_plugins: [plugin_generate_fallback]
	});

	await server.listen();

	const address = get_address(server);
	const response = await fetch(new URL('/[fallback]', address));

	await server.close();

	if (response.ok) {
		return await response.text();
	}

	throw new Error(`Could not create a fallback page — failed with status ${response.status}`);
}
