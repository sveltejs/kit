/** @import { CloudflareConfig } from '@cloudflare/vite-plugin' */
/** @import { AddressInfo } from 'node:net' */
/** @import { Connect, Plugin, ResolvedConfig } from 'vite' */
/** @import { PluginOptions } from './index.js' */
import crypto from 'node:crypto';
import http from 'node:http';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { cloudflare } from '@cloudflare/vite-plugin';
import { is_dev_or_build, validate_entrypoint } from './utils.js';

const worker_entry = fileURLToPath(new URL('./files/worker.js', import.meta.url));

/** the worker that runs sveltekit during dev when the app has no custom worker */
const dev_worker_entry = fileURLToPath(new URL('./src/worker-dev.js', import.meta.url));

/** the vite environment that runs the worker in workerd during dev */
export const worker_environment = 'cloudflare';

/**
 * stops the dependency scan following imports into generated modules, which only exist in the dev
 * server module graph
 * @type {import('vite').Rolldown.Plugin}
 */
const scan_kit_modules = {
	name: 'vite-plugin-sveltekit-adapter-cloudflare-scan-kit-modules',
	resolveId: {
		filter: { id: /^(\$(app|env)\/|<sveltekit:generated>)/ },
		handler: (id) => ({ id, external: true })
	}
};

const useful_cloudflare_plugins = new Set([
	// resolves the plugin config that the other plugins read
	'vite-plugin-cloudflare',
	// alias Node.js builtins to the polyfills workerd uses and leave the rest as imports
	'vite-plugin-cloudflare:nodejs-als',
	'vite-plugin-cloudflare:nodejs-compat',
	'vite-plugin-cloudflare:nodejs-compat-warnings'
]);

const useful_cloudflare_build_plugins = new Set([
	'vite-plugin-cloudflare:wasm-helper',
	'vite-plugin-cloudflare:additional-modules'
]);

/**
 * @typedef {{
 *   set_config: (config: CloudflareConfig) => void;
 *   set_custom_entrypoint: (entrypoint: string | undefined) => void;
 *   set_forward: (forward: Forward | undefined) => void;
 *   scan_entries?: string[];
 *   plugin_options?: PluginOptions;
 * }} ConfigHooks
 */

/**
 * @param {ConfigHooks} hooks
 * @returns {Plugin[]}
 */
