import fs from 'fs';
import path from 'path';
import { mkdirp, posixify } from '../../utils/filesystem.js';
import { get_vite_config, merge_vite_configs, resolve_entry } from '../utils.js';
import { load_template } from '../../core/config/index.js';
import { runtime_directory } from '../../core/utils.js';
import { create_build, find_deps, get_default_build_config, is_http_method } from './utils.js';
import { s } from '../../utils/misc.js';

/**
 * @param {{
 *   hooks: string;
 *   config: import('types').ValidatedConfig;
 *   has_service_worker: boolean;
 *   runtime: string;
 *   template: string;
 * }} opts
 */
const server_template = ({ config, hooks, has_service_worker, runtime, template }) => `
import root from '__GENERATED__/root.svelte';
import { respond } from '${runtime}/server/index.js';
import { set_paths, assets, base } from '${runtime}/paths.js';
import { set_prerendering } from '${runtime}/env.js';
import { set_private_env } from '${runtime}/env-private.js';
import { set_public_env } from '${runtime}/env-public.js';

const template = ({ head, body, assets, nonce }) => ${s(template)
	.replace('%sveltekit.head%', '" + head + "')
	.replace('%sveltekit.body%', '" + body + "')
	.replace(/%sveltekit\.assets%/g, '" + assets + "')
	.replace(/%sveltekit\.nonce%/g, '" + nonce + "')};

let read = null;

set_paths(${s(config.kit.paths)});

let default_protocol = 'https';

// allow paths to be globally overridden
// in svelte-kit preview and in prerendering
export function override(settings) {
	default_protocol = settings.protocol || default_protocol;
	set_paths(settings.paths);
	set_prerendering(settings.prerendering);
	read = settings.read;
}

export class Server {
	constructor(manifest) {
		this.options = {
			csp: ${s(config.kit.csp)},
			dev: false,
			get_stack: error => String(error), // for security
			handle_error: (error, event) => {
				this.options.hooks.handleError({
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
			hooks: null,
			hydrate: ${s(config.kit.browser.hydrate)},
			manifest,
			method_override: ${s(config.kit.methodOverride)},
			paths: { base, assets },
			prerender: {
				default: ${config.kit.prerender.default},
				enabled: ${config.kit.prerender.enabled}
			},
			public_env: {},
			read,
			root,
			service_worker: ${has_service_worker ? "base + '/service-worker.js'" : 'null'},
			router: ${s(config.kit.browser.router)},
			template,
			template_contains_nonce: ${template.includes('%sveltekit.nonce%')},
			trailing_slash: ${s(config.kit.trailingSlash)}
		};
	}

	/**
	 * Take care: Some adapters may have to call \`Server.init\` per-request to set env vars,
	 * so anything that shouldn't be rerun should be wrapped in an \`if\` block to make sure it hasn't
	 * been done already.
	 */
	async init({ env }) {
		const entries = Object.entries(env);

		const prv = Object.fromEntries(entries.filter(([k]) => !k.startsWith('${
			config.kit.env.publicPrefix
		}')));

		const pub = Object.fromEntries(entries.filter(([k]) => k.startsWith('${
			config.kit.env.publicPrefix
		}')));

		set_private_env(prv);
		set_public_env(pub);

		this.options.public_env = pub;

		if (!this.options.hooks) {
			const module = await import(${s(hooks)});
			this.options.hooks = {
				handle: module.handle || (({ event, resolve }) => resolve(event)),
				handleError: module.handleError || (({ error }) => console.error(error.stack)),
				externalFetch: module.externalFetch || fetch
			};
		}
	}

	async respond(request, options = {}) {
		if (!(request instanceof Request)) {
			throw new Error('The first argument to server.respond must be a Request object. See https://github.com/sveltejs/kit/pull/3384 for details');
		}

		return respond(request, this.options, options);
	}
}
`;

/**
 * @param {{
 *   cwd: string;
 *   config: import('types').ValidatedConfig;
 *   vite_config: import('vite').ResolvedConfig;
 *   vite_config_env: import('vite').ConfigEnv;
 *   manifest_data: import('types').ManifestData;
 *   build_dir: string;
 *   output_dir: string;
 *   service_worker_entry_file: string | null;
 * }} options
 * @param {{ vite_manifest: import('vite').Manifest, assets: import('rollup').OutputAsset[] }} client
 */
