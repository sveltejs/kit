/** @import { ServerMetadata } from 'types' */
/** @import { Rollup } from 'vite' */

import fs from 'node:fs';
import path from 'node:path';
import { Parser } from 'acorn';
import MagicString from 'magic-string';
import { posixify } from '../../../utils/filesystem.js';
import { import_peer } from '../../../utils/import.js';

/**
 * @param {string} out
 * @param {Array<{ hash: string, file: string }>} remotes
 * @param {ServerMetadata} metadata
 * @param {string} cwd
 * @param {Rollup.OutputBundle} server_bundle
 * @param {NonNullable<import('vitest/config').ViteUserConfig['build']>['sourcemap']} sourcemap
 */
export async function treeshake_prerendered_remotes(
	out,
	remotes,
	metadata,
	cwd,
	server_bundle,
	sourcemap
) {
	if (remotes.length === 0) return;

	const vite = /** @type {typeof import('vite')} */ (await import_peer('vite'));

	for (const remote of remotes) {
		const exports_map = metadata.remotes.get(remote.hash);
		if (!exports_map) continue;

		/** @type {string[]} */
		const dynamic = [];
		/** @type {string[]} */
		const prerendered = [];

		for (const [name, value] of exports_map) {
			(value.dynamic ? dynamic : prerendered).push(name);
		}

		if (prerendered.length === 0) continue; // nothing to treeshake

		// remove file extension
		const remote_filename = path.basename(remote.file).split('.').slice(0, -1).join('.');

		const remote_chunk = Object.values(server_bundle).find((chunk) => {
			return chunk.name === remote_filename;
		});

		if (!remote_chunk) continue;

		const chunk_path = posixify(path.relative(cwd, `${out}/server/${remote_chunk.fileName}`));

		const code = fs.readFileSync(chunk_path, 'utf-8');
		const parsed = Parser.parse(code, { sourceType: 'module', ecmaVersion: 'latest' });
		const modified_code = new MagicString(code);

		for (const fn of prerendered) {
			for (const node of parsed.body) {
				const declaration =
					node.type === 'ExportNamedDeclaration'
						? node.declaration
						: node.type === 'VariableDeclaration'
							? node
							: null;

				if (!declaration || declaration.type !== 'VariableDeclaration') continue;

				for (const declarator of declaration.declarations) {
					if (declarator.id.type === 'Identifier' && declarator.id.name === fn) {
						modified_code.overwrite(
							node.start,
							node.end,
							`const ${fn} = prerender('unchecked', () => { throw new Error('Unexpectedly called prerender function. Did you forget to set { dynamic: true } ?') });`
						);
					}
				}
			}
		}

		for (const node of parsed.body) {
			if (node.type === 'ExportDefaultDeclaration') {
				modified_code.remove(node.start, node.end);
			}
		}

		const stubbed = modified_code.toString();
		fs.writeFileSync(chunk_path, stubbed);

		const bundle = /** @type {import('vite').Rollup.RollupOutput} */ (
			await vite.build({
				configFile: false,
				build: {
					write: false,
					ssr: true,
					target: 'esnext',
					sourcemap,
					rollupOptions: {
						// avoid resolving imports
						external: (id) => !id.endsWith(chunk_path),
						input: {
							treeshaken: chunk_path
						}
					}
				}
			})
		);

		const chunk = bundle.output.find(
			(output) => output.type === 'chunk' && output.name === 'treeshaken'
		);
		if (chunk && chunk.type === 'chunk') {
			fs.writeFileSync(chunk_path, chunk.code);

			const chunk_sourcemap = bundle.output.find(
				(output) => output.type === 'asset' && output.fileName === chunk.fileName + '.map'
			);
			if (chunk_sourcemap && chunk_sourcemap.type === 'asset') {
				fs.writeFileSync(chunk_path + '.map', chunk_sourcemap.source);
			}
		}
	}
}
