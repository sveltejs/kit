/** @import { ManifestData, ServerMetadata } from 'types' */
import fs from 'node:fs';
import path from 'node:path';
import { mkdirp, posixify, rimraf } from '../../../utils/filesystem.js';
import { dedent } from '../../../core/sync/utils.js';
import { import_peer } from '../../../utils/import.js';

/**
 * Loads the remote modules, checks which of those have prerendered remote functions that should be treeshaken,
 * then accomplishes the treeshaking by rewriting the remote files to only include the non-prerendered imports,
 * replacing the prerendered remote functions with a dummy function that should never be called,
 * and do a Vite build. This will not treeshake perfectly yet as everything except the remote files are treated as external,
 * so it will not go into those files to check what can be treeshaken inside them.
 * @param {string} out
 * @param {ManifestData} manifest_data
 * @param {ServerMetadata} metadata
 */
export async function treeshake_prerendered_remotes(out, manifest_data, metadata) {
	const remote_dir = path.join(out, 'server', 'remote');

	if (!fs.existsSync(remote_dir)) return;

	const vite = /** @type {typeof import('vite')} */ (await import_peer('vite'));
	const remote_entry = posixify(`${out}/server/remote-entry.js`);

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

		const remote_file = posixify(path.join(`${out}/server/remote`, remote.hash + '.js'));

		if (prerendered.length > 0) {
			const temp_out_dir = path.join(out, 'server', 'remote-temp');
			const tmp_file = posixify(path.join(out, 'server/remote/tmp.js'));
			mkdirp(temp_out_dir);

			fs.writeFileSync(
				remote_file,
				dedent`
					import { ${dynamic.join(', ')} } from './__sibling__.${remote.hash}.js';
					import { prerender } from '../${path.basename(remote_entry)}';

					${prerendered.map((name) => `export const ${name} = prerender('unchecked', () => { throw new Error('Unexpectedly called prerender function. Did you forget to set { dynamic: true } ?') });`).join('\n')}

					for (const [name, fn] of Object.entries({ ${Array.from(exports.keys()).join(', ')} })) {
						fn.__.id = '${remote.hash}/' + name;
						fn.__.name = name;
					}

					export { ${dynamic.join(', ')} };
				`
			);

			await vite.build({
				configFile: false,
				build: {
					ssr: true,
					outDir: temp_out_dir,
					rollupOptions: {
						external: (id) => {
							return (
								id !== remote_entry &&
								id !== `../${path.basename(remote_entry)}` &&
								!id.endsWith(`/__sibling__.${remote.hash}.js`) &&
								id !== remote_file
							);
						},
						input: {
							[`remote/${remote.hash}`]: remote_file,
							[path.basename(remote_entry.slice(0, -3))]: remote_entry
						}
					}
				}
			});

			fs.copyFileSync(path.join(temp_out_dir, 'remote', remote.hash + '.js'), remote_file);
			rimraf(temp_out_dir);
			rimraf(tmp_file);
			rimraf(path.join(out, 'server', 'remote', `__sibling__.${remote.hash}.js`));
		}
	}
}

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
		const sibling_file_name = `__sibling__.${remote.hash}.js`;

		fs.renameSync(entry, `${dir}/${sibling_file_name}`);
		fs.writeFileSync(
			entry,
			dedent`
				import * as $$_self_$$ from './${sibling_file_name}';

				for (const [name, fn] of Object.entries($$_self_$$)) {
					fn.__.id = '${remote.hash}/' + name;
					fn.__.name = name;
				}

				export * from './${sibling_file_name}';
			`
		);
	}
}
