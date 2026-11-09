/** @import { CloudflareConfig } from '@cloudflare/vite-plugin' */
/** @import { EnvironmentOptions, ResolvedConfig } from 'vite' */
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
import { getRequest } from '@sveltejs/kit/node';
import { plugin_config } from './config.js';
import { plugin_platform } from './platform.js';
import {
	validate_worker_settings,
	generate_redirects,
	append_headers,
	is_dev_or_build,
	sync_process_env,
	forwarded_cf
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
	/** @type {EnvironmentOptions} */
	let ssr_environment = {};

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
			// with a custom Worker, the generated one becomes a module that it imports
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
				await bundle_custom_worker({
					config: vite_config,
					entrypoint: path.resolve(root, custom_entrypoint),
					environment: ssr_environment,
					out_dir: worker_dir,
					generated: `./${path.basename(generated_dest)}`
				});
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
						// a custom Worker can have named exports, such as Durable Objects
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

			const platform = plugin_platform(
				plugin_options,
				stub_import,
				() => custom_entrypoint !== undefined
			);

			return {
				customPreview: true,
				getRequest(options) {
					const request = getRequest(options);
					/** @type {import('@cloudflare/workers-types').Request} */ (
						/** @type {unknown} */ (request)
					).cf =
						forwarded_cf.get(options.request) ?? globalThis.__sveltekit_cloudflare_platform?.cf;
					return request;
				},
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
						set_ssr_environment: (environment) => (ssr_environment = environment),
						attach_platform: platform.attach,
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
								const env_dir =
									user_config.envDir === false
										? false
										: path.resolve(root, user_config.envDir ?? '.');
								sync_process_env(cloudflare_config.worker, env_dir, env.mode);
							}
						}
					},
					platform.plugin
				]
			};
		}
	};
}

/**
 * Bundles the custom Worker that `entrypoint` in `cloudflare.config.ts` points to, and
 * points its `@sveltejs/adapter-cloudflare/worker` import at the generated Worker
 * @param {{
 *   config: ResolvedConfig;
 *   entrypoint: string;
 *   environment: EnvironmentOptions;
 *   out_dir: string;
 *   generated: string;
 * }} options
 */
async function bundle_custom_worker({ config, entrypoint, environment, out_dir, generated }) {
	const { build } = await import('vite');

	const virtual_id = '\0virtual:@sveltejs/adapter-cloudflare/worker';
	// a bare import that we leave external and then point at the generated Worker
	const placeholder = `__sveltekit_cloudflare_worker_${crypto.randomUUID()}__`;

	await build({
		configFile: false,
		root: config.root,
		mode: config.mode,
		logLevel: 'warn',
		publicDir: false,
		resolve: { alias: config.resolve.alias },
		plugins: [
			{
				name: 'vite-plugin-sveltekit-adapter-cloudflare-worker',
				// runs before Vite resolves the import to the module that the Worker uses in development
				enforce: 'pre',
				resolveId: {
					filter: { id: exactRegex('@sveltejs/adapter-cloudflare/worker') },
					handler: () => virtual_id
				},
				load: {
					filter: { id: exactRegex(virtual_id) },
					handler: () =>
						`import worker from '${placeholder}';\n` +
						'export const fetch = (request, env, ctx) => worker.fetch(request, env, ctx);\n'
				}
			}
		],
		environments: {
			ssr: {
				define: environment.define,
				resolve: {
					conditions: environment.resolve?.conditions,
					builtins: environment.resolve?.builtins,
					noExternal: true,
					external: []
				},
				build: {
					target: environment.build?.target,
					rolldownOptions: {
						platform: environment.build?.rolldownOptions?.platform,
						external: [placeholder]
					}
				}
			}
		},
		build: {
			ssr: entrypoint,
			outDir: out_dir,
			emptyOutDir: false,
			copyPublicDir: false,
			minify: false,
			rolldownOptions: {
				output: {
					entryFileNames: 'index.js',
					codeSplitting: false
				}
			}
		}
	});

	const index = `${out_dir}/index.js`;
	fs.writeFileSync(index, fs.readFileSync(index, 'utf-8').replaceAll(placeholder, generated));
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
