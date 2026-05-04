/** @import { ManifestData, ServerMetadata } from 'types' */
/** @import { Manifest } from 'vite' */
import * as devalue from 'devalue';
import { forked } from '../../utils/fork.js';
import { build_server_nodes } from '../../exports/vite/build/build_server.js';
import { create_build_server } from '../../exports/vite/build/vite_server.js';
import { load_config } from '../config/index.js';

export default forked(import.meta.url, analyse);

const analysis_entry = import.meta.resolve('./analysis_entry.js');

/**
 * @param {object} opts Arguments must be serialisable via the structured clone algorithm
 * @param {string} opts.manifest_path
 * @param {ManifestData} opts.manifest_data
 * @param {Manifest} opts.server_manifest
 * @param {Record<string, string[]>} opts.tracked_features
 * @param {string} opts.out
 * @param {string} opts.root
 * @returns {Promise<{ metadata: ServerMetadata }>}
 */
async function analyse({
	manifest_path,
	manifest_data,
	server_manifest,
	tracked_features,
	out,
	root
}) {
	// first, build server nodes without the client manifest so we can analyse it
	build_server_nodes({ out, manifest_data, server_manifest, root });

	const svelte_config = await load_config({ cwd: root });

	const vite = await create_build_server({
		name: 'analyse',
		svelte_config,
		out,
		root,
		manifest_path,
		server_path: analysis_entry
	});

	await vite.listen();

	const address = vite.httpServer?.address();
	const port = typeof address === 'string' ? Number(address.split(':').at(-1)) : address?.port;

	const response = await fetch(new URL(`http://localhost:${port}`), {
		method: 'POST',
		headers: {
			'content-type': 'application/json'
		},
		body: devalue.stringify({
			server_manifest,
			tracked_features,
			manifest_data,
			hash: svelte_config.kit.router.type === 'hash'
		})
	});

	await vite.close();

	return { metadata: devalue.parse(await response.text()) };
}
