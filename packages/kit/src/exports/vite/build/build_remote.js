/** @import { ManifestData, ServerMetadata } from 'types' */
import fs from 'node:fs';
import path from 'node:path';
import { posixify } from '../../../utils/filesystem.js';
import { dedent } from '../../../core/sync/utils.js';
import { import_peer } from '../../../utils/import.js';

/**
 * Moves the remote files to a sibling file and rewrites the original remote file to import from that sibling file,
 * enhancing the remote functions with their hashed ID.
 * This is not done through a self-import like during DEV because we want to treeshake prerendered remote functions
 * later, which wouldn't work if we do a self-import and iterate over all exports (since we're reading them then).
 * @param {string} out
 * @param {ManifestData} manifest_data
 */
export function build_remotes(out, manifest_data) {
	const dir = `${out}/server/remote`;

	for (const remote of manifest_data.remotes) {
		const entry = `${dir}/${remote.hash}.js`;
		const tmp = `${remote.hash}.tmp.js`;

		fs.renameSync(entry, `${dir}/${tmp}`);
		fs.writeFileSync(
			entry,
			dedent`
				import * as $$_self_$$ from './${tmp}';

				for (const [name, fn] of Object.entries($$_self_$$)) {
					fn.__.id = '${remote.hash}/' + name;
					fn.__.name = name;
				}

				export * from './${tmp}';
			`
		);
	}
}


/**
 * For each remote module, checks if there are treeshakeable prerendered remote functions,
 * then accomplishes the treeshaking by rewriting the remote files to only include the non-prerendered imports,
 * replacing the prerendered remote functions with a dummy function that should never be called,
 * and doing a Vite build. This will not treeshake perfectly yet as everything except the remote files are treated as external,
 * so it will not go into those files to check what can be treeshaken inside them.
 * @param {string} out
 * @param {ManifestData} manifest_data
 * @param {ServerMetadata} metadata
 */
export async function treeshake_prerendered_remotes(out, manifest_data, metadata) {
	if (manifest_data.remotes.length === 0) {
		return;
	}

	const dir = posixify(`${out}/server/remote`);

	const vite = /** @type {typeof import('vite')} */ (await import_peer('vite'));
	const remote_entry = posixify(`${out}/server/remote-entry.js`);

	const prefix = 'optimized/';

	const input = {
		// include this file in the bundle, so that Rollup understands
		// that functions like `prerender` are side-effect free
		[path.basename(remote_entry.slice(0, -3))]: remote_entry
	};

	for (const remote of manifest_data.remotes) {
		const exports = metadata.remotes.get(remote.hash);
		if (!exports) throw new Error('An impossible situation occurred');

		/** @type {string[]} */
		const dynamic = [];

		/** @type {string[]} */
		const prerendered = [];

		for (const [name, value] of exports) {
			(value.dynamic ? dynamic : prerendered).push(name);
		}

		const remote_file = posixify(`${dir}/${remote.hash}.js`);

		fs.writeFileSync(
			remote_file,
			dedent`
				import { ${dynamic.join(', ')} } from './${remote.hash}.tmp.js';
				import { prerender } from '../${path.basename(remote_entry)}';

				${prerendered.map((name) => `export const ${name} = prerender('unchecked', () => { throw new Error('Unexpectedly called prerender function. Did you forget to set { dynamic: true } ?') });`).join('\n')}

				for (const [name, fn] of Object.entries({ ${Array.from(exports.keys()).join(', ')} })) {
					fn.__.id = '${remote.hash}/' + name;
					fn.__.name = name;
				}

				export { ${dynamic.join(', ')} };
			`
		);

		input[prefix + remote.hash] = remote_file;
	}

	const bundle = /** @type {import('vite').Rollup.RollupOutput} */ (await vite.build({
		configFile: false,
		build: {
			write: false,
			ssr: true,
			rollupOptions: {
				external: (id) => {
					if (id[0] === '.') return;
					return !id.startsWith(dir);
				},
				input
			}
		}
	}));

	for (const chunk of bundle.output) {
		if (chunk.type === 'chunk' && chunk.name.startsWith(prefix)) {
			fs.writeFileSync(`${dir}/${chunk.fileName.slice(prefix.length)}`, chunk.code);
		}
	}

	for (const remote of manifest_data.remotes) {
		fs.unlinkSync(`${dir}/${remote.hash}.tmp.js`);
	}
}
