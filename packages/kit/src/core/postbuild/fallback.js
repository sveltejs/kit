/** @import { ResolvedConfig } from 'vite' */
import { prefixRegex } from 'rolldown/filter';
import { createServer } from 'vite';
import { escape_for_regexp } from '../../utils/escape.js';

const prerender_entry = import.meta.resolve('./prerender_entry.js');

/**
 * @param {object} opts Arguments must be serialisable via the structured clone algorithm
 * @param {ResolvedConfig} opts.vite_config
 * @param {string} opts.origin
 * @param {string} opts.manifest_path
 * @param {string} opts.out
 */
export default async function generate_fallback({ vite_config, origin, manifest_path, out }) {
	const vite = await createServer({
		configFile: vite_config.configFile,
		command: 'serve',
		plugins: [
			{
				name: 'vite-plugin-sveltekit-compile:generate-fallback',
				config(config) {
					if (Array.isArray(config.resolve?.alias)) {
						for (const alias of config.resolve.alias) {
							if (alias.find !== '__SERVER__') continue;

							alias.replacement = `${out}/server`;
							break;
						}
					}
				},
				configureServer(vite) {
					return () => {
						vite.middlewares.use((req, _, next) => {
							console.log({ req_url: req.url, req_original_url: req.originalUrl });

							req.url = req.url?.replace(
								new RegExp(escape_for_regexp(`^http://localhost:${port}`)),
								origin
							);

							next();
						});
					};
				},
				applyToEnvironment(environment) {
					return environment.config.consumer === 'server';
				},
				resolveId: {
					order: 'pre',
					filter: {
						id: [prefixRegex('sveltekit:')]
					},
					handler(id) {
						if (id === 'sveltekit:server-manifest') {
							return manifest_path;
						}

						// substitute the Server class with our prerender code instead
						if (id === 'sveltekit:server') {
							return prerender_entry;
						}
					}
				}
			}
		]
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
