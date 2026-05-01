/** @import { PluginOption } from 'vite' */
import { escape_for_regexp } from '../../utils/escape.js';
import { create_build_server } from '../../exports/vite/build/vite_server.js';
import { load_config } from '../config/index.js';
import { forked } from '../../utils/fork.js';

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
	const svelte_config = await load_config({ cwd: root });

	/** @type {PluginOption} */
	const plugin_generate_fallback = {
		name: 'vite-plugin-sveltekit-compile:generate-fallback',
		configureServer(vite) {
			return () => {
				vite.middlewares.use((req, _, next) => {
					req.url = req.url?.replace(
						new RegExp(escape_for_regexp(`^http://localhost:${port}`)),
						svelte_config.kit.prerender.origin
					);
					req.headers.host = new URL(svelte_config.kit.prerender.origin).host;

					next();
				});
			};
		}
	};

	const vite = await create_build_server({
		name: 'generate-fallback',
		svelte_config,
		out,
		manifest_path,
		server_path: prerender_entry,
		vite_plugins: [plugin_generate_fallback]
	});

	await vite.listen();

	const address = vite.httpServer?.address();
	const port = typeof address === 'string' ? Number(address.split(':').at(-1)) : address?.port;
	const response = await fetch(`http://localhost:${port}/[fallback]`);

	await vite.close();

	if (response.ok) {
		return await response.text();
	}

	throw new Error(`Could not create a fallback page — failed with status ${response.status}`);
}
