import { resolve } from 'node:path';

const files = resolve(import.meta.dirname, 'files');

/** @type {import('./index.js').default} */
export default function (opts = {}) {
	const { out = 'build', envPrefix = '', serverOptions = {}, compile = false } = opts;

	return {
		name: '@sveltejs/adapter-bun',
		async adapt(builder) {
			if (typeof Bun === 'undefined') {
				throw new Error(
					'adapter-bun requires running the SvelteKit build with Bun. Use `bun run --bun build`.'
				);
			}

			const tmp = builder.getBuildDirectory('adapter-bun');
			const base = builder.config.kit.paths.base;

			builder.rimraf(out);
			builder.rimraf(tmp);
			builder.mkdirp(tmp);
			builder.mkdirp(`${out}/client${base}`);
			builder.mkdirp(`${out}/prerendered${base}`);

			builder.log.minor('Copying assets');
			const client_files = with_base(builder.writeClient(`${out}/client${base}`), base);
			const prerendered_files = with_base(
				builder.writePrerendered(`${out}/prerendered${base}`),
				base
			);

			builder.log.minor(compile ? 'Compiling executable' : 'Building server');

			const pkg = await Bun.file('package.json').json();
			const server = builder.getServerDirectory();
			const entries = posixify(`${tmp}/entries`);
			builder.copy(files, entries);

			const dir_id = `${entries}/dir.js`;
			const manifest_file = `${server}/adapter-bun-manifest.js`;
			const routes_file = `${server}/adapter-bun-routes.js`;
			const server_options_file = `${server}/adapter-bun-options.js`;
			const instrumentation = builder.hasServerInstrumentationFile()
				? `${server}/instrumentation.server.js`
				: undefined;
			const virtual_files = {
				[manifest_file]: `export const manifest = ${builder.generateManifest({ relativePath: './' })};\n`,
				[server_options_file]: `export default ${serialize(serverOptions)};\n`
			};

			const compile_options = normalize_compile_options(compile, out);
			virtual_files[routes_file] = create_routes({
				out,
				client_files,
				prerendered_files,
				prerendered_paths: builder.prerendered.paths,
				app_path: builder.getAppPath(),
				dir_id,
				embed: compile_options !== undefined
			});
			const entrypoints = [`${entries}/index.js`, `${entries}/handler.js`, dir_id];
			/** @type {Omit<import('bun').BuildConfig, 'entrypoints'>} */
			let build_options = {
				outdir: out,
				sourcemap: 'linked',
				splitting: true,
				naming: {
					entry: '[name].[ext]',
					chunk: 'server/chunks/[name]-[hash].[ext]'
				},
				external: [
					'bun',
					'bun:*',
					...Object.keys(pkg.dependencies || {}).flatMap((dependency) => [
						dependency,
						`${dependency}/*`
					])
				]
			};

			if (compile_options) {
				const compile_file = `${out}/adapter-bun-compile.js`;
				virtual_files[compile_file] = create_compile_entrypoint(
					`${entries}/index.js`,
					instrumentation
				);
				entrypoints.splice(0, entrypoints.length, compile_file);
				build_options = compile_options;
			} else if (instrumentation) {
				entrypoints.push(instrumentation);
			}

			const adapter_plugin = {
				name: 'adapter-bun',
				/** @param {import('bun').PluginBuilder} build */
				setup(build) {
					build.onResolve({ filter: /^(SERVER|MANIFEST|ROUTES|SERVER_OPTIONS)$/ }, ({ path }) => {
						if (path === 'SERVER') return { path: `${server}/index.js` };
						if (path === 'MANIFEST') return { path: manifest_file };
						if (path === 'ROUTES') return { path: routes_file };
						if (path === 'SERVER_OPTIONS') return { path: server_options_file };
					});

					build.onLoad({ filter: /[\\/]adapter-bun[\\/]entries[\\/].*\.js$/ }, async ({ path }) => {
						const contents = (await Bun.file(path).text())
							.replace(/\bENV_PREFIX\b/g, JSON.stringify(envPrefix))
							.replace(
								/\bORIGIN\b/g,
								JSON.stringify(builder.config.kit.paths.origin) || 'undefined'
							);
						return { contents, loader: 'js' };
					});
				}
			};

			let result;
			try {
				result = await Bun.build({
					...build_options,
					target: 'bun',
					format: 'esm',
					conditions: merge_conditions(build_options.conditions),
					entrypoints,
					files: {
						...build_options.files,
						...virtual_files
					},
					plugins: [adapter_plugin, ...(build_options.plugins ?? [])]
				});
			} catch (error) {
				if (error instanceof AggregateError) {
					throw build_error(error.errors, error);
				}
				throw new Error('Bun server build failed', { cause: error });
			}

			if (!result.success) {
				throw build_error(result.logs);
			}

			if (instrumentation && !compile) {
				builder.instrument({
					entrypoint: `${out}/index.js`,
					instrumentation: `${out}/instrumentation.server.js`,
					module: {
						exports: ['hostname', 'port', 'server', 'unix']
					}
				});
			}
		},

		supports: {
			read: () => true,
			instrumentation: () => true
		}
	};
}

