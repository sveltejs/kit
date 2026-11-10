/** @import { CloudflareConfig } from '@cloudflare/vite-plugin' */
/** @import { ResolvedConfig } from 'vite' */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
	cleanBuildOutputDir,
	getWorkerAssetsDir,
	getWorkerBundleDir,
	writeRootConfig,
	writeWorkerConfig
} from '@cloudflare/build-output-utils';
import { exactRegex } from '@rolldown/pluginutils';
import { plugin_config } from './config.js';
import { plugin_workers_stub } from './platform.js';
import {
	validate_worker_settings,
	generate_redirects,
	append_headers,
	is_dev_or_build,
	sync_process_env
} from './utils.js';

const files = fileURLToPath(new URL('./files', import.meta.url));

/** @type {typeof import('./index.js').default} */
export default function (options = {}) {
	// Add a random query so we can reliably string-replace the stub
	const stub_import =
		import.meta.resolve('./src/virtual-cloudflare-workers.js') + '?' + crypto.randomUUID();

	/** @type {ResolvedConfig} */
	let vite_config;
	/** @type {CloudflareConfig} */
	let cloudflare_config;
	/** @type {string | undefined} */
	let custom_entrypoint;
	/** @type {import('./config.js').Forward | undefined} */
	let forward;
	// the bare import that the custom worker import of the adapter becomes in the build, which adapt
	// points at the generated worker
	const worker_placeholder = `__sveltekit_cloudflare_worker_${crypto.randomUUID()}__`;

	if (/** @type {Record<string, unknown>} */ (options).config !== undefined) {
		throw new Error(
			'The adapter `config` option has been removed. Please remove it from your adapter configuration'
		);
	}

	if (/** @type {Record<string, unknown>} */ (options).platformProxy !== undefined) {
		throw new Error(
			'The adapter `platformProxy` option has been removed. Use the `persistState` and `remoteBindings` options instead'
		);
	}

	/** @type {import('./index.js').PluginOptions} */
	const plugin_options = {
		persistState: options.persistState,
		remoteBindings: options.remoteBindings
	};

	return {
		name: '@sveltejs/adapter-cloudflare',
		async adapt(builder) {
			if (fs.existsSync(`${builder.config.files.assets}/_headers`)) {
				throw new Error(
					`The _headers file should be placed in the project root rather than the ${builder.config.files.assets} directory`
				);
			}

			if (fs.existsSync(`${builder.config.files.assets}/_redirects`)) {
				throw new Error(
					`The _redirects file should be placed in the project root rather than the ${builder.config.files.assets} directory`
				);
			}

			validate_worker_settings();

			const { worker } = cloudflare_config;
			const root = vite_config.root;

			await cleanBuildOutputDir(root);

			const assets = getWorkerAssetsDir(root);
			fs.mkdirSync(assets, { recursive: true });

			const worker_dir = getWorkerBundleDir(root);
			const worker_dest = `${worker_dir}/index.js`;
			const server_dir = `${worker_dir}/server`;
			builder.writeServer(server_dir);
			replace_stub(server_dir, stub_import);

			// client assets and prerendered pages
			const assets_dest = `${assets}${builder.config.paths.base}`;
			fs.mkdirSync(assets_dest, { recursive: true });
			if (worker.assets?.notFoundHandling === '404-page') {
				// generate plaintext 404.html first which can then be overridden by prerendering, if the user defined such a page.
				// This file is served when a request fails to match an asset.
				const fallback = path.join(assets_dest, '404.html');
				if (options.fallback === 'spa') {
					await builder.generateFallback(fallback);
				} else {
					fs.writeFileSync(fallback, 'Not Found');
				}
			}
			builder.writeClient(assets_dest);
			builder.writePrerendered(assets_dest);
			if (worker.assets?.notFoundHandling === 'single-page-application') {
				await builder.generateFallback(path.join(assets_dest, 'index.html'));
			}

			// worker
			// with a custom worker, the generated one becomes a module that it imports
			const generated_dest = custom_entrypoint ? `${worker_dir}/sveltekit.js` : worker_dest;
			builder.generateServerInstance(`${worker_dir}/server.js`, { serverDirectory: server_dir });
			builder.copy(`${files}/worker.js`, generated_dest, {
				replace: {
					// the paths might be Windows paths, so we need to convert them to POSIX paths
					// or else the backslashes will be interpreted as escape characters and create
					// an incorrect import path. We also need to ensure the relative imports start
					// with ./ so that they aren't resolved as package imports
					SERVER: `./${posixify(path.relative(path.dirname(generated_dest), worker_dir))}/server.js`,
					BASE_PATH: JSON.stringify(builder.config.paths.base),
					APP_PATH: JSON.stringify(builder.getAppPath()),
					MANIFEST_ASSETS: `new Set(${JSON.stringify(builder.manifest.assets.map((a) => a.path))})`,
					PRERENDERED: `new Set(${JSON.stringify(builder.prerendered.paths)})`,
					ASSETS_BINDING: get_assets_binding(worker)
				}
			});
			if (custom_entrypoint) {
				// the custom worker is an entry of the sveltekit server build, so they share modules
				replace_import(server_dir, worker_placeholder, generated_dest);
				const entry = `./${posixify(path.relative(worker_dir, server_dir))}/${CUSTOM_WORKER_ENTRY}.js`;
				fs.writeFileSync(
					worker_dest,
					`export * from '${entry}';\nexport { default } from '${entry}';\n`
				);
			}
			if (builder.hasServerInstrumentationFile()) {
				const initializer = builder.createInstrumentationInitializer({
					outputDirectory: worker_dir,
					serverDirectory: server_dir,
					environment: `import { env } from 'cloudflare:workers';\nexport default env;\n`
				});
				builder.instrument({
					entrypoint: worker_dest,
					instrumentation: `${server_dir}/instrumentation.server.js`,
					initializer,
					module: {
						// a custom worker can have named exports, such as durable objects
						generateText: ({ instrumentation, start, initializer }) =>
							`import './${initializer}';\nimport './${instrumentation}';\nexport * from './${start}';\nexport { default } from './${start}';\n`
					}
				});
			}

			// _headers
			const headers_src = '_headers';
			const headers_dest = `${assets}/_headers`;
			/** @type {string | undefined} */
			let headers;
			if (fs.existsSync(headers_src)) {
				headers = fs.readFileSync(headers_src, 'utf-8');
			}
			fs.writeFileSync(headers_dest, generate_headers(builder.getAppPath(), headers));

			// _redirects
			const redirects_src = '_redirects';
			const redirects_dest = `${assets}/_redirects`;
			if (fs.existsSync(redirects_src)) {
				fs.copyFileSync(redirects_src, redirects_dest);
			}
			const prerendered_redirects = generate_redirects(builder.prerendered.redirects, builder.log);
			if (prerendered_redirects) {
				fs.writeFileSync(redirects_dest, prerendered_redirects, { flag: 'a' });
			}

			await writeWorkerConfig({
				root,
				config: worker,
				manifest: {
					type: 'partial',
					mainModule: path.basename(worker_dest),
					modules: {}
				}
			});
			await writeRootConfig(
				root,
				{
					accountId: cloudflare_config.accountId,
					complianceRegion: cloudflare_config.complianceRegion
				},
				{ isPreview: process.env.CLOUDFLARE_PREVIEW_BUILD === 'true', mode: vite_config.mode }
			);
		},
		supports: {
			read: () => true,
			instrumentation: () => true
		},
		vite({ config }) {
			if (config.paths.assets) {
				throw new Error(
					'@sveltejs/adapter-cloudflare does not support paths.assets. Remove paths.assets from your SvelteKit configuration.'
				);
			}

			return {
				customPreview: true,
				// sveltekit renders requests in the dev worker in workerd
				respond: (request, { getClientAddress, resolve }) =>
					forward ? forward(request, getClientAddress) : resolve(request),
				plugins: [
					{
						name: 'vite-plugin-sveltekit-adapter-cloudflare-resolved-config',
						configResolved(config) {
							vite_config = config;
						}
					},
					...plugin_config({
						set_config: (config) => (cloudflare_config = config),
						set_custom_entrypoint: (entrypoint) => (custom_entrypoint = entrypoint),
						set_forward: (value) => (forward = value),
						scan_entries: get_scan_entries(config.files),
						plugin_options
					}),
					{
						name: 'vite-plugin-sveltekit-adapter-cloudflare-env',
						apply: is_dev_or_build,
						config: {
							// runs after the Cloudflare Vite plugin resolved `cloudflare.config.ts`
							// but before SvelteKit reads `process.env`
							order: 'post',
							handler(user_config, env) {
								const root = path.resolve(user_config.root ?? process.cwd());
								// like the Cloudflare Vite plugin, only read `.dev.vars` files when the Worker runs
								// locally, so that a build doesn't use local secrets
								const env_dir =
									env.command === 'build' || user_config.envDir === false
										? false
										: path.resolve(root, user_config.envDir ?? '.');
								sync_process_env(cloudflare_config.worker, env_dir, env.mode);
							}
						}
					},
					plugin_workers_stub(stub_import),
					plugin_custom_worker_build(() => custom_entrypoint, worker_placeholder)
				]
			};
		}
	};
}

