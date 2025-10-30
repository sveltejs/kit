/** @import { BuildOptions } from 'esbuild' */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { nodeFileTrace } from '@vercel/nft';
import esbuild from 'esbuild';
import { get_pathname, parse_isr_expiration, pattern_to_src, resolve_runtime } from './utils.js';
import { VERSION } from '@sveltejs/kit';

/**
 * @template T
 * @template {keyof T} K
 * @typedef {Partial<Omit<T, K>> & Required<Pick<T, K>>} PartialExcept
 */

/**
 * We use a custom `Builder` type here to support the minimum version of SvelteKit.
 * @typedef {PartialExcept<import('@sveltejs/kit').Builder, 'log' | 'rimraf' | 'mkdirp' | 'config' | 'prerendered' | 'routes' | 'createEntries' | 'findServerAssets' | 'generateFallback' | 'generateEnvModule' | 'generateManifest' | 'getBuildDirectory' | 'getClientDirectory' | 'getServerDirectory' | 'getAppPath' | 'writeClient' | 'writePrerendered' | 'writePrerendered' | 'writeServer' | 'copy' | 'compress'>} Builder2_4_0
 */

const name = '@sveltejs/adapter-vercel';
const INTERNAL = '![-]'; // this name is guaranteed not to conflict with user routes

const [kit_major, kit_minor] = VERSION.split('.');

// https://vercel.com/docs/functions/edge-functions/edge-runtime#compatible-node.js-modules
const compatible_node_modules = ['async_hooks', 'events', 'buffer', 'assert', 'util'];