export function plugin_config(hooks) {
	/** @type {string | undefined} */
	let custom_entrypoint;

	const cloudflare_plugins = cloudflare({
		...hooks.plugin_options,
		viteEnvironment: { name: 'ssr' },
		config(config) {
			custom_entrypoint = validate_entrypoint(config.worker.entrypoint);
			hooks.set_custom_entrypoint(custom_entrypoint);

			if (config.worker.assets?.basePath !== undefined) {
				// the adapter already writes assets under `paths.base`, so Cloudflare stripping
				// `basePath` before looking them up would make every asset request miss
				throw new Error(
					'Remove `assets.basePath` from cloudflare.config.ts and set `paths.base` in your SvelteKit config instead'
				);
			}

			// the plugin needs an entrypoint for the Worker environment. Ours stands in
			// for the build-generated entry that the adapter writes after the build
			const customized = customize(config, worker_entry);
			hooks.set_config(customized);
			return customized;
		}
	});

	const cloudflare_config_plugin = cloudflare_plugins.find(
		(plugin) => plugin.name === 'vite-plugin-cloudflare:config'
	);
	const cloudflare_config_hook = cloudflare_config_plugin?.config;
	const cloudflare_config_resolved_hook = cloudflare_config_plugin?.configResolved;

	if (typeof cloudflare_config_hook !== 'function') {
		throw new Error(
			"Failed to find the vite-plugin-cloudflare:config plugin's config hook. This should not happen."
		);
	}

	return [
		...cloudflare_plugins.map(
			(plugin) =>
				/** @satisfies {Plugin} */ ({
					...plugin,
					apply: (_config, env) =>
						env.isPreview === true ||
						useful_cloudflare_plugins.has(plugin.name) ||
						(env.command === 'build' && useful_cloudflare_build_plugins.has(plugin.name))
				})
		),
		...plugin_worker_dev(
			() => custom_entrypoint,
			hooks.set_forward,
			hooks.plugin_options,
			hooks.scan_entries
		),
		{
			name: 'vite-plugin-sveltekit-adapter-cloudflare-environment',
			apply: is_dev_or_build,
			async config(user_config, env) {
				const cloudflare_ssr = (await cloudflare_config_hook.call(this, user_config, env))
					?.environments?.ssr;

				if (cloudflare_ssr === undefined) {
					throw new Error(
						'Failed to get the SSR environment config from @cloudflare/vite-plugin. This should not happen.'
					);
				}

				return {
					environments: {
						ssr: {
							keepProcessEnv: cloudflare_ssr.keepProcessEnv,
							define: cloudflare_ssr.define,
							resolve: {
								noExternal: cloudflare_ssr.resolve?.noExternal,
								// `browser` would resolve `esm-env` to `BROWSER = true` and similar
								conditions: cloudflare_ssr.resolve?.conditions?.filter(
									(condition) => condition !== 'browser'
								),
								// we resolve `cloudflare:workers` to a stub that runs in Node
								builtins: cloudflare_ssr.resolve?.builtins?.filter(
									(id) => id !== 'cloudflare:workers'
								)
							},
							optimizeDeps: {
								...cloudflare_ssr.optimizeDeps,
								// the plugin's entry is our stand-in entrypoint, so we scan the app instead.
								// Otherwise, dependencies found during the first request reload the module
								// graph and fail that request
								entries: hooks.scan_entries,
								include: [
									...(cloudflare_ssr.optimizeDeps?.include ?? []),
									'@sveltejs/kit > cookie',
									'@sveltejs/kit > devalue',
									'@sveltejs/kit > esm-env'
								],
								rolldownOptions: {
									...cloudflare_ssr.optimizeDeps?.rolldownOptions,
									plugins: [cloudflare_ssr.optimizeDeps?.rolldownOptions?.plugins, scan_kit_modules]
								}
							},
							build: {
								target: cloudflare_ssr.build?.target,
								rolldownOptions: {
									platform: cloudflare_ssr.build?.rolldownOptions?.platform,
									resolve: cloudflare_ssr.build?.rolldownOptions?.resolve
								}
							}
						}
					}
				};
			}
		},
		{
			name: 'vite-plugin-sveltekit-adapter-cloudflare-config',
			apply: is_dev_or_build,
			configEnvironment: {
				order: 'post',
				handler(name, config) {
					if (name !== 'ssr') return;

					// Cloudflare's Vite plugin doesn't allow external SSR deps
					config.resolve ??= {};
					config.resolve.external = [];
				}
			},
			configResolved(config) {
				if (typeof cloudflare_config_resolved_hook !== 'function') return;

				// the other Cloudflare plugins read the resolved Vite config from this hook
				return cloudflare_config_resolved_hook.call(this, with_copied_environments(config));
			}
		}
	];
}

/**
 * adds the assets binding and compatibility flags the worker needs, and points it at entrypoint
 * @param {CloudflareConfig} config
 * @param {string | undefined} entrypoint
 * @returns {CloudflareConfig}
 */
function customize(config, entrypoint) {
	const env = { ...config.worker.env };
	if (!Object.values(env).some((binding) => binding.type === 'assets')) {
		env.ASSETS = { type: 'assets' };
	}

	return {
		...config,
		worker: {
			...config.worker,
			entrypoint,
			// Svelte and SvelteKit use `node:async_hooks`
			compatibilityFlags: [...new Set([...(config.worker.compatibilityFlags ?? []), 'nodejs_als'])],
			env
		}
	};
}

/**
 * @typedef {(request: Request, getClientAddress: () => string) => Promise<Response>} Forward
 */

/**
 * runs sveltekit in workerd during dev, in the custom worker or a worker of our own, which renders
 * the requests sveltekit hands it with @sveltejs/kit/adapter/dev
 * @param {() => string | undefined} get_custom_entrypoint
 * @param {(forward: Forward | undefined) => void} set_forward
 * @param {PluginOptions} [plugin_options]
 * @param {string[]} [scan_entries] the files Vite scans for the app's dependencies
 * @returns {Plugin[]}
 */