/**
 * @param {false | true | import('./index.js').CompileOptions} compile
 * @param {string} out
 * @returns {Omit<import('bun').BuildConfig, 'entrypoints'> | undefined}
 */
function normalize_compile_options(compile, out) {
	if (!compile) return;

	const outfile = `${out}/app`;
	if (compile === true) return { compile: { outfile } };

	const options = { ...compile };
	if (!options.compile) {
		throw new Error('adapter-bun compile options must enable Bun executable compilation');
	}

	if (options.outdir === undefined) {
		if (options.compile === true) {
			options.compile = { outfile };
		} else if (typeof options.compile === 'string') {
			options.compile = { target: options.compile, outfile };
		} else if (options.compile.outfile === undefined) {
			options.compile = { outfile, ...options.compile };
		}
	}

	return options;
}

/**
 * @param {string | string[] | undefined} configured
 * @returns {string[]}
 */
function merge_conditions(configured) {
	const conditions =
		configured === undefined ? [] : Array.isArray(configured) ? configured : [configured];
	return [...new Set(['bun', 'node', ...conditions])];
}

/**
 * @param {Array<{ message?: string }>} logs
 * @param {unknown} [cause]
 */
function build_error(logs, cause) {
	const details = logs
		.map((log) => log.message)
		.filter(Boolean)
		.join('\n');
	const message = details ? `Bun server build failed:\n${details}` : 'Bun server build failed';
	return new AggregateError(logs, message, { cause });
}

/**
 * @param {string[]} files
 * @param {string} base
 * @returns {string[]}
 */
