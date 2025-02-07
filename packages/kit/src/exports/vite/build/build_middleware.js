import * as vite from 'vite';
import { dedent } from '../../../core/sync/utils.js';
import { s } from '../../../utils/misc.js';
import { sveltekit_paths } from '../module_ids.js';
import { get_config_aliases } from '../utils.js';
import { posixify } from '../../../utils/filesystem.js';
import { fileURLToPath } from 'url';

/**
 * @param {string} out
 * @param {import('types').ValidatedKitConfig} kit
 * @param {import('vite').ResolvedConfig} vite_config
 * @param {string} runtime_directory
 * @param {string} middleware_entry_file
 */
export async function build_middleware(
	out,
	kit,
	vite_config,
	runtime_directory,
	middleware_entry_file
) {
	/**
	 * @type {import('vite').Plugin}
	 */
	const mw_virtual_modules = {
		name: 'middleware-build-virtual-modules',

		resolveId(id) {
			if (
				id.startsWith('$env/') ||
				id === '$service-worker' ||
				(id.startsWith('$app/') && id !== '$app/paths')
			) {
				throw new Error(
					`Cannot import ${id} into middleware code. Only the $app/paths module is available in middleware.`
				);
			}

			if (id.startsWith('__sveltekit/')) {
				return `\0virtual:${id}`;
			}
		},

		load(id) {
			if (!id.startsWith('\0virtual:')) {
				return;
			}

			if (id === sveltekit_paths) {
				const { assets, base } = kit.paths;

				// TODO duplicated in vite/index.js, extract to a shared module?
				return dedent`
						export let base = ${s(base)};
						export let assets = ${assets ? s(assets) : 'base'};
						export const app_dir = ${s(kit.appDir)};

						export const relative = ${kit.paths.relative};

						const initial = { base, assets };

						export function override(paths) {
							base = paths.base;
							assets = paths.assets;
						}

						export function reset() {
							base = initial.base;
							assets = initial.assets;
						}

						/** @param {string} path */
						export function set_assets(path) {
							assets = initial.assets = path;
						}
					`;
			}

			throw new Error(
				`Cannot import ${id} into middleware code. Only the $app/paths module is available in middleware.`
			);
		}
	};

	await vite.build({
		build: {
			ssr: true,
			modulePreload: false,
			rollupOptions: {
				input: {
					middleware: middleware_entry_file
				},
				output: {
					entryFileNames: 'middleware.js',
					// TODO disallow assets? where should they go?
					assetFileNames: `${kit.appDir}/immutable/assets/[name].[hash][extname]`,
					inlineDynamicImports: true
				}
			},
			outDir: `${out}/server`,
			emptyOutDir: false,
			minify: vite_config.build.minify
		},
		configFile: false,
		define: vite_config.define,
		publicDir: false,
		plugins: [mw_virtual_modules],
		resolve: {
			alias: [
				{ find: '$app/paths', replacement: `${runtime_directory}/app/paths` },
				...get_config_aliases(kit)
			]
		}
	});

	// Preview only: build call_middleware from dev
	await vite.build({
		build: {
			ssr: true,
			modulePreload: false,
			rollupOptions: {
				input: {
					middleware: posixify(fileURLToPath(new URL('../dev/call_middleware.js', import.meta.url)))
				},
				output: {
					entryFileNames: 'middleware-preview.js',
					inlineDynamicImports: true
				}
			},
			outDir: `${out}/server`,
			emptyOutDir: false,
			minify: vite_config.build.minify
		},
		configFile: false,
		define: vite_config.define,
		publicDir: false,
		plugins: [mw_virtual_modules],
		resolve: {
			alias: [
				{ find: '$app/paths', replacement: `${runtime_directory}/app/paths` },
				...get_config_aliases(kit)
			]
		}
	});
}
