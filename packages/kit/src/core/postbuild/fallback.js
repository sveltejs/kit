/** @import { ResolvedConfig } from 'vite' */
import { exactRegex } from 'rolldown/filter';
import { createServer, isFetchableDevEnvironment } from 'vite';

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

					if (config.define) {
						config.define.__SVELTEKIT_GENERATING_FALLBACK__ = 'true';
						config.define.__SVELTEKIT_BUILDING__ = 'true';
					}
				},
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

	await vite.listen();

	if (!isFetchableDevEnvironment(vite.environments.ssr)) {
		throw new Error('The Vite configured SSR environment must be a FetchableDevEnvironment');
	}

	const response = await vite.environments.ssr.dispatchFetch(new Request(origin + '/[fallback]'));

	await vite.close();

	if (response.ok) {
		return await response.text();
	}

	throw new Error(`Could not create a fallback page — failed with status ${response.status}`);
}