export async function build_server(options, client) {
	const {
		cwd,
		config,
		vite_config,
		vite_config_env,
		manifest_data,
		build_dir,
		output_dir,
		service_worker_entry_file
	} = options;

	let hooks_file = resolve_entry(config.kit.files.hooks);
	if (!hooks_file || !fs.existsSync(hooks_file)) {
		hooks_file = path.join(config.kit.outDir, 'build/hooks.js');
		fs.writeFileSync(hooks_file, '');
	}

	/** @type {Record<string, string>} */
	const input = {
		index: `${build_dir}/index.js`
	};

	// add entry points for every endpoint...
	manifest_data.routes.forEach((route) => {
		if (route.endpoint) {
			const resolved = path.resolve(cwd, route.endpoint.file);
			const relative = decodeURIComponent(path.relative(config.kit.files.routes, resolved));
			const name = posixify(path.join('entries/endpoints', relative.replace(/\.js$/, '')));
			input[name] = resolved;
		}
	});

	// ...and every component used by pages...
	manifest_data.nodes.forEach((node) => {
		for (const file of [node.component, node.shared, node.server]) {
			if (file) {
				const resolved = path.resolve(cwd, file);
				const relative = decodeURIComponent(path.relative(config.kit.files.routes, resolved));

				const name = relative.startsWith('..')
					? posixify(path.join('entries/fallbacks', path.basename(file)))
					: posixify(path.join('entries/pages', relative.replace(/\.js$/, '')));
				input[name] = resolved;
			}
		}
	});

	// ...and every matcher
	Object.entries(manifest_data.matchers).forEach(([key, file]) => {
		const name = posixify(path.join('entries/matchers', key));
		input[name] = path.resolve(cwd, file);
	});

	/** @type {(file: string) => string} */
	const app_relative = (file) => {
		const relative_file = path.relative(build_dir, path.resolve(cwd, file));
		return relative_file[0] === '.' ? relative_file : `./${relative_file}`;
	};

	fs.writeFileSync(
		input.index,
		server_template({
			config,
			hooks: app_relative(hooks_file),
			has_service_worker: config.kit.serviceWorker.register && !!service_worker_entry_file,
			runtime: posixify(path.relative(build_dir, runtime_directory)),
			template: load_template(cwd, config)
		})
	);

	const merged_config = merge_vite_configs(
		get_default_build_config({ config, input, ssr: true, outDir: `${output_dir}/server` }),
		await get_vite_config(vite_config, vite_config_env)
	);

	const { chunks } = await create_build(merged_config);

	/** @type {import('vite').Manifest} */
	const vite_manifest = JSON.parse(
		fs.readFileSync(`${output_dir}/server/${vite_config.build.manifest}`, 'utf-8')
	);

	mkdirp(`${output_dir}/server/nodes`);
	mkdirp(`${output_dir}/server/stylesheets`);

	const stylesheet_lookup = new Map();

	client.assets.forEach((asset) => {
		if (asset.fileName.endsWith('.css')) {
			if (asset.source.length < config.kit.inlineStyleThreshold) {
				const index = stylesheet_lookup.size;
				const file = `${output_dir}/server/stylesheets/${index}.js`;

				fs.writeFileSync(file, `// ${asset.fileName}\nexport default ${s(asset.source)};`);
				stylesheet_lookup.set(asset.fileName, index);
			}
		}
	});

	manifest_data.nodes.forEach((node, i) => {
		/** @type {string[]} */
		const imports = [];

		// String representation of
		/** @type {import('types').SSRNode} */
		/** @type {string[]} */
		const exports = [`export const index = ${i};`];

		/** @type {string[]} */
		const imported = [];

		/** @type {string[]} */
		const stylesheets = [];

		if (node.component) {
			const entry = find_deps(client.vite_manifest, node.component, true);

			imported.push(...entry.imports);
			stylesheets.push(...entry.stylesheets);

			exports.push(
				`export const component = async () => (await import('../${
					vite_manifest[node.component].file
				}')).default;`,
				`export const file = '${entry.file}';` // TODO what is this?
			);
		}

		if (node.shared) {
			const entry = find_deps(client.vite_manifest, node.shared, true);

			imported.push(...entry.imports);
			stylesheets.push(...entry.stylesheets);

			imports.push(`import * as shared from '../${vite_manifest[node.shared].file}';`);
			exports.push(`export { shared };`);
		}

		if (node.server) {
			imports.push(`import * as server from '../${vite_manifest[node.server].file}';`);
			exports.push(`export { server };`);
		}

		exports.push(
			`export const imports = ${s(imported)};`,
			`export const stylesheets = ${s(stylesheets)};`
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

		const out = `${output_dir}/server/nodes/${i}.js`;
		fs.writeFileSync(out, `${imports.join('\n')}\n\n${exports.join('\n')}\n`);
	});

	return {
		chunks,
		vite_manifest,
		methods: get_methods(cwd, chunks, manifest_data)
	};
}

/**
 * @param {string} cwd
 * @param {import('rollup').OutputChunk[]} output
 * @param {import('types').ManifestData} manifest_data
 */
function get_methods(cwd, output, manifest_data) {
	/** @type {Record<string, string[]>} */
	const lookup = {};
	output.forEach((chunk) => {
		if (!chunk.facadeModuleId) return;
		const id = chunk.facadeModuleId.slice(cwd.length + 1);
		lookup[id] = chunk.exports;
	});

	/** @type {Record<string, import('types').HttpMethod[]>} */
	const methods = {};
	manifest_data.routes.forEach((route) => {
		if (route.endpoint) {
			if (lookup[route.endpoint.file]) {
				methods[route.endpoint.file] = lookup[route.endpoint.file].filter(is_http_method);
			}
		}

		if (route.leaf?.server) {
			if (lookup[route.leaf.server]) {
				methods[route.leaf.server] = lookup[route.leaf.server].filter(is_http_method);
			}
		}
	});

	return methods;
}
