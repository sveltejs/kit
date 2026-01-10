import fs from 'node:fs';
import { mkdirp } from '../../../utils/filesystem.js';
import { assets_base, filter_fonts, find_deps, resolve_symlinks } from './utils.js';
import { s } from '../../../utils/misc.js';
import { normalizePath } from 'vite';
import { basename, dirname, join, posix } from 'node:path';
import { create_node_analyser } from '../static_analysis/index.js';

/**
 * @param {string} out
 * @param {import('types').ValidatedKitConfig} kit
 * @param {import('types').ManifestData} manifest_data
 * @param {import('vite').Manifest} server_manifest
 * @param {import('vite').Manifest | null} client_manifest
 * @param {import('vite').Rollup.RollupOutput['output'] | null} client_chunks
 * @param {import('types').RecursiveRequired<import('types').ValidatedConfig['kit']['output']>} output_config
 * @param {Map<string, { page_options: Record<string, any> | null, children: string[] }>} static_exports
 */
export async function build_server_nodes(
	out,
	kit,
	manifest_data,
	server_manifest,
	client_manifest,
	client_chunks,
	output_config,
	static_exports
) {
	mkdirp(`${out}/server/nodes`);
	mkdirp(`${out}/server/stylesheets`);

	/** @type {Map<string, string>} */
	const stylesheets_to_inline = new Map();

	if (client_chunks && kit.inlineStyleThreshold > 0) {
		const stylesheet_content = get_stylesheet_content(client_chunks);
		const base = assets_base(kit);

		// Use client CSS content directly, rewriting relative URLs to absolute paths.
		// We use client CSS instead of server CSS because server builds may tree-shake
		// CSS for conditionally rendered components (e.g., inside {#if} blocks),
		// resulting in incomplete styles when inlined.
		for (const [fileName, content] of stylesheet_content) {
			if (content.length < kit.inlineStyleThreshold) {
				// Rewrite relative url() references to use the assets base path
				const css_dir = dirname(fileName);
				const rewritten = content.replace(
					/url\(\s*['"]?(\.[^'")]+)['"]?\s*\)/g,
					(match, relative_path) => {
						const resolved = posix.normalize(posix.join(css_dir, relative_path));
						return `url(${base}${resolved})`;
					}
				);
				stylesheets_to_inline.set(fileName, rewritten);
			}
		}
	}

	const { get_page_options } = create_node_analyser({
		resolve: (server_node) => {
			// Windows needs the file:// protocol for absolute path dynamic imports
			return import(
				`file://${join(out, 'server', resolve_symlinks(server_manifest, server_node).chunk.file)}`
			);
		},
		static_exports
	});

	for (let i = 0; i < manifest_data.nodes.length; i++) {
		const node = manifest_data.nodes[i];

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
			const page_options = await get_page_options(node);
			if (!!page_options && page_options.ssr === false) {
				exports.push(`export const universal = ${s(page_options, null, 2)};`);
			} else {
				imports.push(
					`import * as universal from '../${resolve_symlinks(server_manifest, node.universal).chunk.file}';`
				);
				// TODO: when building for analysis, explain why the file was loaded on the server if we fail to load it
				exports.push('export { universal };');
			}
			exports.push(`export const universal_id = ${s(node.universal)};`);
		}

		if (node.server) {
			imports.push(
				`import * as server from '../${resolve_symlinks(server_manifest, node.server).chunk.file}';`
			);
			exports.push('export { server };');
			exports.push(`export const server_id = ${s(node.server)};`);
		}

		if (
			client_manifest &&
			(node.universal || node.component) &&
			output_config.bundleStrategy === 'split'
		) {
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
					value.css.forEach((file) => eager_css.add(file));
					value.assets.forEach((file) => eager_assets.add(file));
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

		stylesheets.forEach((file, i) => {
			if (stylesheets_to_inline.has(file)) {
				const filename = basename(file);
				const dest = `${out}/server/stylesheets/${filename}.js`;
				const source = stylesheets_to_inline.get(file);
				if (!source) {
					throw new Error(`Server stylesheet source not found for client stylesheet ${file}`);
				}
				fs.writeFileSync(dest, `// ${filename}\nexport default ${s(source)};`);

				const name = `stylesheet_${i}`;
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
	}
}

/**
 * Extracts CSS content from client build chunks.
 * @param {(import('vite').Rollup.OutputAsset | import('vite').Rollup.OutputChunk)[]} chunks
 * @returns {Map<string, string>} A map of stylesheet filenames to their content
 */
function get_stylesheet_content(chunks) {
	/** @type {Map<string, string>} */
	const stylesheet_content = new Map();

	for (const chunk of chunks) {
		if (chunk.type === 'asset' && chunk.fileName.endsWith('.css')) {
			stylesheet_content.set(chunk.fileName, chunk.source.toString());
		}
	}

	return stylesheet_content;
}
