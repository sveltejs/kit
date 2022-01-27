import fs from 'fs';
import path from 'path';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { mkdirp, posixify } from '../../utils/filesystem.js';
import { deep_merge } from '../../utils/object.js';
import { load_template, print_config_conflicts } from '../config/index.js';
import { get_aliases, resolve_entry, runtime } from '../utils.js';
import { create_build, find_deps } from './utils.js';
import { SVELTE_KIT } from '../constants.js';
import { s } from '../../utils/misc.js';

/**
 * @param {{
 *   hooks: string;
 *   config: import('types/config').ValidatedConfig;
 *   has_service_worker: boolean;
 *   template: string;
 * }} opts
 * @returns
 */
const app_template = ({ config, hooks, has_service_worker, template }) => `
import root from '__GENERATED__/root.svelte';
import { respond } from '${runtime}/server/index.js';
import { set_paths, assets, base } from '${runtime}/paths.js';
import { set_prerendering } from '${runtime}/env.js';
import * as user_hooks from ${s(hooks)};

const template = ({ head, body, assets, nonce }) => ${s(template)
	.replace('%svelte.head%', '" + head + "')
	.replace('%svelte.body%', '" + body + "')
	.replace(/%svelte\.assets%/g, '" + assets + "')
	.replace(/%svelte\.nonce%/g, '" + nonce + "')};

let read = null;

set_paths(${s(config.kit.paths)});

// this looks redundant, but the indirection allows us to access
// named imports without triggering Rollup's missing import detection
const get_hooks = hooks => ({
	getSession: hooks.getSession || (() => ({})),
	handle: hooks.handle || (({ event, resolve }) => resolve(event)),
	handleError: hooks.handleError || (({ error }) => console.error(error.stack)),
	externalFetch: hooks.externalFetch || fetch
});

let default_protocol = 'https';

// allow paths to be globally overridden
// in svelte-kit preview and in prerendering
export function override(settings) {
	default_protocol = settings.protocol || default_protocol;
	set_paths(settings.paths);
	set_prerendering(settings.prerendering);
	read = settings.read;
}

export class App {
	constructor(manifest) {
		const hooks = get_hooks(user_hooks);

		this.options = {
			amp: ${config.kit.amp},
			csp: ${s(config.kit.csp)},
			dev: false,
			floc: ${config.kit.floc},
			get_stack: error => String(error), // for security
			handle_error: (error, event) => {
				hooks.handleError({
					error,
					event,

					// TODO remove for 1.0
					// @ts-expect-error
					get request() {
						throw new Error('request in handleError has been replaced with event. See https://github.com/sveltejs/kit/pull/3384 for details');
					}
				});
				error.stack = this.options.get_stack(error);
			},
			hooks,
			hydrate: ${s(config.kit.hydrate)},
			manifest,
			method_override: ${s(config.kit.methodOverride)},
			paths: { base, assets },
			prefix: assets + '/${config.kit.appDir}/',
			prerender: ${config.kit.prerender.enabled},
			read,
			root,
			service_worker: ${has_service_worker ? "base + '/service-worker.js'" : 'null'},
			router: ${s(config.kit.router)},
			target: ${s(config.kit.target)},
			template,
			template_contains_nonce: ${template.includes('%svelte.nonce%')},
			trailing_slash: ${s(config.kit.trailingSlash)}
		};
	}

	render(request, options = {}) {
		if (!(request instanceof Request)) {
			throw new Error('The first argument to app.render must be a Request object. See https://github.com/sveltejs/kit/pull/3384 for details');
		}

		return respond(request, this.options, options);
	}
}
`;

/**
 * @param {{
 *   cwd: string;
 *   assets_base: string;
 *   config: import('types/config').ValidatedConfig
 *   manifest_data: import('types/internal').ManifestData
 *   build_dir: string;
 *   output_dir: string;
 *   service_worker_entry_file: string | null;
 *   service_worker_register: boolean;
 * }} options
 * @param {{ vite_manifest: import('vite').Manifest, assets: import('rollup').OutputAsset[] }} client
 */