/**
 * The files that import the app's server dependencies, so that Vite can find them before the first request
 * @param {{ src: string; routes: string; params: string; hooks: { server: string; universal: string } }} files
 * @returns {string[]}
 */
function get_scan_entries(files) {
	const directories = new Set([files.src, files.routes, files.params].map(posixify));
	return [
		...Array.from(directories, (directory) => `${directory}/**/*.{js,ts,svelte}`),
		`${posixify(files.hooks.server)}.{js,ts}`,
		`${posixify(files.hooks.universal)}.{js,ts}`
	];
}

/**
 * @param {string} app_dir
 * @param {string | undefined} content existing `_headers` file content
 * @returns {string}
 */
function generate_headers(app_dir, content = '') {
	content = append_headers(
		`/${app_dir}/*`,
		['X-Robots-Tag: noindex', 'Cache-Control: no-cache'],
		content
	);

	content = append_headers(
		`/${app_dir}/immutable/*`,
		['! Cache-Control', 'Cache-Control: public, immutable, max-age=31536000'],
		content
	);

	return content;
}

/**
 * @param {CloudflareConfig['worker']} worker
 * @returns {string}
 */
function get_assets_binding(worker) {
	const binding = Object.entries(worker.env ?? {}).find(([, value]) => value.type === 'assets');
	return binding?.[0] ?? 'ASSETS';
}