/** @type {import('./index.js').default} **/
const plugin = function (defaults = {}) {
	if ('edge' in defaults) {
		throw new Error("{ edge: true } has been removed in favour of { runtime: 'edge' }");
	}

	return {
		name,
		/** @param {Builder2_4_0} builder */
		async adapt(builder) {
			if (!builder.routes) {
				throw new Error(
					'@sveltejs/adapter-vercel >=2.x (possibly installed through @sveltejs/adapter-auto) requires @sveltejs/kit version 1.5 or higher. ' +
						'Either downgrade the adapter or upgrade @sveltejs/kit'
				);
			}

			const dir = '.vercel/output';
			const tmp = builder.getBuildDirectory('vercel-tmp');

			builder.rimraf(dir);
			builder.rimraf(tmp);

			if (fs.existsSync('vercel.json')) {
				const vercel_file = fs.readFileSync('vercel.json', 'utf-8');
				const vercel_config = JSON.parse(vercel_file);
				validate_vercel_json(builder, vercel_config);
			}

			const files = fileURLToPath(new URL('./files', import.meta.url).href);

			const dirs = {
				static: `${dir}/static${builder.config.kit.paths.base}`,
				functions: `${dir}/functions`
			};

			builder.log.minor('Copying assets...');

			builder.writeClient(dirs.static);
			builder.writePrerendered(dirs.static);

			const static_config = static_vercel_config(builder, defaults, dirs.static);

			builder.log.minor('Generating serverless function...');

			/**
			 * @param {string} name
			 * @param {import('./index.js').ServerlessConfig} config
			 * @param {import('@sveltejs/kit').RouteDefinition<import('./index.js').Config>[]} routes
			 */
			async function generate_serverless_function(name, config, routes) {
				const dir = `${dirs.functions}/${name}.func`;

				const relativePath = path.posix.relative(tmp, builder.getServerDirectory());
				builder.copy(`${files}/serverless.js`, `${tmp}/index.js`, {
					replace: {
						SERVER: `${relativePath}/index.js`,
						MANIFEST: './manifest.js'
					}
				});
				if (builder.hasServerInstrumentationFile?.()) {
					builder.instrument?.({
						entrypoint: `${tmp}/index.js`,
						instrumentation: `${builder.getServerDirectory()}/instrumentation.server.js`
					});
				}

				write(
					`${tmp}/manifest.js`,
					`export const manifest = ${builder.generateManifest({ relativePath, routes })};\n`
				);

				await create_function_bundle(builder, `${tmp}/index.js`, dir, config);

				for (const asset of builder.findServerAssets(routes)) {
					// TODO use symlinks, once Build Output API supports doing so
					builder.copy(`${builder.getServerDirectory()}/${asset}`, `${dir}/${asset}`);
				}
			}

			let warned = false;

			/**
			 * @param {string} name
			 * @param {import('./index.js').EdgeConfig} config
			 * @param {import('@sveltejs/kit').RouteDefinition<import('./index.js').EdgeConfig>[]} routes
			 */
			async function generate_edge_function(name, config, routes) {
				if (!warned) {
					warned = true;
					builder.log.warn(
						`The \`runtime: 'edge'\` option is deprecated, and will be removed in a future version of adapter-vercel`
					);
				}

				const tmp = builder.getBuildDirectory(`vercel-tmp/${name}`);
				const relativePath = path.posix.relative(tmp, builder.getServerDirectory());

				builder.copy(`${files}/edge.js`, `${tmp}/edge.js`, {
					replace: {
						SERVER: `${relativePath}/index.js`,
						MANIFEST: './manifest.js'
					}
				});

				write(
					`${tmp}/manifest.js`,
					`export const manifest = ${builder.generateManifest({ relativePath, routes })};\n`
				);

				try {
					const outdir = `${dirs.functions}/${name}.func`;
					/** @type {BuildOptions} */
					const esbuild_config = {
						// minimum Node.js version supported is v14.6.0 that is mapped to ES2019
						// https://edge-runtime.vercel.app/features/polyfills
						// TODO verify the latest ES version the edge runtime supports
						target: 'es2020',
						bundle: true,
						platform: 'browser',
						conditions: [
							// Vercel's Edge runtime key https://runtime-keys.proposal.wintercg.org/#edge-light
							'edge-light',
							// re-include these since they are included by default when no conditions are specified
							// https://esbuild.github.io/api/#conditions
							'module'
						],
						format: 'esm',
						external: [
							...compatible_node_modules,
							...compatible_node_modules.map((id) => `node:${id}`),
							...(config.external || [])
						],
						sourcemap: 'linked',
						banner: { js: 'globalThis.global = globalThis;' },
						loader: {
							'.wasm': 'copy',
							'.woff': 'copy',
							'.woff2': 'copy',
							'.ttf': 'copy',
							'.eot': 'copy',
							'.otf': 'copy'
						}
					};
					const result = await esbuild.build({
						entryPoints: [`${tmp}/edge.js`],
						outfile: `${outdir}/index.js`,
						...esbuild_config
					});

					let instrumentation_result;
					if (builder.hasServerInstrumentationFile?.()) {
						instrumentation_result = await esbuild.build({
							entryPoints: [`${builder.getServerDirectory()}/instrumentation.server.js`],
							outfile: `${outdir}/instrumentation.server.js`,
							...esbuild_config
						});

						builder.instrument?.({
							entrypoint: `${outdir}/index.js`,
							instrumentation: `${outdir}/instrumentation.server.js`,
							module: {
								generateText: generate_traced_edge_module
							}
						});
					}

					const warnings = instrumentation_result
						? [...result.warnings, ...instrumentation_result.warnings]
						: result.warnings;

					if (warnings.length > 0) {
						const formatted = await esbuild.formatMessages(warnings, {
							kind: 'warning',
							color: true
						});

						console.error(formatted.join('\n'));
					}
				} catch (err) {
					const error = /** @type {import('esbuild').BuildFailure} */ (err);
					for (const e of error.errors) {
						for (const node of e.notes) {
							const match =
								/The package "(.+)" wasn't found on the file system but is built into node/.exec(
									node.text
								);

							if (match) {
								node.text = `Cannot use "${match[1]}" when deploying to Vercel Edge Functions.`;
							}
						}
					}

					const formatted = await esbuild.formatMessages(error.errors, {
						kind: 'error',
						color: true
					});

					console.error(formatted.join('\n'));

					throw new Error(
						`Bundling with esbuild failed with ${error.errors.length} ${
							error.errors.length === 1 ? 'error' : 'errors'
						}`
					);
				}

				write(
					`${dirs.functions}/${name}.func/.vc-config.json`,
					JSON.stringify(
						{
							runtime: config.runtime,
							regions: config.regions,
							entrypoint: 'index.js',
							framework: {
								slug: 'sveltekit',
								version: VERSION
							}
						},
						null,
						'\t'
					)
				);
			}

			/** @type {Map<string, { i: number, config: import('./index.js').Config, routes: import('@sveltejs/kit').RouteDefinition<import('./index.js').Config>[] }>} */
			const groups = new Map();

			/** @type {Map<string, { hash: string, route_id: string }>} */
			const conflicts = new Map();

			/** @type {Map<string, string>} */
			const functions = new Map();

			/** @type {Map<import('@sveltejs/kit').RouteDefinition<import('./index.js').Config>, { expiration: number | false, bypassToken: string | undefined, allowQuery: string[], group: number, passQuery: true }>} */
			const isr_config = new Map();

			/** @type {Set<string>} */
			const ignored_isr = new Set();

			// group routes by config
			for (const route of builder.routes) {
				const runtime = resolve_runtime(defaults.runtime, route.config.runtime);
				const config = { ...defaults, ...route.config, runtime };

				if (is_prerendered(route)) {
					if (config.isr) {
						ignored_isr.add(route.id);
					}
					continue;
				}

				if (config.isr) {
					const directory = path.relative('.', builder.config.kit.files.routes + route.id);

					if (runtime === 'edge') {
						throw new Error(
							`${directory}: Routes using \`isr\` must use a Node.js or Bun runtime (for example 'nodejs22.x' or 'experimental_bun1.x')`
						);
					}

					if (config.isr.allowQuery?.includes('__pathname')) {
						throw new Error(
							`${directory}: \`__pathname\` is a reserved query parameter for \`isr.allowQuery\``
						);
					}

					isr_config.set(route, {
						expiration: config.isr.expiration,
						bypassToken: config.isr.bypassToken,
						allowQuery: ['__pathname', ...(config.isr.allowQuery ?? [])],
						group: isr_config.size + 1,
						passQuery: true
					});
				}

				const hash = hash_config(config);

				// first, check there are no routes with incompatible configs that will be merged
				const pattern = route.pattern.toString();
				const existing = conflicts.get(pattern);
				if (existing) {
					if (existing.hash !== hash) {
						throw new Error(
							`The ${route.id} and ${existing.route_id} routes must be merged into a single function that matches the ${route.pattern} regex, but they have incompatible configs. You must either rename one of the routes, or make their configs match.`
						);
					}
				} else {
					conflicts.set(pattern, { hash, route_id: route.id });
				}

				// then, create a group for each config
				const id = config.split ? `${hash}-${groups.size}` : hash;
				let group = groups.get(id);
				if (!group) {
					group = { i: groups.size, config, routes: [] };
					groups.set(id, group);
				}

				group.routes.push(route);
			}

			if (ignored_isr.size) {
				builder.log.warn(
					'\nWarning: The following routes have an ISR config which is ignored because the route is prerendered:'
				);

				for (const ignored of ignored_isr) {
					console.log(`    - ${ignored}`);
				}

				console.log(
					'Either remove the "prerender" option from these routes to use ISR, or remove the ISR config.\n'
				);
			}

			const singular = groups.size === 1;

			for (const group of groups.values()) {
				const generate_function =
					group.config.runtime === 'edge' ? generate_edge_function : generate_serverless_function;

				// generate one function for the group
				const name = singular ? `${INTERNAL}/catchall` : `${INTERNAL}/${group.i}`;

				await generate_function(
					name,
					/** @type {any} */ (group.config),
					/** @type {import('@sveltejs/kit').RouteDefinition<any>[]} */ (group.routes)
				);

				for (const route of group.routes) {
					functions.set(route.pattern.toString(), name);
				}
			}

			if (!singular) {
				// we need to create a catch-all route so that 404s are handled
				// by SvelteKit rather than Vercel

				const runtime = resolve_runtime(defaults.runtime);
				const generate_function =
					runtime === 'edge' ? generate_edge_function : generate_serverless_function;

				await generate_function(
					`${INTERNAL}/catchall`,
					/** @type {any} */ ({ ...defaults, runtime }),
					[]
				);
			}

			for (const route of builder.routes) {
				if (is_prerendered(route)) continue;

				const pattern = route.pattern.toString();
				const src = pattern_to_src(pattern);
				const name = functions.get(pattern);

				const isr = isr_config.get(route);
				if (isr) {
					const isr_name = route.id.slice(1) || '__root__'; // should we check that __root__ isn't a route?
					const base = `${dirs.functions}/${isr_name}`;
					builder.mkdirp(base);

					const target = `${dirs.functions}/${name}.func`;
					const relative = path.relative(path.dirname(base), target);

					// create a symlink to the actual function, but use the
					// route name so that we can derive the correct URL
					fs.symlinkSync(relative, `${base}.func`);
					fs.symlinkSync(`../${relative}`, `${base}/__data.json.func`);

					const pathname = get_pathname(route);
					const json = JSON.stringify(
						{ ...isr, expiration: parse_isr_expiration(isr.expiration, route.id) },
						null,
						'\t'
					);

					write(`${base}.prerender-config.json`, json);
					write(`${base}/__data.json.prerender-config.json`, json);

					const q = `?__pathname=/${pathname}`;

					static_config.routes.push({
						src: src + '$',
						dest: `/${isr_name}${q}`
					});

					static_config.routes.push({
						src: src + '/__data.json$',
						dest: `/${isr_name}/__data.json${q}`
					});
				} else {
					// Create a symlink for each route to the main function for better observability
					// (without this, every request appears to go through `/![-]`)

					// Use 'index' for the root route's filesystem representation
					// Use an empty string ('') for the root route's destination name part in Vercel config
					const is_root = route.id === '/';
					const route_fs_name = is_root ? 'index' : route.id.slice(1);
					const route_dest_name = is_root ? '' : route.id.slice(1);

					// Define paths using path.join for safety
					const base_dir = path.join(dirs.functions, route_fs_name); // e.g., .vercel/output/functions/index
					// The main symlink should be named based on the route, adjacent to its potential directory
					const main_symlink_path = `${base_dir}.func`; // e.g., .vercel/output/functions/index.func
					// The data symlink goes inside the directory
					const data_symlink_path = path.join(base_dir, '__data.json.func'); // e.g., .vercel/output/functions/index/__data.json.func

					const target = path.join(dirs.functions, `${name}.func`); // The actual function directory e.g., .vercel/output/functions/![-].func

					// Ensure the directory for the data endpoint symlink exists (e.g., functions/index/)
					builder.mkdirp(base_dir);

					// Calculate relative paths FROM the directory containing the symlink TO the target
					const relative_for_main = path.relative(path.dirname(main_symlink_path), target);
					const relative_for_data = path.relative(path.dirname(data_symlink_path), target); // This is path.relative(base_dir, target)

					// Create symlinks
					fs.symlinkSync(relative_for_main, main_symlink_path); // Creates functions/index.func -> ![-].func
					fs.symlinkSync(relative_for_data, data_symlink_path); // Creates functions/index/__data.json.func -> ../![-].func

					// Add route to the config
					static_config.routes.push({
						src: src + '(?:/__data.json)?$', // Matches the incoming request path
						dest: `/${route_dest_name}` // Maps to the function: '/' for root, '/about' for about, etc.
						// Vercel uses this dest to find the corresponding .func dir/symlink
					});
				}
			}

			// optional chaining to support older versions that don't have this setting yet
			if (builder.config.kit.router?.resolution === 'server') {
				// Create a separate edge function just for server-side route resolution.
				// By omitting all routes we're ensuring it's small (the routes will still be available
				// to the route resolution, because it does not rely on the server routing manifest)
				await generate_edge_function(
					`${builder.config.kit.appDir}/route`,
					{
						external: 'external' in defaults ? defaults.external : undefined,
						runtime: 'edge'
					},
					[]
				);

				static_config.routes.push({
					src: `${builder.config.kit.paths.base}/(|.+/)__route\\.js`,
					dest: `${builder.config.kit.paths.base}/${builder.config.kit.appDir}/route`
				});
			}

			// Catch-all route must come at the end, otherwise it will swallow all other routes,
			// including ISR aliases if there is only one function
			static_config.routes.push({ src: '/.*', dest: `/${INTERNAL}/catchall` });

			builder.log.minor('Writing routes...');

			write(`${dir}/config.json`, JSON.stringify(static_config, null, '\t'));
		},

		supports: {
			read: ({ config, route }) => {
				const runtime = config.runtime ?? defaults.runtime;

				// TODO bump peer dep in next adapter major to simplify this
				if (runtime === 'edge' && kit_major === '2' && kit_minor < '25') {
					throw new Error(
						`${name}: Cannot use \`read\` from \`$app/server\` in route \`${route.id}\` configured with \`runtime: 'edge'\` and SvelteKit < 2.25.0`
					);
				}

				return true;
			},
			instrumentation: () => true
		}
	};
};