function with_base(files, base) {
	const prefix = base.slice(1);
	return files.map((file) => posixify(prefix ? `${prefix}/${file}` : file));
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function serialize(value) {
	try {
		const serialized = JSON.stringify(value, (_key, item) => {
			if (typeof item === 'function' || typeof item === 'symbol' || typeof item === 'bigint') {
				throw new TypeError(`serverOptions must be JSON-serializable, received ${typeof item}`);
			}
			if (typeof item === 'number' && !Number.isFinite(item)) {
				throw new TypeError('serverOptions must contain only finite numbers');
			}
			return item;
		});
		if (serialized === undefined) {
			throw new TypeError('serverOptions must be a JSON-serializable object');
		}
		return serialized;
	} catch (error) {
		throw new Error('Could not serialize adapter-bun serverOptions', { cause: error });
	}
}

/**
 * @param {string} entrypoint
 * @param {string | undefined} instrumentation
 * @returns {string}
 */
function create_compile_entrypoint(entrypoint, instrumentation) {
	return [
		instrumentation && `await import(${JSON.stringify(instrumentation)});`,
		`await import(${JSON.stringify(entrypoint)});`
	]
		.filter(Boolean)
		.join('\n');
}

/**
 * @param {object} options
 * @param {string} options.out
 * @param {string[]} options.client_files
 * @param {string[]} options.prerendered_files
 * @param {string[]} options.prerendered_paths
 * @param {string} options.app_path
 * @param {string} options.dir_id
 * @param {boolean} options.embed
 * @returns {string}
 */
function create_routes({
	out,
	client_files,
	prerendered_files,
	prerendered_paths,
	app_path,
	dir_id,
	embed
}) {
	/** @type {Map<string, { asset: string; immutable: boolean } | { location: string }>} */
	const routes = new Map();
	const prerendered_file_set = new Set(prerendered_files);

	for (const file of client_files) {
		routes.set(encode_pathname(`/${file}`), {
			asset: `client/${file}`,
			immutable: file.startsWith(`${app_path}/immutable/`)
		});
	}

	for (const pathname of prerendered_paths) {
		const file = find_prerendered_file(pathname, prerendered_file_set);
		const route = encode_pathname(pathname);
		if (file && !routes.has(route)) {
			routes.set(route, { asset: `prerendered/${file}`, immutable: false });
		}
	}

	for (const pathname of prerendered_paths) {
		const inverted = pathname.endsWith('/') ? pathname.slice(0, -1) : `${pathname}/`;
		if (!inverted) continue;

		const route = encode_pathname(inverted);
		if (routes.has(route)) continue;
		routes.set(route, {
			location: relative_pathname(route, encode_pathname(pathname))
		});
	}

	const assets = [
		...client_files.map((file) => `client/${file}`),
		...prerendered_files.map((file) => `prerendered/${file}`)
	];
	const unique_assets = [...new Set(assets)];
	const identifiers = new Map(unique_assets.map((file, index) => [file, `asset_${index}`]));
	const imports = embed
		? unique_assets.map(
				(file, index) =>
					`import asset_${index} from ${JSON.stringify(posixify(resolve(out, file)))} with { type: 'file' };`
			)
		: [
				`import { join } from 'node:path';`,
				`import { dir } from ${JSON.stringify(posixify(dir_id))};`
			];
	const asset_entries = unique_assets.map(
		(file) => `[${JSON.stringify(file)}, ${identifiers.get(file)}]`
	);
	const asset_path = embed
		? [
				`const assets = new Map([${asset_entries.join(',')}]);`,
				`export const asset_path = (file) => assets.get(file);`
			]
		: [`export const asset_path = (file) => join(dir, file);`];
	const entries = [];

	for (const [route, value] of routes) {
		if ('asset' in value) {
			const identifier = identifiers.get(value.asset);
			const file = embed ? identifier : `asset_path(${JSON.stringify(value.asset)})`;
			const response = `Bun.file(${file})`;
			if (!embed && !value.immutable) {
				entries.push(`${JSON.stringify(route)}: ${response}`);
				continue;
			}

			/** @type {Record<string, string>} */
			const headers = {};
			if (embed) headers['content-type'] = Bun.file(value.asset).type;
			if (value.immutable) {
				headers['cache-control'] = 'public,max-age=31536000,immutable';
			}
			entries.push(
				`${JSON.stringify(route)}: new Response(${response}, { headers: ${JSON.stringify(headers)} })`
			);
			continue;
		}

		entries.push(
			`${JSON.stringify(route)}: Response.redirect(${JSON.stringify(value.location)}, 308)`
		);
	}

	return [...imports, ...asset_path, `export const routes = {${entries.join(',\n')}};`].join('\n');
}

/**
 * @param {string} pathname
 * @param {Set<string>} prerendered_files
 * @returns {string | undefined}
 */
function find_prerendered_file(pathname, prerendered_files) {
	const relative = pathname.slice(1);
	return (
		relative.endsWith('/')
			? [`${relative}index.html`]
			: [relative, `${relative}.html`, `${relative}/index.html`]
	).find((candidate) => prerendered_files.has(candidate));
}

/**
 * Relative reference from `from` to `to`, which must differ only by a trailing slash.
 * Keep in sync with the copy in `packages/kit/src/utils/url.js`.
 * @param {string} from
 * @param {string} to
 * @returns {string}
 */
function relative_pathname(from, to) {
	const segment = to.replace(/\/$/, '').split('/').at(-1);
	return from.endsWith('/') ? `../${segment}` : `${segment}/`;
}

/**
 * @param {string} pathname
 * @returns {string}
 */
function encode_pathname(pathname) {
	return pathname.split('/').map(encodeURIComponent).join('/');
}

/** @param {string} str */
function posixify(str) {
	return str.replace(/\\/g, '/');
}
