import fs, { writeFileSync } from 'node:fs';
import path, { basename, } from 'node:path';
import process from 'node:process';
import * as vite from 'vite';
import { create_static_module } from '../../../core/env.js';
import { generate_manifest } from '../../../core/generate_manifest/index.js';
import { dedent } from '../../../core/sync/utils.js';
import { mkdirp } from '../../../utils/filesystem.js';
import { s } from '../../../utils/misc.js';
import { env_static_public } from '../module_ids.js';
import { get_config_aliases, get_env, normalize_id, strip_virtual_prefix } from '../utils.js';
import { filter_fonts, find_deps, resolve_symlinks } from './utils.js';

/**
 * @param {string} out
 * @param {import('types').ValidatedKitConfig} kit
 * @param {import('vite').ResolvedConfig} vite_config
 * @param {import('types').ManifestData} manifest_data
 * @param {string} service_worker_entry_file
 * @param {import('types').Prerendered} prerendered
 * @param {import('vite').Manifest} client_manifest
 * @param {import('types').BuildData} build_data
 * @param {import("types").PrerenderMap} prerender_map
 */
export async function build_service_worker(
	out,
	kit,
	vite_config,
	manifest_data,
	service_worker_entry_file,
	prerendered,
	client_manifest,
	build_data,
	prerender_map
) {
	const build = new Set();

	for (const key in client_manifest) {
		const { file, css = [], assets = [] } = client_manifest[key];
		build.add(file);
		css.forEach((file) => build.add(file));
		assets.forEach((file) => build.add(file));
	}

	// in a service worker, `location` is the location of the service worker itself,
	// which is guaranteed to be `<base>/service-worker.js`
	const base = "location.pathname.split('/').slice(0, -1).join('/')";

	const env = get_env(kit.env, vite_config.mode);

	/**
	 * @type {import('vite').Plugin}
	 */
	const sw_virtual_modules = {
		name: 'service-worker-build-virtual-modules',
		resolveId(id) {
			if (id.startsWith('$env/') || id.startsWith('$app/')) {
				// ids with :$ don't work with reverse proxies like nginx
				return `\0virtual:${id.substring(1)}`;
			}
		},

		load(id) {
			if (!id.startsWith('\0virtual:')) return;

			if (id === env_static_public) {
				return create_static_module('$env/static/public', env.public);
			}

			const normalized_cwd = vite.normalizePath(process.cwd());
			const normalized_lib = vite.normalizePath(kit.files.lib);
			const relative = normalize_id(id, normalized_lib, normalized_cwd);
			const stripped = strip_virtual_prefix(relative);
			throw new Error(
				`Cannot import ${stripped} into service-worker code. Only the modules $service-worker and $env/static/public are available in service workers.`
			);
		}
	};

	const route_data = build_data.manifest_data.routes.filter((route) => route.page);
	
	writeFileSync(
		`${kit.outDir}/output/service-worker/index.js`,
		dedent`
		const manifest = ${generate_manifest({
				build_data,
				prerendered: prerendered.paths,
				relative_path: path.posix.relative(`${kit.outDir}/output/service-worker`, `${kit.outDir}/output/service-worker`),
				routes:  route_data.filter((route) => prerender_map.get(route.id) !== true)
		})};
			
		const prerendered = new Set(${JSON.stringify(prerendered.paths)});

		export const base = /*@__PURE__*/ ${base};

		export const build = [
			${Array.from(build)
				.map((file) => `base + ${s(`/${file}`)}`)
				.join(',\n')}
		];

		export const files = [
			${manifest_data.assets
				.filter((asset) => kit.serviceWorker.files(asset.file))
				.map((asset) => `base + ${s(`/${asset.file}`)}`)
				.join(',\n')}
		];

		export const prerendered = [
			${prerendered.paths.map((path) => `base + ${s(path.replace(kit.paths.base, ''))}`).join(',\n')}
		];

		export const version = ${s(kit.version.name)};

		let server;

		export function respond(event) {
				return "Hello World!";
		}
	`
	)	

	await vite.build({
		build: {
			modulePreload: false,
			rollupOptions: {
				input: {
					'service-worker': service_worker_entry_file
				},
				output: {
					// .mjs so that esbuild doesn't incorrectly inject `export` https://github.com/vitejs/vite/issues/15379
					entryFileNames: 'service-worker.mjs',
					assetFileNames: `${kit.appDir}/immutable/assets/[name].[hash][extname]`,
					inlineDynamicImports: true
				}
			},
			outDir: `${out}/client`,
			emptyOutDir: false,
			minify: vite_config.build.minify
		},
		configFile: false,
		define: vite_config.define,
		publicDir: false,
		plugins: [sw_virtual_modules],
		resolve: {
			alias: [...get_config_aliases(kit), { find: "$service-worker", replacement: path.relative(service_worker_entry_file, `${out}/service-worker/service-worker.js`) }]
		},
		experimental: {
			renderBuiltUrl(filename) {
				return {
					runtime: `new URL(${JSON.stringify(filename)}, location.href).pathname`
				};
			}
		}
	});

	// rename .mjs to .js to avoid incorrect MIME types with ancient webservers
	fs.renameSync(`${out}/client/service-worker.mjs`, `${out}/client/service-worker.js`);
}

