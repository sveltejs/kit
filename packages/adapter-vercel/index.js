import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nodeFileTrace } from '@vercel/nft';
import esbuild from 'esbuild';

const VALID_RUNTIMES = ['edge', 'nodejs16.x', 'nodejs18.x'];

const get_default_runtime = () => {
	const major = process.version.slice(1).split('.')[0];
	if (major === '16') return 'nodejs16.x';
	if (major === '18') return 'nodejs18.x';

	throw new Error(
		`Unsupported Node.js version: ${process.version}. Please use Node 16 or Node 18 to build your project, or explicitly specify a runtime in your adapter configuration.`
	);
};

/** @type {import('.').default} **/
const plugin = function (defaults = {}) {
	if ('edge' in defaults) {
		throw new Error("{ edge: true } has been removed in favour of { runtime: 'edge' }");
	}

	return {
		name: '@sveltejs/adapter-vercel',

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

			const files = fileURLToPath(new URL('./files', import.meta.url).href);

			const dirs = {
				static: `${dir}/static${builder.config.kit.paths.base}`,
				functions: `${dir}/functions`
			};

			const static_config = static_vercel_config(builder);

			builder.log.minor('Generating serverless function...');

			/**
			 * @param {string} name
			 * @param {import('.').ServerlessConfig} config
			 * @param {import('@sveltejs/kit').RouteDefinition<import('.').Config>[]} routes
			 */
			async function generate_serverless_function(name, config, routes) {
				const relativePath = path.posix.relative(tmp, builder.getServerDirectory());

				builder.copy(`${files}/serverless.js`, `${tmp}/index.js`, {
					replace: {
						SERVER: `${relativePath}/index.js`,
						MANIFEST: './manifest.js'
					}
				});

				write(
					`${tmp}/manifest.js`,
					`export const manifest = ${builder.generateManifest({ relativePath, routes })};\n`
				);

				await create_function_bundle(
					builder,
					`${tmp}/index.js`,
					`${dirs.functions}/${name}.func`,
					config
				);
			}

			/**
			 * @param {string} name
			 * @param {import('.').EdgeConfig} config
			 * @param {import('@sveltejs/kit').RouteDefinition<import('.').EdgeConfig>[]} routes
			 */
			async function generate_edge_function(name, config, routes) {
				const tmp = builder.getBuildDirectory(`vercel-tmp/${name}`);
				const relativePath = path.posix.relative(tmp, builder.getServerDirectory());

				const envVarsInUse = new Set();
				routes.forEach((route) => {
					route.config?.envVarsInUse?.forEach((x) => {
						envVarsInUse.add(x);
					});
				});

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

				await esbuild.build({
					entryPoints: [`${tmp}/edge.js`],
					outfile: `${dirs.functions}/${name}.func/index.js`,
					target: 'es2020', // TODO verify what the edge runtime supports
					bundle: true,
					platform: 'browser',
					format: 'esm',
					external: config.external,
					sourcemap: 'linked',
					banner: { js: 'globalThis.global = globalThis;' }
				});

				write(
					`${dirs.functions}/${name}.func/.vc-config.json`,
					JSON.stringify(
						{
							runtime: config.runtime,
							regions: config.regions,
							envVarsInUse: [...envVarsInUse],
							entrypoint: 'index.js'
						},
						null,
						'\t'
					)
				);
			}

			/** @type {Map<string, { i: number, config: import('.').Config, routes: import('@sveltejs/kit').RouteDefinition<import('.').Config>[] }>} */
			const groups = new Map();

			/** @type {Map<string, { hash: string, route_id: string }>} */
			const conflicts = new Map();

			/** @type {Map<string, string>} */
			const functions = new Map();

			/** @type {Map<import('@sveltejs/kit').RouteDefinition<import('.').Config>, { expiration: number | false, bypassToken: string | undefined, allowQuery: string[], group: number, passQuery: true }>} */
			const isr_config = new Map();

			// group routes by config
			for (const route of builder.routes) {
				if (route.prerender === true) continue;

				const pattern = route.pattern.toString();

				const runtime = route.config?.runtime ?? defaults?.runtime ?? get_default_runtime();
				if (runtime && !VALID_RUNTIMES.includes(runtime)) {
					throw new Error(
						`Invalid runtime '${runtime}' for route ${
							route.id
						}. Valid runtimes are ${VALID_RUNTIMES.join(', ')}`
					);
				}

				const config = { runtime, ...defaults, ...route.config };

				if (config.isr) {
					if (config.isr.allowQuery?.includes('__pathname')) {
						throw new Error('__pathname is a reserved query parameter for isr.allowQuery');
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

			const singular = groups.size === 1;

			for (const group of groups.values()) {
				const generate_function =
					group.config.runtime === 'edge' ? generate_edge_function : generate_serverless_function;

				// generate one function for the group
				const name = singular ? 'fn' : `fn-${group.i}`;

				await generate_function(
					name,
					/** @type {any} */ (group.config),
					/** @type {import('@sveltejs/kit').RouteDefinition<any>[]} */ (group.routes)
				);

				for (const route of group.routes) {
					functions.set(route.pattern.toString(), name);
				}
			}

			for (const route of builder.routes) {
				if (route.prerender === true) continue;

				const pattern = route.pattern.toString();

				let src = pattern
					// remove leading / and trailing $/
					.slice(1, -2)
					// replace escaped \/ with /
					.replace(/\\\//g, '/');

				// replace the root route "^/" with "^/?"
				if (src === '^/') {
					src = '^/?';
				}

				const name = functions.get(pattern) ?? 'fn-0';

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

					let i = 1;
					const pathname = route.segments
						.map((segment) => {
							return segment.dynamic ? `$${i++}` : segment.content;
						})
						.join('/');

					const json = JSON.stringify(isr, null, '\t');

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
				} else if (!singular) {
					static_config.routes.push({ src: src + '(?:/__data.json)?$', dest: `/${name}` });
				}
			}

			if (singular) {
				// Common case: One function for all routes
				// Needs to happen after ISR or else regex swallows all other matches
				static_config.routes.push({ src: '/.*', dest: `/fn` });
			}

			builder.log.minor('Copying assets...');

			builder.writeClient(dirs.static);
			builder.writePrerendered(dirs.static);

			builder.log.minor('Writing routes...');

			write(`${dir}/config.json`, JSON.stringify(static_config, null, '\t'));
		}
	};
};

/** @param {import('.').EdgeConfig & import('.').ServerlessConfig} config */
function hash_config(config) {
	return [
		config.runtime ?? '',
		config.external ?? '',
		config.regions ?? '',
		config.memory ?? '',
		config.maxDuration ?? ''
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
/** @param {import('@sveltejs/kit').Builder} builder */
function static_vercel_config(builder) {
	/** @type {any[]} */
	const prerendered_redirects = [];

	/** @type {Record<string, { path: string }>} */
	const overrides = {};

	for (const [src, redirect] of builder.prerendered.redirects) {
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

	return {
		version: 3,
		routes: [
			...prerendered_redirects,
			{
				src: `/${builder.getAppPath()}/immutable/.+`,
				headers: {
					'cache-control': 'public, immutable, max-age=31536000'
				}
			},
			{
				handle: 'filesystem'
			}
		],
		overrides
	};
}

/**
 * @param {import('@sveltejs/kit').Builder} builder
 * @param {string} entry
 * @param {string} dir
 * @param {import('.').ServerlessConfig} config
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
			'The following modules failed to locate dependencies that may (or may not) be required for your app to work:'
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
				experimentalResponseStreaming: !config.isr
			},
			null,
			'\t'
		)
	);

	write(`${dir}/package.json`, JSON.stringify({ type: 'module' }));
}

export default plugin;
