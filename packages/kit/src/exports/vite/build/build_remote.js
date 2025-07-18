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
	if (!exists(out)) return;

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
					${dynamic_exports.map((name) => `const ${name} = prerender(() => {throw new Error('Unexpectedly called prerender function. Did you forget to set { dynamic: true } ?')});`).join('\n')}
					for (const [key, fn] of Object.entries({${Object.keys(remote_module).join(',')}})) {
						if (fn.__?.type === 'form') {
							fn.__.set_action('${remote.slice(0, -3)}/' + key);
							fn.__.name = key;
						} else if (fn.__?.type === 'query' || fn.__?.type === 'prerender' || fn.__?.type === 'cache') {
							fn.__.id = '${remote.slice(0, -3)}/' + key;
							fn.__.name = key;
						} else if (fn.__?.type === 'command') {
							fn.__.name = key;
						}
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
 */
export function build_remotes(out) {
	if (!exists(out)) return

	const remote_dir = path.join(out, 'server', 'remote');

	for (const remote_file_name of fs.readdirSync(remote_dir)) {
		const remote_file_path = path.join(remote_dir, remote_file_name);
		const sibling_file_name = `__sibling__.${remote_file_name}`;
		const sibling_file_path = path.join(remote_dir, sibling_file_name);
		const hashed_id = remote_file_name.slice(0, -3); // remove .js extension
		const file_content = fs.readFileSync(remote_file_path, 'utf-8');

		fs.writeFileSync(sibling_file_path, file_content);
		fs.writeFileSync(
			remote_file_path,
			dedent`
				import * as $$_self_$$ from './${sibling_file_name}';
				${enhance_remotes(hashed_id, remote_file_path)}
				export * from './${sibling_file_name}';
			`
		);
	}
}

/**
 * Generate the code that enhances the remote functions with their hashed ID.
 * @param {string} hashed_id 
 * @param {string} remote_file_path 
 */
export function enhance_remotes(hashed_id, remote_file_path) {
	return dedent`
		for (const key in $$_self_$$) {
			if (key === 'default') {
				throw new Error(
					'Cannot use a default export in a remote file. Please use named exports instead. (in ${posixify(remote_file_path)})'
				);
			}
			const fn = $$_self_$$[key];
			if (fn.__?.type === 'form') {
				fn.__.set_action('${hashed_id}/' + key);
				fn.__.name = key;
			} else if (fn.__?.type === 'query' || fn.__?.type === 'prerender' || fn.__?.type === 'cache') {
				fn.__.id = '${hashed_id}/' + key;
				fn.__.name = key;
			} else if (fn.__?.type === 'command') {
				fn.__.name = key;
			} else {
				throw new Error('Invalid export from remote file ${posixify(remote_file_path)}: ' + key + ' is not a remote function. Can only export remote functions from a .remote file');
			}
		}
	`
}

/**
 * @param {string} out
 */
function exists(out) {
	return fs.existsSync(path.join(out, 'server', 'remote'))
}