/**
 * @param {string} out
 * @param {import('types').ValidatedKitConfig} kit
 * @param {import('types').ManifestData} manifest_data
 * @param {import('vite').Manifest} service_worker_manifest
 * @param {import('vite').Manifest | null} client_manifest
 * @param {import('vite').Rollup.OutputAsset[] | null} css
 * @param {import('types').RecursiveRequired<import('types').ValidatedConfig['kit']['output']>} output_config
 */
export function build_service_worker_nodes(out, kit, manifest_data, service_worker_manifest, client_manifest, css, output_config) {
	mkdirp(`${out}/service-worker/nodes`);
	mkdirp(`${out}/service-worker/stylesheets`);

	/** @type {Map<string, string>} */
	const stylesheet_lookup = new Map();

	if (css) {
		/** @type {Set<string>} */
		const client_stylesheets = new Set();
		for (const key in client_manifest) {
			client_manifest[key].css?.forEach((filename) => {
				client_stylesheets.add(filename);
			});
		}

		/** @type {Map<number, string[]>} */
		const service_worker_stylesheets = new Map();
		manifest_data.nodes.forEach((node, i) => {
			if (!node.component || !service_worker_manifest[node.component]) return;

			const { stylesheets } = find_deps(service_worker_manifest, node.component, false);

			if (stylesheets.length) {
				service_worker_stylesheets.set(i, stylesheets);
			}
		});

		for (const asset of css) {
			// ignore dynamically imported stylesheets since we don't need to inline those
			if (!client_stylesheets.has(asset.fileName) || asset.source.length >= kit.inlineStyleThreshold) {
				continue;
			}

			// We know that the names for entry points are numbers.
			const [index] = basename(asset.fileName).split('.');
			// There can also be other CSS files from shared components
			// for example, which we need to ignore here.
			if (isNaN(+index)) continue;

			const file = `${out}/service-worker/stylesheets/${index}.js`;

			// we need to inline the server stylesheet instead of the client one
			// so that asset paths are correct on document load
			const filenames = service_worker_stylesheets.get(+index);

			if (!filenames) {
				throw new Error('This should never happen, but if it does, it means we failed to find the server stylesheet for a node.');
			}

			const sources = filenames.map((filename) => {
				return fs.readFileSync(`${out}/service-worker/${filename}`, 'utf-8');
			});
			
			fs.writeFileSync(file, `// ${filenames.join(', ')}\nexport default ${s(sources.join('\n'))};`);

			stylesheet_lookup.set(asset.fileName, index);
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
					resolve_symlinks(service_worker_manifest, node.component).chunk.file
				}')).default;`
			);
		}

		if (node.universal) {
			imports.push(
				`import * as universal from '../${
					resolve_symlinks(service_worker_manifest, node.universal).chunk.file
				}';`
			);
			exports.push('export { universal };');
			exports.push(`export const universal_id = ${s(node.universal)};`);
		}

		if (client_manifest && (node.universal || node.component) && output_config.bundleStrategy === 'split') {
			const entry_path = `${vite.normalizePath(kit.outDir)}/generated/client-optimized/nodes/${i}.js`;
			const entry = find_deps(client_manifest, entry_path, true);

			// eagerly load stylesheets and fonts imported by the SSR-ed page to avoid FOUC.
			// If it is not used during SSR, it can be lazily loaded in the browser.
	
			/** @type {import('types').AssetDependencies | undefined} */
			let component;
			if (node.component) {
				component = find_deps(service_worker_manifest, node.component, true);
			}

			/** @type {import('types').AssetDependencies | undefined} */
			let universal;
			if (node.universal) {
				universal = find_deps(service_worker_manifest, node.universal, true);
			}

			/** @type {Set<string>} */
			const css_used_by_server = new Set();
			/** @type {Set<string>} */
			const assets_used_by_server = new Set();

			entry.stylesheet_map.forEach((value, key) => {
				// pages and layouts are named as node indexes in the client manifest
				// so we need to use the original filename when checking against the server manifest
				if (key === entry_path) {
					key = node.component ?? key;
				}

				if (component?.stylesheet_map.has(key) || universal?.stylesheet_map.has(key)) {
					value.css.forEach(file => css_used_by_server.add(file));
					value.assets.forEach(file => assets_used_by_server.add(file));
				}
			});

			imported = entry.imports;
			stylesheets = Array.from(css_used_by_server);
			fonts = filter_fonts(Array.from(assets_used_by_server));
		}

		exports.push(
			`export const imports = ${s(imported)};`,
			`export const stylesheets = ${s(stylesheets)};`,
			`export const fonts = ${s(fonts)};`
		);

		/** @type {string[]} */
		const styles = [];

		stylesheets.forEach((file) => {
			if (stylesheet_lookup.has(file)) {
				const index = stylesheet_lookup.get(file);
				const name = `stylesheet_${index}`;
				imports.push(`import ${name} from '../stylesheets/${index}.js';`);
				styles.push(`\t${s(file)}: ${name}`);
			}
		});

		if (styles.length > 0) {
			exports.push(`export const inline_styles = () => ({\n${styles.join(',\n')}\n});`);
		}

		fs.writeFileSync(
			`${out}/service-worker/nodes/${i}.js`,
			`${imports.join('\n')}\n\n${exports.join('\n')}\n`
		);
	});
}
