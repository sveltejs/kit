/** @import { ManifestData, ServerMetadata } from 'types' */
/** @import { Manifest, ResolvedConfig } from 'vite' */
import * as devalue from 'devalue';
import { prefixRegex } from 'rolldown/filter';
import { createServer } from 'vite';
import { build_server_nodes } from '../../exports/vite/build/build_server.js';

const analyse_entry = import.meta.resolve('./analyse_entry.js');

/**
 * @param {object} opts Arguments must be serialisable via the structured clone algorithm
 * @param {ResolvedConfig} opts.vite_config
 * @param {string} opts.manifest_path
 * @param {ManifestData} opts.manifest_data
 * @param {Manifest} opts.server_manifest
 * @param {Record<string, string[]>} opts.tracked_features
 * @param {string} opts.out
 * @param {string} opts.root
 * @returns {Promise<{ metadata: ServerMetadata }>}
 */
export default async function analyse({
	vite_config,
	manifest_path,
	manifest_data,
	server_manifest,
	tracked_features,
	out,
	root
}) {
	// first, build server nodes without the client manifest so we can analyse it
	build_server_nodes({ out, manifest_data, server_manifest, root });

	const vite = await createServer({
		configFile: vite_config.configFile,
		command: 'serve',
		plugins: [
			{
				name: 'vite-plugin-sveltekit-compile:analyse',
				config(config) {
					if (Array.isArray(config.resolve?.alias)) {
						for (const alias of config.resolve.alias) {
							if (alias.find !== '__SERVER__') continue;

							alias.replacement = `${out}/server`;
							break;
						}
					}
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

						// substitute the Server class with our analysis code instead
						if (id === 'sveltekit:server') {
							return analyse_entry;
						}
					}
				}
			}
		]
	});

	if (!vite.httpServer?.listening) {
		await vite.listen();
	}

	const address = vite.httpServer?.address();
	const port = typeof address === 'string' ? Number(address.split(':').at(-1)) : address?.port;

	const response = await fetch(new URL(`http://localhost:${port}`), {
		method: 'POST',
		headers: {
			'content-type': 'application/json'
		},
		body: JSON.stringify({
			server_manifest,
			tracked_features
		})
	});

	await vite.close();

	return { metadata: devalue.parse(await response.text()) };
}
