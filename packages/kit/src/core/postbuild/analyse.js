/** @import { RemoteChunk } from 'types' */
/** @import { ManifestData, ServerMetadata } from 'types' */
/** @import { Manifest } from 'vite' */
import * as devalue from 'devalue';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { extract_svelte_config, load_vite_config } from '../config/index.js';
import { forked } from '../../utils/fork.js';
import { createReadableStream } from '@sveltejs/kit/node';
import { build_server_nodes } from '../../exports/vite/build/build_server.js';
import { create_build_server } from '../../exports/vite/build/vite_server.js';
import { get_port } from '../utils.js';

export default forked(import.meta.url, analyse);

const analysis_entry = import.meta.resolve('./analysis_entry.js');

/**
 * @param {object} opts Arguments must be serialisable via the structured clone algorithm
 * @param {string} opts.manifest_path
 * @param {ManifestData} opts.manifest_data
 * @param {Manifest} opts.server_manifest
 * @param {Record<string, string[]>} opts.tracked_features
 * @param {Record<string, string>} opts.env
 * @param {string} opts.out
 * @param {RemoteChunk[]} opts.remotes
 * @param {string} opts.root
 * @param {string | undefined} opts.vite_config_file
 * @returns {Promise<{ metadata: ServerMetadata }>}
 */
async function analyse({
	manifest_path,
	manifest_data,
	server_manifest,
	tracked_features,
	env,
	out,
	root,
	vite_config_file
}) {
	/** @type {import('@sveltejs/kit').SSRManifest} */
	const manifest = (await import(pathToFileURL(manifest_path).href)).manifest;

	const vite_config = await load_vite_config(vite_config_file);

	const config = extract_svelte_config(vite_config);

	const server_root = join(config.outDir, 'output');

	/** @type {import('types').ServerInternalModule} */
	const internal = await import(pathToFileURL(`${server_root}/server/internal.js`).href);

	// configure `import { building } from '$app/env'` —
	// essential we do this before analysing the code
	internal.set_building();

	// set env, `read`, and `manifest`, in case they're used in initialisation
	internal.set_env(env);
	internal.set_manifest(manifest);
	internal.set_read_implementation((file) => createReadableStream(`${server_root}/server/${file}`));

	// first, build server nodes without the client manifest so we can analyse it
	build_server_nodes(out, config.kit, manifest_data, server_manifest, null, null, null, root);

	const server = await create_build_server({
		name: 'analyse',
		svelte_config: config,
		out,
		root,
		manifest_path,
		server_path: analysis_entry
	});

	await server.listen();

	const port = get_port(server);
	const response = await fetch(new URL(`http://localhost:${port}`), {
		method: 'POST',
		headers: {
			'content-type': 'application/json'
		},
		body: devalue.stringify({
			server_manifest,
			tracked_features,
			manifest_data,
			hash: config.kit.router.type === 'hash'
		})
	});

	await server.close();

	return { metadata: devalue.parse(await response.text()) };
}
