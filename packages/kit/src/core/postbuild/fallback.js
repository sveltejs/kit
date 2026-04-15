import { exactRegex } from 'rolldown/filter';
import { forked } from '../../utils/fork.js';
import { createServer, isFetchableDevEnvironment } from 'vite';

export default forked(import.meta.url, generate_fallback);

/**
 * @param {object} opts
 * @param {import('vite').ResolvedConfig} opts.vite_config
 * @param {string} opts.origin
 * @param {string} opts.manifest_path
 */
async function generate_fallback({ vite_config, origin, manifest_path }) {
	const dev_server = await createServer({
		...vite_config,
		command: 'serve',
		define: {
			...vite_config.define,
			__SVELTEKIT_GENERATING_FALLBACK__: 'true'
		},
		plugins: [
			{
				name: 'vite-plugin-sveltekit-generate-fallback',
				applyToEnvironment(environment) {
					return environment.config.consumer === 'server';
				},
				resolveId: {
					filter: {
						id: [exactRegex('sveltekit:server-manifest')]
					},
					handler() {
						return manifest_path;
					}
				}
			}
		]
	});

	await dev_server.listen();

	if (!isFetchableDevEnvironment(dev_server.environments.ssr)) {
		throw new Error('The Vite configured SSR environment must be a FetchableDevEnvironment');
	}

	const response = await dev_server.environments.ssr.dispatchFetch(
		new Request(origin + '/[fallback]')
	);

	if (response.ok) {
		return await response.text();
	}

	throw new Error(`Could not create a fallback page — failed with status ${response.status}`);
}
