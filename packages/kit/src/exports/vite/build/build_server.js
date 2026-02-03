import fs from 'node:fs';
import { mkdirp } from '../../../utils/filesystem.js';
import { filter_fonts, find_deps, resolve_symlinks } from './utils.js';
import { s } from '../../../utils/misc.js';
import { normalizePath } from 'vite';
import { basename, join } from 'node:path';
import { create_node_analyser } from '../static_analysis/index.js';
import { fix_css_urls } from '../../../utils/css.js';

/**
 * Regenerate server nodes after acquiring client manifest
 * @overload
 * @param {string} out
 * @param {import('types').ValidatedKitConfig} kit
 * @param {import('types').ManifestData} manifest_data
 * @param {import('vite').Manifest} server_manifest
 * @param {import('vite').Manifest} client_manifest
 * @param {string} assets_path
 * @param {import('vite').Rollup.RollupOutput['output']} client_chunks
 * @param {import('types').RecursiveRequired<import('types').ValidatedConfig['kit']['output']>} output_config
 * @param {Map<string, { page_options: Record<string, any> | null, children: string[] }>} static_exports
 * @returns {Promise<void>}
 */
/**
 * Build server nodes without client manifest for analysis phase
 * @overload
 * @param {string} out
 * @param {import('types').ValidatedKitConfig} kit
 * @param {import('types').ManifestData} manifest_data
 * @param {import('vite').Manifest} server_manifest
 * @param {null} client_manifest
 * @param {null} assets_path
 * @param {null} client_chunks
 * @param {import('types').RecursiveRequired<import('types').ValidatedConfig['kit']['output']>} output_config
 * @param {Map<string, { page_options: Record<string, any> | null, children: string[] }>} static_exports
 * @returns {Promise<void>}
 */
/**
 * @param {string} out
 * @param {import('types').ValidatedKitConfig} kit
 * @param {import('types').ManifestData} manifest_data
 * @param {import('vite').Manifest} server_manifest
 * @param {import('vite').Manifest | null} client_manifest
 * @param {string | null} assets_path
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
	assets_path,
	client_chunks,
	output_config,
	static_exports
) {
	mkdirp(`${out}/server/nodes`);
	mkdirp(`${out}/server/stylesheets`);

	/**
	 * Stylesheet names and their contents which are below the inline threshold
	 * @type {Map<string, string>}
	 */
	const stylesheets_to_inline = new Map();

	/**
	 * For CSS inlining, we either store a string or a function that returns the
	 * styles with the correct relative URLs
	 * @type {(css: string, eager_assets: Set<string>) => string}
	 */
	let prepare_css_for_inlining = (css) => s(css);

	if (client_chunks && kit.inlineStyleThreshold > 0 && output_config.bundleStrategy === 'split') {
		for (const chunk of client_chunks) {
			if (chunk.type !== 'asset' || !chunk.fileName.endsWith('.css')) {
				continue;
			}

			const source = chunk.source.toString();
			if (source.length < kit.inlineStyleThreshold) {
				stylesheets_to_inline.set(chunk.fileName, source);
			}
		}

		// If the client CSS has URL references to assets, we need to adjust the
		// relative path so that they are correct when inlined into the document.
		// Although `paths.assets` is static, we need to pass in a fake path
		// `/_svelte_kit_assets` at runtime when running `vite preview`
		if (kit.paths.assets || kit.paths.relative) {
			const static_assets = new Set(
				manifest_data.assets.map((asset) => decodeURIComponent(asset.file))
			);

			const segments = /** @type {string} */ (assets_path).split('/');
			const static_asset_prefix = segments.map(() => '..').join('/') + '/';

			prepare_css_for_inlining = (css, eager_assets) => {
				const transformed_css = fix_css_urls({
					css,
					vite_assets: eager_assets,
					static_assets,
					paths_assets: '${assets}',
					base: '${base}',
					static_asset_prefix
				});

				// only convert to a function if we have adjusted any URLs
				if (css !== transformed_css) {
					return `function css(assets, base) { return \`${s(transformed_css).slice(1, -1)}\`; }`;
				}
				return s(css);
			};
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

		/** @type {Set<string>} */
		let eager_assets = new Set();

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

			// Eagerly load client stylesheets and fonts imported by the SSR-ed page to avoid FOUC.
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

		/**
		 * Assets that have been processed by Vite (decoded and with the asset path stripped)
		 * @type {Set<string>}
		 */
		let vite_assets = new Set();

		// Keep track of Vite asset filenames so that we avoid touching unrelated ones
		// when adjusting the inlined CSS
		if (stylesheets_to_inline.size && assets_path && eager_assets.size) {
			vite_assets = new Set(
				Array.from(eager_assets).map((asset) => {
					return decodeURIComponent(asset.replace(`${assets_path}/`, ''));
				})
			);
		}

		if (stylesheets_to_inline.size) {
			/** @type {string[]} */
			const inline_styles = [];

			stylesheets.forEach((file, i) => {
				if (stylesheets_to_inline.has(file)) {
					const filename = basename(file);
					const dest = `${out}/server/stylesheets/${filename}.js`;

					let css = /** @type {string} */ (stylesheets_to_inline.get(file));

					fs.writeFileSync(
						dest,
						`// ${filename}\nexport default ${prepare_css_for_inlining(css, vite_assets)};`
					);
					const name = `stylesheet_${i}`;
					imports.push(`import ${name} from '../stylesheets/${filename}.js';`);
					inline_styles.push(`\t${s(file)}: ${name}`);
				}
			});

			if (inline_styles.length > 0) {
				exports.push(`export const inline_styles = () => ({\n${inline_styles.join(',\n')}\n});`);
			}
		}

		fs.writeFileSync(
			`${out}/server/nodes/${i}.js`,
			`${imports.join('\n')}\n\n${exports.join('\n')}\n`
		);
	}
}
