/** @import { ManifestData, RecursiveRequired, ValidatedConfig, ValidatedKitConfig } from 'types' */
/** @import { Manifest, ResolvedConfig } from 'vite' */

import { createReadStream } from 'node:fs';
import { exactRegex } from 'rolldown/filter';
import { createServer } from 'vite';
import { load_config } from '../config/index.js';
import { forked } from '../../utils/fork.js';
import { build_server_nodes } from '../../exports/vite/build/build_server.js';
import { create_app_dir_matcher } from '../../exports/vite/dev/index.js';

export default forked(import.meta.url, analyse);

/**
 * @param {{
 *   vite_config: ResolvedConfig;
 *   hash: boolean;
 *   base: string;
 *   app_dir: string;
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
	base,
	app_dir,
	manifest_path,
	manifest_data,
	server_manifest,
	tracked_features,
	private_env,
	public_env,
	out,
	output_config,
	root
}) {
	const read_pathname = create_app_dir_matcher(base, app_dir, '/read');

	const dev_server = await createServer({
		...vite_config,
		plugins: [
			{
				name: 'vite-plugin-sveltekit-analyse',
				configureServer(vite) {
					return () => {
						vite.middlewares.use((req, res, next) => {
							const base = `${vite.config.server.https ? 'https' : 'http'}://${
								req.headers[':authority'] || req.headers.host
							}`;

							const decoded = decodeURI(new URL(base + req.url).pathname);

							if (decoded.match(read_pathname)) {
								const url = new URL(base + req.url);
								const file = url.searchParams.get('file');

								const readable_stream = createReadStream(`${out}/server/${file}`);

								res.writeHead(200);
								readable_stream.pipe(res);
								return;
							}

							next();
						});
					};
				},
				applyToEnvironment(environment) {
					return environment.config.consumer === 'server';
				},
				resolveId: {
					filter: {
						id: [exactRegex('sveltekit:server-manifest')]
					},
					handler(id) {
						if (id === 'sveltekit:server-manifest') {
							return manifest_path;
						}
					}
				}
			}
		]
	});

	/** @type {ValidatedKitConfig} */
	const config = (await load_config({ cwd: root })).kit;

	// first, build server nodes without the client manifest so we can analyse it
	build_server_nodes(
		out,
		config,
		manifest_data,
		server_manifest,
		null,
		null,
		null,
		output_config,
		root
	);

	const { promise, resolve } = Promise.withResolvers();

	const event = `sveltekit:analyse-response`;
	dev_server.environments.ssr.hot.on(event, resolve);

	await dev_server.environments.ssr.transformRequest(import.meta.resolve('./analyse-entry.js'));

	dev_server.environments.ssr.hot.send(`sveltekit:analyse-request`, {
		private_env,
		public_env,
		hash,
		server_manifest,
		tracked_features
	});
	const result = await promise;

	dev_server.environments.ssr.hot.off(event, resolve);

	return { metadata: result.metadata };
}