function plugin_worker_dev(
	get_custom_entrypoint,
	set_forward,
	plugin_options = {},
	scan_entries = []
) {
	const plugins = cloudflare({
		...plugin_options,
		viteEnvironment: { name: worker_environment },
		config: (config) => customize(config, config.worker.entrypoint ?? dev_worker_entry)
	});

	/** @type {Connect.NextHandleFunction | undefined} */
	let worker_handler;

	const dev_plugins = plugins.map((plugin) => {
		const gated = only_in_dev(plugin);

		if (plugin.name === 'vite-plugin-cloudflare:config') {
			const config_resolved = gated.configResolved;
			if (typeof config_resolved !== 'function') return gated;

			return /** @satisfies {Plugin} */ ({
				...gated,
				configResolved(config) {
					return config_resolved.call(this, with_copied_environments(config));
				}
			});
		}

		if (plugin.name !== 'vite-plugin-cloudflare:dev') return gated;

		const configure_server = gated.configureServer;
		if (typeof configure_server !== 'function') {
			throw new Error(
				"Failed to find the vite-plugin-cloudflare:dev plugin's configureServer hook. This should not happen."
			);
		}

		return /** @satisfies {Plugin} */ ({
			...gated,
			configureServer: {
				// runs after sveltekit writes the generated modules that the worker imports
				order: 'post',
				async handler(server) {
					const post = await configure_server.call(this, server);

					return () => {
						// capture the handler that sends requests to the worker, so sveltekit can serve files first
						const use = server.middlewares.use;
						server.middlewares.use = /** @type {typeof use} */ (
							/** @param {Connect.NextHandleFunction} fn */
							(fn) => {
								worker_handler = fn;
								return server.middlewares;
							}
						);
						try {
							if (typeof post === 'function') post();
						} finally {
							server.middlewares.use = use;
						}
					};
				}
			}
		});
	});

	return [
		...dev_plugins,
		{
			name: 'vite-plugin-sveltekit-adapter-cloudflare-worker-dev',
			apply: (_config, env) => env.command === 'serve' && !env.isPreview,
			configEnvironment: {
				order: 'post',
				handler(name, config) {
					if (name !== worker_environment) return;

					// like the ssr environment, scan the app rather than only the worker and leave sveltekit as is
					const custom_entrypoint = get_custom_entrypoint();
					config.optimizeDeps ??= {};
					config.optimizeDeps.entries = custom_entrypoint
						? [custom_entrypoint, ...scan_entries]
						: scan_entries;
					config.optimizeDeps.exclude = [
						...(config.optimizeDeps.exclude ?? []),
						'@sveltejs/kit',
						'@sveltejs/adapter-cloudflare',
						// an optional esm dependency of sveltekit, loaded as is so it is not prebundled on the first request
						'@opentelemetry/api'
					];
					config.optimizeDeps.include = [
						...(config.optimizeDeps.include ?? []),
						'@sveltejs/kit > cookie',
						'@sveltejs/kit > devalue',
						'@sveltejs/kit > esm-env'
					];
					config.optimizeDeps.rolldownOptions ??= {};
					config.optimizeDeps.rolldownOptions.plugins = [
						config.optimizeDeps.rolldownOptions.plugins,
						scan_kit_modules
					];
				}
			},
			configureServer(server) {
				/** @type {ReturnType<typeof create_forwarder> | undefined} */
				let forwarder;

				// the handler is captured after this hook runs, so it is looked up on the first request
				set_forward((request, getClientAddress) => {
					if (!worker_handler) {
						throw new Error(
							"Failed to capture the vite-plugin-cloudflare:dev plugin's request handler. This should not happen."
						);
					}

					forwarder ??= create_forwarder(worker_handler);
					return forwarder.forward(request, getClientAddress);
				});

				server.httpServer?.once('close', () => {
					set_forward(undefined);
					forwarder?.close();
				});
			}
		}
	];
}

/**
 * gives the cloudflare plugin copies of the environments, since it changes their build.outDir
 * @param {ResolvedConfig} config
 * @returns {ResolvedConfig}
 */