/** @param {string} str */
function posixify(str) {
	return str.replace(/\\/g, '/');
}

/**
 * @param {string} directory
 * @param {string} stub_import
 */
function replace_stub(directory, stub_import) {
	// Pad outside the string literal so that existing source-map columns stay valid.
	const padding = ' '.repeat(stub_import.length - 'cloudflare:workers'.length);
	// recurse, find stub_import, replace with "cloudflare:workers"
	const files = fs.readdirSync(directory);
	for (const file of files) {
		const file_path = path.join(directory, file);
		if (fs.statSync(file_path).isDirectory()) {
			replace_stub(file_path, stub_import);
		} else if (file.endsWith('.js')) {
			let contents = fs.readFileSync(file_path, 'utf8');
			if (contents.includes(stub_import)) {
				for (const quote of ['"', "'"]) {
					contents = contents.replaceAll(
						`${quote}${stub_import}${quote}`,
						`${quote}cloudflare:workers${quote}${padding}`
					);
				}
				fs.writeFileSync(file_path, contents);
			}
		}
	}
}

/** the name of the custom worker entry in the sveltekit server build */
const CUSTOM_WORKER_ENTRY = 'custom-worker';

const WORKER_VIRTUAL_ID = '\0virtual:@sveltejs/adapter-cloudflare/worker';

/**
 * builds the custom worker as an entry of the sveltekit server build, so modules both import are
 * bundled once, and points its import of the adapter at a placeholder that adapt replaces
 * @param {() => string | undefined} get_custom_entrypoint
 * @param {string} placeholder
 * @returns {import('vite').Plugin}
 */
function plugin_custom_worker_build(get_custom_entrypoint, placeholder) {
	let root = process.cwd();

	return {
		name: 'vite-plugin-sveltekit-adapter-cloudflare-custom-worker-build',
		apply: 'build',
		// runs before vite resolves the import to the module the worker uses in dev
		enforce: 'pre',
		config(user_config) {
			root = path.resolve(user_config.root ?? process.cwd());
		},
		configEnvironment: {
			order: 'post',
			handler(name, config) {
				const entrypoint = get_custom_entrypoint();
				if (name !== 'ssr' || !entrypoint) return;

				const input = config.build?.rolldownOptions?.input;
				if (!input || typeof input !== 'object' || Array.isArray(input)) {
					throw new Error(
						"Failed to find SvelteKit's server build inputs. This should not happen."
					);
				}
				input[CUSTOM_WORKER_ENTRY] = path.resolve(root, entrypoint);
			}
		},
		resolveId: {
			filter: { id: [exactRegex('@sveltejs/adapter-cloudflare/worker'), exactRegex(placeholder)] },
			handler(id) {
				if (!get_custom_entrypoint() || this.environment.name !== 'ssr') return;
				if (id === placeholder) return { id, external: true };
				return WORKER_VIRTUAL_ID;
			}
		},
		load: {
			filter: { id: exactRegex(WORKER_VIRTUAL_ID) },
			handler: () =>
				`import worker from '${placeholder}';\n` +
				'export const fetch = (request, env, ctx) => worker.fetch(request, env, ctx);\n'
		}
	};
}

/**
 * replaces a bare import with a relative import of target in the javascript files in directory
 * @param {string} directory
 * @param {string} specifier
 * @param {string} target
 */
function replace_import(directory, specifier, target) {
	for (const file of fs.readdirSync(directory)) {
		const file_path = path.join(directory, file);
		if (fs.statSync(file_path).isDirectory()) {
			replace_import(file_path, specifier, target);
		} else if (file.endsWith('.js')) {
			const contents = fs.readFileSync(file_path, 'utf8');
			if (!contents.includes(specifier)) continue;

			let relative = posixify(path.relative(path.dirname(file_path), target));
			if (!relative.startsWith('.')) relative = `./${relative}`;
			fs.writeFileSync(file_path, contents.replaceAll(specifier, relative));
		}
	}
}
