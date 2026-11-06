/** @import { CloudflareConfig } from '@cloudflare/vite-plugin' */
/** @import { IncomingMessage } from 'node:http' */
/** @import { Connect, EnvironmentOptions, Plugin, ResolvedConfig, ViteDevServer } from 'vite' */
import { fileURLToPath } from 'node:url';
import { cloudflare } from '@cloudflare/vite-plugin';
import { forwarded_cf, is_dev_or_build, validate_entrypoint } from './utils.js';

const worker_entry = fileURLToPath(new URL('./files/worker.js', import.meta.url));

/**
 * The Vite environment that runs a custom Worker in workerd during development
 */
export const custom_worker_environment = 'cloudflare';

// keep these in sync with `src/worker-dev.js`
const FORWARDED = 'x-sveltekit-cloudflare-forwarded';
const ORIGIN = 'x-sveltekit-cloudflare-origin';
const HOST = 'x-sveltekit-cloudflare-host';
const CF = 'x-sveltekit-cloudflare-cf';

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
 *   set_ssr_environment: (environment: EnvironmentOptions) => void;
 *   attach_platform: (url: string) => Promise<void>;
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
		viteEnvironment: { name: 'ssr' },
		config(config) {
			custom_entrypoint = validate_entrypoint(config.worker.entrypoint);
			hooks.set_custom_entrypoint(custom_entrypoint);

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
		...plugin_custom_worker(() => custom_entrypoint, hooks.attach_platform),
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

				hooks.set_ssr_environment(cloudflare_ssr);

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
								entries: ['src/**/*.{js,ts,svelte}'],
								include: [
									...(cloudflare_ssr.optimizeDeps?.include ?? []),
									'@sveltejs/kit > cookie',
									'@sveltejs/kit > devalue',
									'@sveltejs/kit > esm-env'
								]
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
 * Adds the `ASSETS` binding the generated Worker uses and the compatibility flags
 * SvelteKit needs, and points the Worker at `entrypoint`
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
 * Runs a custom Worker in workerd during development. Requests go to the Worker first,
 * and `fetch` from `@sveltejs/adapter-cloudflare/worker` sends them back to the Vite dev
 * server, which hands them to SvelteKit in Node
 * @param {() => string | undefined} get_custom_entrypoint
 * @param {(url: string) => Promise<void>} attach_platform
 * @returns {Plugin[]}
 */
function plugin_custom_worker(get_custom_entrypoint, attach_platform) {
	const enabled = () => get_custom_entrypoint() !== undefined;

	const plugins = cloudflare({
		viteEnvironment: { name: custom_worker_environment },
		config: (config) => customize(config, config.worker.entrypoint)
	});

	/** @type {Connect.NextHandleFunction | undefined} */
	let worker_handler;

	const gated_plugins = plugins.map((plugin) => {
		const gated = gate(plugin, enabled);

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
				// runs after SvelteKit writes the tsconfig.json that a TypeScript Worker extends
				order: 'post',
				async handler(server) {
					const post = await configure_server.call(this, server);
					if (!enabled()) return;

					return () => {
						// the plugin sends every request that Vite doesn't handle to the Worker, so we capture
						// its handler for our middleware, which runs before SvelteKit's
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
		...gated_plugins,
		{
			name: 'vite-plugin-sveltekit-adapter-cloudflare-custom-worker',
			apply: (_config, env) => env.command === 'serve' && !env.isPreview,
			configureServer(server) {
				if (!enabled()) return;

				return () => {
					server.middlewares.use((req, res, next) => {
						const origin = get_origin(server);

						if (req.headers[FORWARDED] === undefined) {
							req.headers[ORIGIN] = origin;
							if (worker_handler) return worker_handler(req, res, next);
							return next();
						}

						restore_forwarded_request(req);
						attach_platform(origin).then(() => next(), next);
					});
				};
			}
		}
	];
}

/**
 * The Cloudflare Vite plugin reads the resolved Vite config, but it also points the environments'
 * `build.outDir` at the build output, which the adapter writes itself, so we give it copies
 * of the environments to leave SvelteKit's output alone
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
 * Only runs the plugin's hooks in development when `enabled` returns true
 * @param {Plugin} plugin
 * @param {() => boolean} enabled
 * @returns {Plugin}
 */
function gate(plugin, enabled) {
	/** @type {Record<string, any>} */
	const gated = {
		...plugin,
		apply: (/** @type {unknown} */ _config, /** @type {import('vite').ConfigEnv} */ env) =>
			env.command === 'serve' && !env.isPreview
	};

	for (const [key, value] of Object.entries(plugin)) {
		if (key === 'apply') continue;

		if (typeof value === 'function') {
			gated[key] = /** @this {unknown} */ function (/** @type {unknown[]} */ ...args) {
				return enabled() ? value.apply(this, args) : undefined;
			};
		} else if (value && typeof value === 'object' && typeof value.handler === 'function') {
			const original = value.handler;
			gated[key] = {
				...value,
				/** @this {unknown} */
				handler(/** @type {unknown[]} */ ...args) {
					return enabled() ? original.apply(this, args) : undefined;
				}
			};
		}
	}

	return /** @type {Plugin} */ (gated);
}

/**
 * The address of the Vite dev server, which a Worker in workerd can reach
 * @param {ViteDevServer} server
 * @returns {string}
 */
function get_origin(server) {
	const address = server.httpServer?.address();
	const protocol = server.config.server.https ? 'https' : 'http';

	if (address === null || address === undefined || typeof address === 'string') {
		return `${protocol}://localhost:${server.config.server.port}`;
	}

	let host = address.address;
	if (host === '0.0.0.0') host = '127.0.0.1';
	if (host === '::') host = '::1';
	if (host.includes(':')) host = `[${host}]`;

	return `${protocol}://${host}:${address.port}`;
}

/**
 * Restores the host and `cf` properties that the Worker's request had before
 * `fetch` from `@sveltejs/adapter-cloudflare/worker` forwarded it
 * @param {IncomingMessage} req
 */
function restore_forwarded_request(req) {
	const host = req.headers[HOST];
	if (typeof host === 'string') req.headers.host = host;

	const cf = req.headers[CF];
	if (typeof cf === 'string') {
		try {
			forwarded_cf.set(req, JSON.parse(cf));
		} catch {
			// ignore an invalid header
		}
	}

	delete req.headers[FORWARDED];
	delete req.headers[HOST];
	delete req.headers[CF];
}