/** @param {import('./index.js').EdgeConfig & import('./index.js').ServerlessConfig} config */
function hash_config(config) {
	return [
		config.runtime ?? '',
		config.external ?? '',
		config.regions ?? '',
		config.memory ?? '',
		config.maxDuration ?? '',
		!!config.isr // need to distinguish ISR from non-ISR functions, because ISR functions can't use streaming mode
	].join('/');
}

/**
 * @param {string} file
 * @param {string} data
 */
function write(file, data) {
	try {
		fs.mkdirSync(path.dirname(file), { recursive: true });
	} catch {
		// do nothing
	}

	fs.writeFileSync(file, data);
}

// This function is duplicated in adapter-static
/**
 * @param {Builder2_4_0} builder
 * @param {import('./index.js').Config} config
 * @param {string} dir
 */
function static_vercel_config(builder, config, dir) {
	/** @type {any[]} */
	const prerendered_redirects = [];

	/** @type {Record<string, { path: string }>} */
	const overrides = {};

	/** @type {import('./index.js').ImagesConfig | undefined} */
	const images = config.images;

	for (let [src, redirect] of builder.prerendered.redirects) {
		if (src.replace(/\/$/, '') === redirect.location.replace(/\/$/, '')) {
			// ignore the extreme edge case of a `/foo` -> `/foo/` redirect,
			// which would only arise if the response was generated by a
			// `handle` hook or outside the app altogether (since you
			// can't declaratively create both routes)
		} else {
			// redirect both `/foo` and `/foo/` to `redirect.location`
			src = src.replace(/\/?$/, '/?');
		}

		prerendered_redirects.push({
			src,
			headers: {
				Location: redirect.location
			},
			status: redirect.status
		});
	}

	for (const [path, page] of builder.prerendered.pages) {
		let overrides_path = path.slice(1);

		if (path !== '/') {
			/** @type {string | undefined} */
			let counterpart_route = path + '/';

			if (path.endsWith('/')) {
				counterpart_route = path.slice(0, -1);
				overrides_path = path.slice(1, -1);
			}

			prerendered_redirects.push(
				{ src: path, dest: counterpart_route },
				{ src: counterpart_route, status: 308, headers: { Location: path } }
			);
		}

		overrides[page.file] = { path: overrides_path };
	}

	const routes = [
		...prerendered_redirects,
		{
			src: `/${builder.getAppPath()}/immutable/.+`,
			headers: {
				'cache-control': 'public, immutable, max-age=31536000'
			}
		}
	];

	// https://vercel.com/docs/deployments/skew-protection
	if (process.env.VERCEL_SKEW_PROTECTION_ENABLED) {
		routes.push({
			src: '/.*',
			has: [
				{
					type: 'header',
					key: 'Sec-Fetch-Dest',
					value: 'document'
				}
			],
			headers: {
				'Set-Cookie': `__vdpl=${process.env.VERCEL_DEPLOYMENT_ID}; Path=${builder.config.kit.paths.base}/; SameSite=Strict; Secure; HttpOnly`
			},
			continue: true
		});

		// this is a dreadful hack that is necessary until the Vercel Build Output API
		// allows you to set multiple cookies for a single route. essentially, since we
		// know that the entry file will be requested immediately, we can set the second
		// cookie in _that_ response rather than the document response
		const base = `${dir}/${builder.config.kit.appDir}/immutable/entry`;
		const entry = fs.readdirSync(base).find((file) => file.startsWith('start.'));

		if (!entry) {
			throw new Error('Could not find entry point');
		}

		routes.splice(-2, 0, {
			src: `/${builder.getAppPath()}/immutable/entry/${entry}`,
			headers: {
				'Set-Cookie': `__vdpl=; Path=/${builder.getAppPath()}/version.json; SameSite=Strict; Secure; HttpOnly`
			},
			continue: true
		});
	}

	routes.push({
		handle: 'filesystem'
	});

	return {
		version: 3,
		routes,
		overrides,
		images
	};
}

