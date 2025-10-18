import fs from 'node:fs';
import { mkdirp } from '../../../utils/filesystem.js';
import { filter_fonts, find_deps, resolve_symlinks } from './utils.js';
import { s } from '../../../utils/misc.js';
import { normalizePath } from 'vite';
import { basename, join } from 'node:path';
import { create_node_analyser } from '../static_analysis/index.js';

/**
 * Calculate similarity between two CSS content strings
 * @param {string} content1
 * @param {string} content2
 * @returns {number} Similarity score between 0 and 1
 */
function calculateCSSContentSimilarity(content1, content2) {
	if (content1 === content2) return 1;

	// Normalize CSS content for comparison
	const normalize = (/** @type {string} */ css) => css.replace(/\s+/g, ' ').replace(/;\s*}/g, '}').trim();
	const norm1 = normalize(content1);
	const norm2 = normalize(content2);

	if (norm1 === norm2) return 1;

	// Simple length-based similarity
	const lengthDiff = Math.abs(norm1.length - norm2.length);
	const maxLength = Math.max(norm1.length, norm2.length);
	return maxLength > 0 ? 1 - (lengthDiff / maxLength) : 0;
}

/**
 * Extract base name from CSS filename
 * @param {string} filename
 * @returns {string}
 */
function extractCSSBaseName(filename) {
	const basename = filename.split('/').pop() || '';
	return basename.split('.')[0] || basename;
}


/**
 * @param {string} out
 * @param {import('types').ValidatedKitConfig} kit
 * @param {import('types').ManifestData} manifest_data
 * @param {import('vite').Manifest} server_manifest
 * @param {import('vite').Manifest | null} client_manifest
 * @param {import('vite').Rollup.OutputBundle | null} server_bundle
 * @param {import('vite').Rollup.RollupOutput['output'] | null} client_chunks
 * @param {import('types').RecursiveRequired<import('types').ValidatedConfig['kit']['output']>} output_config
 * @param {Map<string, { page_options: Record<string, any> | null, children: string[] }>} static_exports
 */
export async function build_server_nodes(out, kit, manifest_data, server_manifest, client_manifest, server_bundle, client_chunks, output_config, static_exports) {
	mkdirp(`${out}/server/nodes`);
	mkdirp(`${out}/server/stylesheets`);

	/** @type {Map<string, string>} */
	const stylesheets_to_inline = new Map();

	if (server_bundle && client_chunks && kit.inlineStyleThreshold > 0) {
		const client = get_stylesheets(client_chunks);
		const server = get_stylesheets(Object.values(server_bundle));



		// Create a separate map for client-to-server file mapping
		/** @type {Map<string, string>} */
		const client_to_server_files = new Map();

		// Enhanced mapping strategy with multiple fallback mechanisms
		for (const [id, client_stylesheet] of client.stylesheets_used) {
			const server_stylesheet = server.stylesheets_used.get(id);
			if (!server_stylesheet) {
				// Try to find CSS files with the same content in server build
				for (const client_file of client_stylesheet) {
					const client_content = client.stylesheet_content.get(client_file);
					if (client_content) {
						// Find server file with matching content
						for (const [server_file, server_content] of server.stylesheet_content) {
							if (client_content === server_content) {
								client_to_server_files.set(client_file, server_file);
								break;
							}
						}
					}
				}
				continue;
			}

			// Strategy 1: Direct index mapping (works when chunking is consistent)
			if (client_stylesheet.length === server_stylesheet.length) {
				client_stylesheet.forEach((client_file, i) => {
					if (server_stylesheet[i]) {
						client_to_server_files.set(client_file, server_stylesheet[i]);
					}
				});
			} else {
				// Strategy 2: Content-based matching (most reliable)
				for (const client_file of client_stylesheet) {
					const client_content = client.stylesheet_content.get(client_file);
					if (!client_content) continue;

					let best_match = null;
					let best_similarity = 0;

					for (const server_file of server_stylesheet) {
						const server_content = server.stylesheet_content.get(server_file);
						if (!server_content) continue;

						// Calculate content similarity
						const similarity = calculateCSSContentSimilarity(client_content, server_content);
						if (similarity > best_similarity && similarity > 0.8) {
							best_similarity = similarity;
							best_match = server_file;
						}
					}

					if (best_match) {
						client_to_server_files.set(client_file, best_match);
					} else {
						// Strategy 3: Filename-based fallback
						const client_base = extractCSSBaseName(client_file);
						const matching_server_file = server_stylesheet.find(server_file => {
							const server_base = extractCSSBaseName(server_file);
							return client_base === server_base;
						});

						if (matching_server_file) {
							client_to_server_files.set(client_file, matching_server_file);
						} else {
							console.warn(`[SvelteKit CSS] No matching server stylesheet found for client file: ${client_file} (module: ${id})`);
						}
					}
				}
			}
		}

		// filter out stylesheets that should not be inlined based on size
		for (const [fileName, content] of client.stylesheet_content) {
			if (content.length >= kit.inlineStyleThreshold) {
				client_to_server_files.delete(fileName);
			}
		}

		// map client stylesheet name to the server stylesheet source content
		for (const [client_file, server_file] of client_to_server_files) {
			const client_content = client.stylesheet_content.get(client_file);
			const server_content = server.stylesheet_content.get(server_file);

			if (!server_content) {
				console.warn(`[SvelteKit CSS] Server stylesheet source not found for: ${server_file}, skipping ${client_file}`);
				continue;
			}

			// Verify content similarity to catch mapping errors
			if (client_content && server_content) {
				// Simple similarity check: compare normalized lengths
				const client_normalized = client_content.replace(/\s+/g, '').length;
				const server_normalized = server_content.replace(/\s+/g, '').length;
				const length_diff = Math.abs(client_normalized - server_normalized) / Math.max(client_normalized, server_normalized);

				if (length_diff > 0.5) {
					console.warn(`[SvelteKit CSS] Content mismatch detected: ${client_file} -> ${server_file} (${Math.round(length_diff * 100)}% difference), using server content`);
				}
			}

			stylesheets_to_inline.set(client_file, server_content);
		}
	}

	const { get_page_options } = create_node_analyser({
		resolve: (server_node) => {
			// Windows needs the file:// protocol for absolute path dynamic imports
			return import(`file://${join(out, 'server', resolve_symlinks(server_manifest, server_node).chunk.file)}`);
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
				exports.push(`export const universal = ${s(page_options, null, 2)};`)
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
 * @param {(import('vite').Rollup.OutputAsset | import('vite').Rollup.OutputChunk)[]} chunks
 */
function get_stylesheets(chunks) {
	/**
	 * A map of module IDs and the stylesheets they use.
	 * @type {Map<string, string[]>}
	 */
	const stylesheets_used = new Map();

	/**
	 * A map of stylesheet names and their content.
	 * @type {Map<string, string>}
	 */
	const stylesheet_content = new Map();

	for (const chunk of chunks) {
		if (chunk.type === 'asset') {
			if (chunk.fileName.endsWith('.css')) {
				stylesheet_content.set(chunk.fileName, chunk.source.toString());
			}
			continue;
		}

		if (chunk.viteMetadata?.importedCss.size) {
			const css = Array.from(chunk.viteMetadata.importedCss);
			for (const id of chunk.moduleIds) {
				stylesheets_used.set(id, css );
			}
		}
	}
	return { stylesheets_used, stylesheet_content };
}
