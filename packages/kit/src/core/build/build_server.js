import fs from 'fs';
import path from 'path';
import { resolve_entry } from '../utils.js';
import vite from 'vite';
import svelte from '@sveltejs/vite-plugin-svelte';
import { s } from '../../utils.js';

/**
 * @param {{
 *   cwd: string;
 *   base: string;
 *   config: import('types/config').ValidatedConfig
 *   manifest: import('types/internal').ManifestData
 *   build_dir: string;
 *   output_dir: string;
 *   client_entry_file: string;
 *   service_worker_entry_file: string;
 * }} options
 * @param {import('./types.js').ClientManifest} client_manifest
 * @param {string} runtime
 */
export async function build_server(
	{ cwd, base, config, manifest, build_dir, output_dir, client_entry_file },
	client_manifest,
	runtime
) {
	let hooks_file = resolve_entry(config.kit.files.hooks);
	if (!fs.existsSync(hooks_file)) {
		hooks_file = path.resolve(cwd, '.svelte/build/hooks.js');
		fs.writeFileSync(hooks_file, '');
	}

	const app_file = `${build_dir}/app.js`;

	/** @type {(file: string) => string} */
	const app_relative = (file) => {
		const relative_file = path.relative(build_dir, path.resolve(cwd, file));
		return relative_file[0] === '.' ? relative_file : `./${relative_file}`;
	};

	/**
	 * @param {string} file
	 * @param {Set<string>} js_deps
	 * @param {Set<string>} css_deps
	 */
	function find_deps(file, js_deps, css_deps) {
		const chunk = client_manifest[file];

		if (js_deps.has(chunk.file)) return;
		js_deps.add(chunk.file);

		if (chunk.css) {
			chunk.css.forEach((file) => css_deps.add(file));
		}

		if (chunk.imports) {
			chunk.imports.forEach((file) => find_deps(file, js_deps, css_deps));
		}
	}

	/** @type {Record<string, { entry: string, css: string[], js: string[], styles: string[] }>} */
	const metadata_lookup = {};

	manifest.components.forEach((file) => {
		const js_deps = new Set();
		const css_deps = new Set();

		find_deps(file, js_deps, css_deps);

		const js = Array.from(js_deps);
		const css = Array.from(css_deps);

		const styles = config.kit.amp
			? Array.from(css_deps).map((url) => {
					const resolved = `${output_dir}/client/${config.kit.appDir}/${url}`;
					return fs.readFileSync(resolved, 'utf-8');
			  })
			: null;

		metadata_lookup[file] = {
			entry: client_manifest[file].file,
			css,
			js,
			styles
		};
	});

	/** @type {Set<string>} */
	const entry_js = new Set();
	/** @type {Set<string>} */
	const entry_css = new Set();

	find_deps(client_entry_file, entry_js, entry_css);

	// prettier-ignore
	fs.writeFileSync(
		app_file,
		`
			import { ssr } from '${runtime}';
			import root from './generated/root.svelte';
			import { set_paths } from './runtime/paths.js';
			import { set_prerendering } from './runtime/env.js';
			import * as user_hooks from ${s(app_relative(hooks_file))};

			const template = ({ head, body }) => ${s(fs.readFileSync(config.kit.files.template, 'utf-8'))
				.replace('%svelte.head%', '" + head + "')
				.replace('%svelte.body%', '" + body + "')};

			let options = null;

			// allow paths to be overridden in svelte-kit start
			// and in prerendering
			export function init(settings) {
				set_paths(settings.paths);
				set_prerendering(settings.prerendering || false);

				const prefix = (settings.paths.assets === '/.' ? '' : settings.paths.assets) + '/${config.kit.appDir}/';

				options = {
					amp: ${config.kit.amp},
					dev: false,
					entry: {
						file: prefix + '${client_manifest[client_entry_file].file}',
						css: [${Array.from(entry_css).map(dep => `prefix + '${dep}'`).join(', ')}],
						js: [${Array.from(entry_js).map(dep => `prefix + '${dep}'`).join(', ')}]
					},
					fetched: undefined,
					get_component_path: id => prefix + entry_lookup[id],
					get_stack: error => String(error), // for security
					handle_error: error => {
						console.error(error.stack);
						error.stack = options.get_stack(error);
					},
					hooks: get_hooks(user_hooks),
					hydrate: ${s(config.kit.hydrate)},
					initiator: undefined,
					load_component: async (file) => {
						const { entry, css, js, styles } = metadata_lookup[file];
						return {
							module: await module_lookup[file](),
							entry: prefix + entry,
							css: css.map(dep => prefix + dep),
							js: js.map(dep => prefix + dep),
							styles
						};
					},
					manifest,
					paths: settings.paths,
					read: settings.read,
					root,
					router: ${s(config.kit.router)},
					ssr: ${s(config.kit.ssr)},
					target: ${s(config.kit.target)},
					template
				};
			}

			const d = decodeURIComponent;
			const empty = () => ({});

			const manifest = {
				assets: ${s(manifest.assets)},
				layout: ${s(manifest.layout)},
				error: ${s(manifest.error)},
				routes: [
					${manifest.routes
				.map((route) => {
					if (route.type === 'page') {
						const params = get_params(route.params);

						return `{
									type: 'page',
									pattern: ${route.pattern},
									params: ${params},
									a: [${route.a.map(file => file && s(file)).join(', ')}],
									b: [${route.b.map(file => file && s(file)).join(', ')}]
								}`;
					} else {
						const params = get_params(route.params);
						const load = `() => import(${s(app_relative(route.file))})`;

						return `{
									type: 'endpoint',
									pattern: ${route.pattern},
									params: ${params},
									load: ${load}
								}`;
					}
				})
				.join(',\n\t\t\t\t\t')}
				]
			};

			// this looks redundant, but the indirection allows us to access
			// named imports without triggering Rollup's missing import detection
			const get_hooks = hooks => ({
				getContext: hooks.getContext || (() => ({})),
				getSession: hooks.getSession || (() => ({})),
				handle: hooks.handle || (({ request, render }) => render(request))
			});

			const module_lookup = {
				${manifest.components.map(file => `${s(file)}: () => import(${s(app_relative(file))})`)}
			};

			const metadata_lookup = ${s(metadata_lookup)};

			init({ paths: ${s(config.kit.paths)} });

			export function render(request, {
				prerender
			} = {}) {
				const host = ${config.kit.host ? s(config.kit.host) : `request.headers[${s(config.kit.hostHeader || 'host')}]`};
				return ssr({ ...request, host }, options, { prerender });
			}
		`
			.replace(/^\t{3}/gm, '')
			.trim()
	);

	/** @type {any} */
	const user_config = config.kit.vite();

	await vite.build({
		...user_config,
		configFile: false,
		root: cwd,
		base,
		build: {
			target: 'es2018',
			...user_config.build,
			ssr: true,
			outDir: `${output_dir}/server`,
			polyfillDynamicImport: false,
			rollupOptions: {
				...(user_config.build && user_config.build.rollupOptions),
				input: {
					app: app_file
				},
				output: {
					format: 'esm',
					entryFileNames: '[name].js',
					chunkFileNames: 'chunks/[name]-[hash].js',
					assetFileNames: 'assets/[name]-[hash][extname]',
					inlineDynamicImports: true
				},
				preserveEntrySignatures: 'strict'
			}
		},
		resolve: {
			...user_config.resolve,
			alias: {
				...(user_config.resolve && user_config.resolve.alias),
				$app: path.resolve(`${build_dir}/runtime/app`),
				$lib: config.kit.files.lib
			}
		},
		plugins: [
			...(user_config.plugins || []),
			svelte({
				extensions: config.extensions
			})
		],
		// this API is marked as @alpha https://github.com/vitejs/vite/blob/27785f7fcc5b45987b5f0bf308137ddbdd9f79ea/packages/vite/src/node/config.ts#L129
		// it's not exposed in the typescript definitions as a result
		// so we need to ignore the fact that it's missing
		// @ts-ignore
		ssr: {
			...user_config.ssr,
			noExternal: [
				'svelte',
				'@sveltejs/kit',
				...((user_config.ssr && user_config.ssr.noExternal) || [])
			]
		},
		optimizeDeps: {
			entries: []
		}
	});
}

/** @param {string[]} array */
function get_params(array) {
	// given an array of params like `['x', 'y', 'z']` for
	// src/routes/[x]/[y]/[z]/svelte, create a function
	// that turns a RexExpMatchArray into ({ x, y, z })
	return array.length
		? '(m) => ({ ' +
				array
					.map((param, i) => {
						return param.startsWith('...')
							? `${param.slice(3)}: d(m[${i + 1}] || '')`
							: `${param}: d(m[${i + 1}])`;
					})
					.join(', ') +
				'})'
		: 'empty';
}
