import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { nodeFileTrace } from '@vercel/nft';
import esbuild from 'esbuild';

const DEFAULTS = {
	runtime: 'node18.x',
	regions: ['iad1'],
	memory: 128,
	maxDuration: 30 // TODO check what the defaults actually are
};

/** @type {import('.').default} **/
const plugin = function ({ external = [], edge, split, ...default_config } = {}) {
	return {
		name: '@sveltejs/adapter-vercel',

		async adapt(builder) {
			const node_version = get_node_version();

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
			 * @param {import('.').Config} config
			 * @param {typeof builder.routes} routes
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
					`nodejs${node_version.major}.x`, // TODO use function config
					config
				);
			}

			/**
			 * @param {string} name
			 * @param {import('.').Config} config
			 * @param {typeof builder.routes} routes
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
					external,
					sourcemap: 'linked',
					banner: { js: 'globalThis.global = globalThis;' }
				});

				write(
					`${dirs.functions}/${name}.func/.vc-config.json`,
					JSON.stringify({
						...config,
						envVarsInUse: [...envVarsInUse],
						entrypoint: 'index.js'
					})
				);
			}

			/** @type {Map<string, { i: number, config: import('.').Config, routes: typeof builder.routes }>} */
			const groups = new Map();

			/** @type {Map<string, { hash: string, route_id: string }>} */
			const conflicts = new Map();

			/** @type {Map<string, string>} */
			const functions = new Map();

			// group routes by config
			for (const route of builder.routes) {
				const pattern = route.pattern.toString();
				const config = { ...DEFAULTS, ...default_config, ...route.config };
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
				let group = groups.get(hash);
				if (!group) {
					group = { i: groups.size, config, routes: [] };
					groups.set(hash, group);
				}

				group.routes.push(route);
			}

			for (const group of groups.values()) {
				const generate_function =
					group.config.runtime === 'edge' ? generate_edge_function : generate_serverless_function;

				if (split) {
					// generate individual functions
					/** @type {Map<string, typeof builder.routes>} */
					const merged = new Map();

					for (const route of group.routes) {
						const pattern = route.pattern.toString();
						const existing = merged.get(pattern);
						if (existing) {
							existing.push(route);
						} else {
							merged.set(pattern, [route]);
						}
					}

					let i = 0;

					for (const [pattern, routes] of merged) {
						const name = `fn-${group.i}-${i++}`;
						functions.set(pattern, name);
						await generate_function(name, group.config, routes);
					}
				} else {
					// generate one function for the group
					const name = `fn-${group.i}`;
					await generate_function(name, group.config, group.routes);

					for (const route of group.routes) {
						functions.set(route.pattern.toString(), name);
					}
				}
			}

			for (const route of builder.routes) {
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

				src += '(?:/__data.json)?$';

				const name = functions.get(pattern);
				if (name) {
					static_config.routes.push({ src, dest: `/${name}` });
					functions.delete(pattern);
				}
			}

			builder.log.minor('Copying assets...');

			builder.writeClient(dirs.static);
			builder.writePrerendered(dirs.static);

			builder.log.minor('Writing routes...');

			write(`${dir}/config.json`, JSON.stringify(static_config, null, '  '));
		}
	};
};

/** @param {import('.').Config} config */
function hash_config(config) {
	return [config.runtime, config.regions, config.memory, config.maxDuration].join('/');
}

/**
 * @param {import('.').Config | undefined} config_a
 * @param {import('.').Config | undefined} config_b
 */
function can_group(config_a, config_b) {
	if (config_a === config_b) return true;
	if (!config_a || !config_b) return false;

	if (config_a.runtime !== config_b.runtime) return false;
	if (config_a.maxDuration !== config_b.maxDuration) return false;
	if (config_a.memory !== config_b.memory) return false;
	if (arrays_different(config_a.envVarsInUse, config_b.envVarsInUse)) return false;

	const regions_a = config_a.regions === 'all' ? ['all'] : config_a.regions;
	const regions_b = config_b.regions === 'all' ? ['all'] : config_b.regions;
	if (arrays_different(regions_a, regions_b)) return false;

	return true;
}

/**
 *
 * @param {any[] | undefined} a
 * @param {any[] | undefined} b
 * @returns
 */
function arrays_different(a, b) {
	if (a === b) return false;
	if (!a || !b) return true;
	if (a.length !== b.length) return true;
	return a.every((e) => b.includes(e));
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

function get_node_version() {
	const full = process.version.slice(1); // 'v16.5.0' --> '16.5.0'
	const major = parseInt(full.split('.')[0]); // '16.5.0' --> 16

	if (major < 16) {
		throw new Error(
			`SvelteKit only supports Node.js version 16 or greater (currently using v${full}). Consult the documentation: https://vercel.com/docs/runtimes#official-runtimes/node-js/node-js-version`
		);
	}

	return { major, full };
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
		if (path.endsWith('/') && path !== '/') {
			prerendered_redirects.push(
				{ src: path, dest: path.slice(0, -1) },
				{ src: path.slice(0, -1), status: 308, headers: { Location: path } }
			);

			overrides[page.file] = { path: path.slice(1, -1) };
		} else {
			overrides[page.file] = { path: path.slice(1) };
		}
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
 * @param {string} runtime
 * @param {import('.').Config | undefined} config
 */
async function create_function_bundle(builder, entry, dir, runtime, config) {
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

	// find common ancestor directory
	/** @type {string[]} */
	let common_parts = [];

	for (const file of traced.fileList) {
		if (common_parts) {
			const parts = file.split(path.sep);

			for (let i = 0; i < common_parts.length; i += 1) {
				if (parts[i] !== common_parts[i]) {
					common_parts = common_parts.slice(0, i);
					break;
				}
			}
		} else {
			common_parts = path.dirname(file).split(path.sep);
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
		JSON.stringify({
			runtime,
			...config,
			handler: path.relative(base + ancestor, entry),
			launcherType: 'Nodejs'
		})
	);

	write(`${dir}/package.json`, JSON.stringify({ type: 'module' }));
}

export default plugin;