/**
 * @param {Builder2_4_0} builder
 * @param {string} entry
 * @param {string} dir
 * @param {import('./index.js').ServerlessConfig} config
 */
async function create_function_bundle(builder, entry, dir, config) {
	fs.rmSync(dir, { force: true, recursive: true });

	let base = entry;
	while (base !== (base = path.dirname(base)));

	const traced = await nodeFileTrace([entry], { base });

	/** @type {Map<string, string[]>} */
	const resolution_failures = new Map();

	traced.warnings.forEach((error) => {
		// pending https://github.com/vercel/nft/issues/284
		if (error.message.startsWith('Failed to resolve dependency node:')) return;

		// parse errors are likely not js and can safely be ignored,
		// such as this html file in "main" meant for nw instead of node:
		// https://github.com/vercel/nft/issues/311
		if (error.message.startsWith('Failed to parse')) return;

		if (error.message.startsWith('Failed to resolve dependency')) {
			const match = /Cannot find module '(.+?)' loaded from (.+)/;
			const [, module, importer] = match.exec(error.message) ?? [, error.message, '(unknown)'];

			if (!resolution_failures.has(importer)) {
				resolution_failures.set(importer, []);
			}

			/** @type {string[]} */ (resolution_failures.get(importer)).push(module);
		} else {
			throw error;
		}
	});

	if (resolution_failures.size > 0) {
		const cwd = process.cwd();
		builder.log.warn(
			'Warning: The following modules failed to locate dependencies that may (or may not) be required for your app to work:'
		);

		for (const [importer, modules] of resolution_failures) {
			console.error(`  ${path.relative(cwd, importer)}`);
			for (const module of modules) {
				console.error(`    - \u001B[1m\u001B[36m${module}\u001B[39m\u001B[22m`);
			}
		}
	}

	const files = Array.from(traced.fileList);

	// find common ancestor directory
	/** @type {string[]} */
	let common_parts = files[0]?.split(path.sep) ?? [];

	for (let i = 1; i < files.length; i += 1) {
		const file = files[i];
		const parts = file.split(path.sep);

		for (let j = 0; j < common_parts.length; j += 1) {
			if (parts[j] !== common_parts[j]) {
				common_parts = common_parts.slice(0, j);
				break;
			}
		}
	}

	const ancestor = base + common_parts.join(path.sep);

	for (const file of traced.fileList) {
		const source = base + file;
		const dest = path.join(dir, path.relative(ancestor, source));

		const stats = fs.statSync(source);
		const is_dir = stats.isDirectory();

		const realpath = fs.realpathSync(source);

		try {
			fs.mkdirSync(path.dirname(dest), { recursive: true });
		} catch {
			// do nothing
		}

		if (source !== realpath) {
			const realdest = path.join(dir, path.relative(ancestor, realpath));
			fs.symlinkSync(path.relative(path.dirname(dest), realdest), dest, is_dir ? 'dir' : 'file');
		} else if (!is_dir) {
			fs.copyFileSync(source, dest);
		}
	}

	write(
		`${dir}/.vc-config.json`,
		JSON.stringify(
			{
				runtime: config.runtime,
				regions: config.regions,
				memory: config.memory,
				maxDuration: config.maxDuration,
				handler: path.relative(base + ancestor, entry),
				launcherType: 'Nodejs',
				experimentalResponseStreaming: !config.isr,
				framework: {
					slug: 'sveltekit',
					version: VERSION
				}
			},
			null,
			'\t'
		)
	);

	write(`${dir}/package.json`, JSON.stringify({ type: 'module' }));
}

