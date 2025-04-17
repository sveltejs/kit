import fs from 'node:fs';
import { mkdirp } from '../../../utils/filesystem.js';
import { filter_fonts, find_deps, resolve_symlinks } from './utils.js';
import { s } from '../../../utils/misc.js';
import { normalizePath } from 'vite';
import { basename } from 'node:path';

/**
 * @param {string} out
 * @param {import('types').ValidatedKitConfig} kit
 * @param {import('types').ManifestData} manifest_data
 * @param {import('vite').Manifest} server_manifest
 * @param {import('vite').Manifest | null} client_manifest
 * @param {import('vite').Rollup.OutputBundle | null} server_bundle
 * @param {import('vite').Rollup.RollupOutput['output'] | null} client_bundle
 * @param {import('types').RecursiveRequired<import('types').ValidatedConfig['kit']['output']>} output_config
 */
export function build_server_nodes(out, kit, manifest_data, server_manifest, client_manifest, server_bundle, client_bundle, output_config) {
	mkdirp(`${out}/server/nodes`);
	mkdirp(`${out}/server/stylesheets`);

	/** @type {Map<string, string>} */
	const stylesheets_to_inline = new Map();

	if (server_bundle && client_bundle) {
		/** @type {Map<string, string[]>} */
		const client_stylesheets = new Map();
		for (const chunk of client_bundle) {
			if (chunk.type !== 'chunk' || !chunk.viteMetadata?.importedCss.size) {
				continue;
			}
			const css = Array.from(chunk.viteMetadata.importedCss);
			for (const id of chunk.moduleIds) {
				client_stylesheets.set(id, css );
			}
		}

		/** @type {Map<string, string[]>} */
		const server_stylesheets = new Map();
		for (const key in server_bundle) {
			const chunk = server_bundle[key];
			if (chunk.type !== 'chunk' || !chunk.viteMetadata?.importedCss.size) {
				continue;
			}
			const css = Array.from(chunk.viteMetadata.importedCss);
			for (const id of chunk.moduleIds) {
				server_stylesheets.set(id, css );
			}
		}

		// map server stylesheet name to the client stylesheet name
		for (const [id, client_css] of client_stylesheets) {
			const server_css = server_stylesheets.get(id);
			if (!server_css) {
				continue;
			}
			client_css.forEach((file, i) => {
				stylesheets_to_inline.set(file, server_css[i]);
			}) 
		}

		// filter out stylesheets that should not be inlined
		for (const chunk of client_bundle) {
			if (
				chunk.type === 'asset' &&
				chunk.fileName.endsWith('.css') &&
				chunk.source.length < kit.inlineStyleThreshold
			) {
				continue;
			}
			stylesheets_to_inline.delete(chunk.fileName);
		}

		/** @type {Map<string, string>} */
		const server_stylesheet_sources = new Map();
		for (const key in server_bundle) {
			const chunk = server_bundle[key];
			if (chunk.type === 'asset' && chunk.fileName.endsWith('.css')) {
				server_stylesheet_sources.set(chunk.fileName, chunk.source.toString());
			}
		}

		// map server stylesheet source to the client stylesheet name
		for (const [client_file, server_file] of stylesheets_to_inline) {
			const source = server_stylesheet_sources.get(server_file);
			if (!source) {
				throw new Error(`Server stylesheet source not found for client stylesheet ${client_file}`);
			}
			stylesheets_to_inline.set(client_file, source);
		}
	}

	manifest_data.nodes.forEach((node, i) => {
		/** @type {string[]} */
		const imports = [];

		// String representation of
		/** @type {import('types').SSRNode} */
		/** @type {string[]} */
		const exports = [`export const index = ${i};`];

		/** @type {string[]} */
		let imported = [];

		/** @type {string[]} */
		let stylesheets = [];

		/** @type {string[]} */
		let fonts = [];

		if (node.component && client_manifest) {
			exports.push(
				'let component_cache;',
				`export const component = async () => component_cache ??= (await import('../${
					resolve_symlinks(server_manifest, node.component).chunk.file
				}')).default;`
			);
		}

		if (node.universal) {
			imports.push(
				`import * as universal from '../${
					resolve_symlinks(server_manifest, node.universal).chunk.file
				}';`
			);
			exports.push('export { universal };');
			exports.push(`export const universal_id = ${s(node.universal)};`);
		}

		if (node.server) {
			imports.push(
				`import * as server from '../${resolve_symlinks(server_manifest, node.server).chunk.file}';`
			);
			exports.push('export { server };');
			exports.push(`export const server_id = ${s(node.server)};`);
		}

		if (client_manifest && (node.universal || node.component) && output_config.bundleStrategy === 'split') {
			const entry_path = `${normalizePath(kit.outDir)}/generated/client-optimized/nodes/${i}.js`;
			const entry = find_deps(client_manifest, entry_path, true);

			// eagerly load client stylesheets and fonts imported by the SSR-ed page to avoid FOUC.
			// However, if it is not used during SSR (not present in the server manifest),
			// then it can be lazily loaded in the browser.
	
			/** @type {import('types').AssetDependencies | undefined} */
			let component;
			if (node.component) {
				component = find_deps(server_manifest, node.component, true);
			}

			/** @type {import('types').AssetDependencies | undefined} */
			let universal;
			if (node.universal) {
				universal = find_deps(server_manifest, node.universal, true);
			}

			/** @type {Set<string>} */
			const eager_css = new Set();
			/** @type {Set<string>} */
			const eager_assets = new Set();

			entry.stylesheet_map.forEach((value, filepath) => {
				// pages and layouts are renamed to node indexes when optimised for the client
				// so we use the original filename instead to check against the server manifest
				if (filepath === entry_path) {
					filepath = node.component ?? filepath;
				}

				if (component?.stylesheet_map.has(filepath) || universal?.stylesheet_map.has(filepath)) {
					value.css.forEach(file => eager_css.add(file));
					value.assets.forEach(file => eager_assets.add(file));
				}
			});

			imported = entry.imports;
			stylesheets = Array.from(eager_css);
			fonts = filter_fonts(Array.from(eager_assets));
		}

		exports.push(
			`export const imports = ${s(imported)};`,
			`export const stylesheets = ${s(stylesheets)};`,
			`export const fonts = ${s(fonts)};`
		);

		/** @type {string[]} */
		const inline_styles = [];

		stylesheets.forEach((file) => {
			if (stylesheets_to_inline.has(file)) {
				const [filename] = basename(file).split('.');
				const dest = `${out}/server/stylesheets/${filename}.js`;
				const source = stylesheets_to_inline.get(file);
				if (!source) {
					throw new Error(`Server stylesheet source not found for client stylesheet ${file}`);
				}
				fs.writeFileSync(dest, `// ${filename}\nexport default ${s(source)};`);

				const name = `stylesheet_${filename}`;
				imports.push(`import ${name} from '../stylesheets/${filename}.js';`);
				inline_styles.push(`\t${s(file)}: ${name}`);
			}
		});

		if (inline_styles.length > 0) {
			exports.push(`export const inline_styles = () => ({\n${inline_styles.join(',\n')}\n});`);
		}

		fs.writeFileSync(
			`${out}/server/nodes/${i}.js`,
			`${imports.join('\n')}\n\n${exports.join('\n')}\n`
		);
	});
}
