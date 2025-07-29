import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
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
 */
export async function treeshake_prerendered_remotes(out) {
	const remote_dir = path.join(out, 'server', 'remote');

	if (!fs.existsSync(remote_dir)) return;

	const vite = /** @type {typeof import('vite')} */ (await import_peer('vite'));
	const remote_entry = posixify(`${out}/server/remote-entry.js`);

	for (const remote of fs.readdirSync(`${out}/server/remote`)) {
		if (remote.startsWith('__sibling__.')) continue; // skip sibling files
		const remote_file = posixify(path.join(`${out}/server/remote`, remote));
		const remote_module = await import(pathToFileURL(remote_file).href);
		const prerendered_exports = Object.entries(remote_module)
			.filter(([, _export]) => !(_export?.__?.type === 'prerender' && !_export.__.dynamic))
			.map(([name]) => name);
		const dynamic_exports = Object.keys(remote_module).filter(
			(name) => !prerendered_exports.includes(name)
		);

		if (dynamic_exports.length > 0) {
			const temp_out_dir = path.join(out, 'server', 'remote-temp');
			const tmp_file = posixify(path.join(out, 'server/remote/tmp.js'));
			mkdirp(temp_out_dir);
			fs.writeFileSync(
				remote_file,
				dedent`
					import {${prerendered_exports.join(',')}} from './__sibling__.${remote}';
					import { prerender } from '../${path.basename(remote_entry)}';
					${dynamic_exports.map((name) => `const ${name} = prerender('unchecked', () => {throw new Error('Unexpectedly called prerender function. Did you forget to set { dynamic: true } ?')});`).join('\n')}
					for (const [name, fn] of Object.entries({${Object.keys(remote_module).join(',')}})) {
						fn.__.id = '${remote.slice(0, -3)}/' + name;
						fn.__.name = name;
					}
					export {${Object.keys(remote_module).join(',')}};
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
								!id.endsWith(`/__sibling__.${remote}`) &&
								id !== remote_file
							);
						},
						input: {
							[`remote/${remote.slice(0, -3)}`]: remote_file,
							[path.basename(remote_entry.slice(0, -3))]: remote_entry
						}
					}
				}
			});

			fs.copyFileSync(path.join(temp_out_dir, 'remote', remote), remote_file);
			rimraf(temp_out_dir);
			rimraf(tmp_file);
			rimraf(path.join(out, 'server', 'remote', `__sibling__.${remote}`));
		}
	}
}

/**
 * Moves the remote files to a sibling file and rewrites the original remote file to import from that sibling file,
 * enhancing the remote functions with their hashed ID.
 * This is not done through a self-import like during DEV because we want to treeshake prerendered remote functions
 * later, which wouldn't work if we do a self-import and iterate over all exports (since we're reading them then).
 * @param {string} out
 * @param {import('types').ManifestData} manifest_data
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