function with_copied_environments(config) {
	return {
		...config,
		environments: Object.fromEntries(
			Object.entries(config.environments).map(([name, environment]) => [
				name,
				{ ...environment, build: { ...environment.build } }
			])
		)
	};
}

/**
 * applies the plugin only in dev
 * @param {Plugin} plugin
 * @returns {Plugin}
 */
function only_in_dev(plugin) {
	return {
		...plugin,
		apply: (_config, env) => env.command === 'serve' && !env.isPreview
	};
}

/**
 * sends requests to the request handler of the cloudflare plugin, which only takes node requests,
 * through a local http server
 * TODO use dispatchFetch if the plugin implements FetchableDevEnvironment
 * @param {Connect.NextHandleFunction} handler
 * @returns {{ forward: Forward; close: () => void }}
 */
function create_forwarder(handler) {
	// other local clients can reach the listener, including pages that use dns rebinding, so it only
	// takes requests that carry this
	const token = crypto.randomBytes(32).toString('hex');

	const server = http.createServer((req, res) => {
		if (!has_token(req, token)) {
			res.statusCode = 403;
			res.end();
			return;
		}

		handler(req, res, (/** @type {unknown} */ error) => {
			res.statusCode = error ? 500 : 404;
			res.end(error instanceof Error ? (error.stack ?? error.message) : 'Not Found');
		});
	});

	/** @type {Promise<number> | undefined} */
	let port;

	const listen = () =>
		(port ??= new Promise((fulfil, reject) => {
			server.once('error', reject);
			server.listen(0, '127.0.0.1', () =>
				fulfil(/** @type {AddressInfo} */ (server.address()).port)
			);
		}));

	return {
		async forward(request, getClientAddress) {
			const url = new URL(request.url);

			/** @type {Record<string, string>} */
			const headers = Object.fromEntries(request.headers);
			// the plugin builds the request url of the worker from these
			headers.host = url.host;
			headers['x-forwarded-proto'] = url.protocol.slice(0, -1);
			headers['cf-connecting-ip'] = getClientAddress();
			headers[TOKEN_HEADER] = token;

			const options = {
				host: '127.0.0.1',
				port: await listen(),
				method: request.method,
				path: url.pathname + url.search,
				headers,
				setHost: false
			};

			return new Promise((fulfil, reject) => {
				const outgoing = http.request(options, (incoming) => {
					const response_headers = new Headers();
					for (let i = 0; i < incoming.rawHeaders.length; i += 2) {
						response_headers.append(incoming.rawHeaders[i], incoming.rawHeaders[i + 1]);
					}

					// these only apply to the connection to the local server
					for (const name of ['connection', 'keep-alive', 'transfer-encoding']) {
						response_headers.delete(name);
					}

					const status = incoming.statusCode ?? 500;
					const has_body = request.method !== 'HEAD' && ![101, 204, 205, 304].includes(status);

					fulfil(
						new Response(
							has_body ? /** @type {ReadableStream} */ (Readable.toWeb(incoming)) : null,
							{ status, statusText: incoming.statusMessage, headers: response_headers }
						)
					);
				});

				outgoing.once('error', reject);

				if (request.body) {
					Readable.fromWeb(/** @type {any} */ (request.body)).pipe(outgoing);
				} else {
					outgoing.end();
				}
			});
		},
		close: () => server.close()
	};
}

const TOKEN_HEADER = 'x-sveltekit-forward-token';

/**
 * checks the token in constant time and removes it, so the worker does not see it
 * @param {import('node:http').IncomingMessage} req
 * @param {string} token
 * @returns {boolean}
 */
function has_token(req, token) {
	const value = req.headers[TOKEN_HEADER];
	delete req.headers[TOKEN_HEADER];

	for (let i = req.rawHeaders.length - 2; i >= 0; i -= 2) {
		if (req.rawHeaders[i].toLowerCase() === TOKEN_HEADER) req.rawHeaders.splice(i, 2);
	}

	if (typeof value !== 'string' || value.length !== token.length) return false;
	return crypto.timingSafeEqual(Buffer.from(value), Buffer.from(token));
}
