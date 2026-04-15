/** @import { ManifestData, RecursiveRequired, ServerMetadata, ValidatedConfig } from 'types' */
/** @import { Manifest, ResolvedConfig } from 'vite' */

import { exactRegex } from 'rolldown/filter';
import { createServer } from 'vite';
import { forked } from '../../utils/fork.js';
import { build_server_nodes } from '../../exports/vite/build/build_server.js';

export default forked(import.meta.url, analyse);

/**
 * @param {{
 *   vite_config: ResolvedConfig;
 *   hash: boolean;
 *   manifest_path: string;
 *   manifest_data: ManifestData;
 *   server_manifest: Manifest;
 *   tracked_features: Record<string, string[]>;
 *   private_env: Record<string, string>;
 *   public_env: Record<string, string>;
 *   out: string;
 *   output_config: RecursiveRequired<ValidatedConfig['kit']['output']>;
 *   root: string;
 * }} opts
 */
async function analyse({
	vite_config,
	hash,
	manifest_path,
	manifest_data,
	server_manifest,
	tracked_features,
	private_env,
	public_env,
	out,
	root
}) {
	const vite = await createServer({
		...vite_config,
		command: 'serve',
		plugins: [
			{
				name: 'vite-plugin-sveltekit-analyse',
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

	// first, build server nodes without the client manifest so we can analyse it
	build_server_nodes({ out, manifest_data, server_manifest, root });

	await vite.listen();

	/** @type {PromiseWithResolvers<ServerMetadata>} */
	const { promise, resolve } = Promise.withResolvers();

	const event = 'sveltekit:analyse-response';
	vite.environments.ssr.hot.on(event, resolve);

	await vite.environments.ssr.transformRequest(import.meta.resolve('./analyse-entry.js'));

	vite.environments.ssr.hot.send('sveltekit:analyse-request', {
		private_env,
		public_env,
		hash,
		server_manifest,
		tracked_features
	});
	const metadata = await promise;

	vite.environments.ssr.hot.off(event, resolve);

	await vite.close();

	return { metadata };
}