export async function build_server(
	{
		cwd,
		assets_base,
		config,
		manifest_data,
		build_dir,
		output_dir,
		service_worker_entry_file,
		service_worker_register
	},
	client
) {
	let hooks_file = resolve_entry(config.kit.files.hooks);
	if (!hooks_file || !fs.existsSync(hooks_file)) {
		hooks_file = path.resolve(cwd, `${SVELTE_KIT}/build/hooks.js`);
		fs.writeFileSync(hooks_file, '');
	}

	/** @type {Record<string, string>} */
	const input = {
		app: `${build_dir}/app.js`
	};

	// add entry points for every endpoint...
	manifest_data.routes.forEach((route) => {
		if (route.type === 'endpoint') {
			const resolved = path.resolve(cwd, route.file);
			const relative = path.relative(config.kit.files.routes, resolved);
			const name = posixify(path.join('entries/endpoints', relative.replace(/\.js$/, '')));
			input[name] = resolved;
		}
	});

	// ...and every component used by pages
	manifest_data.components.forEach((file) => {
		const resolved = path.resolve(cwd, file);
		const relative = path.relative(config.kit.files.routes, resolved);

		const name = relative.startsWith('..')
			? posixify(path.join('entries/pages', path.basename(file)))
			: posixify(path.join('entries/pages', relative));
		input[name] = resolved;
	});

	/** @type {(file: string) => string} */
	const app_relative = (file) => {
		const relative_file = path.relative(build_dir, path.resolve(cwd, file));
		return relative_file[0] === '.' ? relative_file : `./${relative_file}`;
	};

	fs.writeFileSync(
		input.app,
		app_template({
			config,
			hooks: app_relative(hooks_file),
			has_service_worker: service_worker_register && !!service_worker_entry_file,
			template: load_template(cwd, config)
		})
	);

	/** @type {import('vite').UserConfig} */
	const vite_config = config.kit.vite();

	const default_config = {
		build: {
			target: 'es2020'
		}
	};

	// don't warn on overriding defaults
	const [modified_vite_config] = deep_merge(default_config, vite_config);

	/** @type {[any, string[]]} */
	const [merged_config, conflicts] = deep_merge(modified_vite_config, {
		configFile: false,
		root: cwd,
		base: assets_base,
		build: {
			ssr: true,
			outDir: `${output_dir}/server`,
			manifest: true,
			polyfillDynamicImport: false,
			rollupOptions: {
				input,
				output: {
					format: 'esm',
					entryFileNames: '[name].js',
					chunkFileNames: 'chunks/[name]-[hash].js',
					assetFileNames: 'assets/[name]-[hash][extname]'
				},
				preserveEntrySignatures: 'strict'
			}
		},
		plugins: [
			svelte({
				extensions: config.extensions,
				compilerOptions: {
					hydratable: !!config.kit.hydrate
				}
			})
		],
		resolve: {
			alias: get_aliases(config)
		}
	});

	print_config_conflicts(conflicts, 'kit.vite.', 'build_server');

	const { chunks } = await create_build(merged_config);

	/** @type {Record<string, string[]>} */
	const lookup = {};
	chunks.forEach((chunk) => {
		if (!chunk.facadeModuleId) return;
		const id = chunk.facadeModuleId.slice(cwd.length + 1);
		lookup[id] = chunk.exports;
	});

	/** @type {Record<string, import('types/internal').HttpMethod[]>} */
	const methods = {};
	manifest_data.routes.forEach((route) => {
		if (route.type === 'endpoint' && lookup[route.file]) {
			methods[route.file] = lookup[route.file]
				.map((x) => /** @type {import('types/internal').HttpMethod} */ (method_names[x]))
				.filter(Boolean);
		}
	});

	/** @type {import('vite').Manifest} */
	const vite_manifest = JSON.parse(fs.readFileSync(`${output_dir}/server/manifest.json`, 'utf-8'));

	mkdirp(`${output_dir}/server/nodes`);
	mkdirp(`${output_dir}/server/stylesheets`);

	const stylesheet_lookup = new Map();

	client.assets.forEach((asset) => {
		if (asset.fileName.endsWith('.css')) {
			if (config.kit.amp || asset.source.length < config.kit.inlineStyleThreshold) {
				const index = stylesheet_lookup.size;
				const file = `${output_dir}/server/stylesheets/${index}.js`;

				fs.writeFileSync(file, `// ${asset.fileName}\nexport default ${s(asset.source)};`);
				stylesheet_lookup.set(asset.fileName, index);
			}
		}
	});

	manifest_data.components.forEach((component, i) => {
		const file = `${output_dir}/server/nodes/${i}.js`;

		const js = new Set();
		const css = new Set();
		find_deps(component, client.vite_manifest, js, css);

		const imports = [`import * as module from '../${vite_manifest[component].file}';`];

		const exports = [
			'export { module };',
			`export const entry = '${client.vite_manifest[component].file}';`,
			`export const js = ${s(Array.from(js))};`,
			`export const css = ${s(Array.from(css))};`
		];

		/** @type {string[]} */
		const styles = [];

		css.forEach((file) => {
			if (stylesheet_lookup.has(file)) {
				const index = stylesheet_lookup.get(file);
				const name = `stylesheet_${index}`;
				imports.push(`import ${name} from '../stylesheets/${index}.js';`);
				styles.push(`\t${s(file)}: ${name}`);
			}
		});

		if (styles.length > 0) {
			exports.push(`export const styles = {\n${styles.join(',\n')}\n};`);
		}

		fs.writeFileSync(file, `${imports.join('\n')}\n\n${exports.join('\n')}\n`);
	});

	return {
		chunks,
		vite_manifest,
		methods: get_methods(cwd, chunks, manifest_data)
	};
}

/** @type {Record<string, string>} */
const method_names = {
	get: 'get',
	head: 'head',
	post: 'post',
	put: 'put',
	del: 'delete',
	patch: 'patch'
};

/**
 *
 * @param {string} cwd
 * @param {import('rollup').OutputChunk[]} output
 * @param {import('types/internal').ManifestData} manifest_data
 */
function get_methods(cwd, output, manifest_data) {
	/** @type {Record<string, string[]>} */
	const lookup = {};
	output.forEach((chunk) => {
		if (!chunk.facadeModuleId) return;
		const id = chunk.facadeModuleId.slice(cwd.length + 1);
		lookup[id] = chunk.exports;
	});

	/** @type {Record<string, import('types/internal').HttpMethod[]>} */
	const methods = {};
	manifest_data.routes.forEach((route) => {
		if (route.type === 'endpoint' && lookup[route.file]) {
			methods[route.file] = lookup[route.file]
				.map((x) => /** @type {import('types/internal').HttpMethod} */ (method_names[x]))
				.filter(Boolean);
		}
	});

	return methods;
}
