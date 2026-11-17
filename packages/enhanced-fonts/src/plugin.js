import path from 'node:path';
import { font_base_from_vite_config, resolve_families } from './resolve.js';
import { write_css_variable_types } from './types-gen.js';

/** @import { EnhancedFontsOptions } from '../types/index.js' */
/** @import { Plugin, ResolvedConfig } from 'vite' */
/** @import { ResolvedFamilies } from './resolve.js' */

const VIRTUAL_ID = 'virtual:enhanced-fonts';
const RESOLVED_VIRTUAL_ID = `\0${VIRTUAL_ID}`;

/**
 * @param {EnhancedFontsOptions} [options]
 * @returns {Plugin}
 */
export function enhancedFonts(options = { families: [] }) {
	const families = options.families ?? [];

	/** @type {ResolvedConfig} */
	let vite_config;
	/** @type {Promise<ResolvedFamilies> | undefined} */
	let resolving;
	/** @type {ResolvedFamilies | undefined} */
	let resolved;

	async function ensure_resolved() {
		if (resolved) return resolved;
		if (!resolving) {
			const assets_dir = fonts_assets_dir(vite_config);
			resolving = resolve_families(families, {
				root: vite_config.root,
				assets_dir,
				base: font_base_from_vite_config(vite_config)
			})
				.then((value) => {
					resolved = value;
					write_css_variable_types(
						families,
						path.join(vite_config.root, '.svelte-kit/experimental-enhanced-fonts.d.ts')
					);
					return value;
				})
				.catch((error) => {
					const fail = options.throwOnError ?? vite_config.command === 'build';
					if (fail) throw error;
					const message = error instanceof Error ? error.message : String(error);
					vite_config.logger.warn(message);
					resolved = { files: [], by_css_variable: {} };
					return resolved;
				});
		}
		return resolving;
	}

	return {
		name: 'vite-plugin-enhanced-fonts',
		configResolved(config) {
			vite_config = config;
			const kit_index = config.plugins.findIndex(
				(plugin) => plugin.name === 'vite-plugin-sveltekit-setup'
			);
			const ours = config.plugins.findIndex(
				(plugin) => plugin.name === 'vite-plugin-enhanced-fonts'
			);
			if (kit_index !== -1 && ours !== -1 && ours < kit_index) {
				config.logger.warn(
					'@sveltejs/enhanced-fonts should be placed after sveltekit() in Vite plugins so compiled CSS is visible'
				);
			}
		},
		resolveId(id) {
			if (id === VIRTUAL_ID) return RESOLVED_VIRTUAL_ID;
		},
		async load(id) {
			if (id !== RESOLVED_VIRTUAL_ID) return;
			const data = await ensure_resolved();
			return render_virtual_module(data);
		},
		async buildStart() {
			if (vite_config.command === 'build') {
				await ensure_resolved();
			}
		},
		configureServer(server) {
			server.middlewares.use(async (req, res, next) => {
				try {
					const data = await ensure_resolved();
					const url = req.url?.split('?')[0] ?? '';
					const file = data.files.find((entry) => {
						const href = entry.url.split('?')[0];
						return href === url || `/${entry.file_name}` === url;
					});
					if (!file) {
						next();
						return;
					}
					res.setHeader('Content-Type', 'font/woff2');
					res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
					res.setHeader('Pragma', 'no-cache');
					res.setHeader('Expires', '0');
					res.end(file.source);
				} catch (error) {
					next(error);
				}
			});
		},
		async generateBundle(_opts, _bundle, is_write) {
			if (vite_config.build.ssr) return;
			if (is_write === false) return;
			const data = await ensure_resolved();
			for (const file of data.files) {
				this.emitFile({
					type: 'asset',
					fileName: file.file_name,
					source: file.source
				});
			}
		}
	};
}

/**
 * @param {ResolvedFamilies} data
 * @returns {string}
 */
/**
 * Kit writes hashed client files under `_app/immutable` via `assetFileNames`,
 * not `build.assetsDir`. Prefer that prefix when sveltekit() is present so
 * adapters' immutable Cache-Control applies.
 *
 * @param {ResolvedConfig} config
 * @returns {string}
 */
function fonts_assets_dir(config) {
	const has_kit = config.plugins.some((plugin) => plugin.name === 'vite-plugin-sveltekit-setup');
	if (has_kit) return '_app/immutable';
	return (config.build.assetsDir || 'assets').replaceAll('\\', '/');
}

/**
 * @param {ResolvedFamilies} data
 * @returns {string}
 */
function render_virtual_module(data) {
	return `const registry = ${JSON.stringify(data.by_css_variable)};

export function get_font(cssVariable) {
	const data = registry[cssVariable];
	if (!data) {
		throw new Error(
			'Unknown font cssVariable "' +
				cssVariable +
				'". Configure it in enhancedFonts({ families }).'
		);
	}
	return data;
}

export function get_font_data(cssVariable) {
	return get_font(cssVariable).data;
}

export const fontData = Object.fromEntries(
	Object.entries(registry).map(([key, value]) => [key, value.data])
);
`;
}