/**
 *
 * @param {Builder2_4_0} builder
 * @param {any} vercel_config
 */
function validate_vercel_json(builder, vercel_config) {
	if (builder.routes.length > 0 && !builder.routes[0].api) {
		// bail — we're on an older SvelteKit version that doesn't
		// populate `route.api.methods`, so we can't check
		// to see if cron paths are valid
		return;
	}

	const crons = /** @type {Array<unknown>} */ (
		Array.isArray(vercel_config?.crons) ? vercel_config.crons : []
	);

	/** For a route to be considered 'valid', it must be an API route with a GET handler */
	const valid_routes = builder.routes.filter((route) => route.api.methods.includes('GET'));

	/** @type {Array<string>} */
	const unmatched_paths = [];

	for (const cron of crons) {
		if (typeof cron !== 'object' || cron === null || !('path' in cron)) {
			continue;
		}

		const { path } = cron;
		if (typeof path !== 'string') {
			continue;
		}

		if (!valid_routes.some((route) => route.pattern.test(path))) {
			unmatched_paths.push(path);
		}
	}

	if (unmatched_paths.length) {
		builder.log.warn(
			'\nWarning: vercel.json defines cron tasks that use paths that do not correspond to an API route with a GET handler (ignore this if the request is handled in your `handle` hook):'
		);

		for (const path of unmatched_paths) {
			console.log(`    - ${path}`);
		}

		console.log('');
	}
}

/** @param {import('@sveltejs/kit').RouteDefinition} route */
function is_prerendered(route) {
	return (
		route.prerender === true ||
		(route.prerender === 'auto' && route.segments.every((segment) => !segment.dynamic))
	);
}

/**
 * @param {{ instrumentation: string; start: string }} opts
 */
function generate_traced_edge_module({ instrumentation, start }) {
	return `\
import './${instrumentation}';
const promise = import('./${start}');

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
export default async (req, res) => {
	const { default: handler } = await promise;
	return handler(req, res);
}
`;
}

export default plugin;
