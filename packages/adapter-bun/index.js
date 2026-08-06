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
			const server_options_file = `${server}/adapter-bun-options.js`;
			const instrumentation = builder.hasServerInstrumentationFile()
				? `${server}/instrumentation.server.js`
				: undefined;
			const virtual_files = {
				[manifest_file]: [
					`export const manifest = ${builder.generateManifest({ relativePath: './' })};`,
					`export const client_files = new Set(${JSON.stringify(client_files)});`,
					`export const prerendered_files = new Set(${JSON.stringify(prerendered_files)});`,
					`export const prerendered_paths = new Set(${JSON.stringify(builder.prerendered.paths)});`
				].join('\n\n'),
				[server_options_file]: `export default ${serialize(serverOptions)};\n`
			};

			const compile_options = normalize_compile_options(compile, out);
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
				const assets = [
					...client_files.map((file) => `client/${file}`),
					...prerendered_files.map((file) => `prerendered/${file}`)
				];
				const compile_file = `${out}/adapter-bun-compile.js`;
				virtual_files[compile_file] = await create_compile_entrypoint(
					out,
					assets,
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
					build.onResolve({ filter: /^(SERVER|MANIFEST|SERVER_OPTIONS)$/ }, ({ path }) => {
						if (path === 'SERVER') return { path: `${server}/index.js` };
						if (path === 'MANIFEST') return { path: manifest_file };
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
 * @param {string} out
 * @param {string[]} assets
 * @param {string} entrypoint
 * @param {string | undefined} instrumentation
 * @returns {Promise<string>}
 */
async function create_compile_entrypoint(out, assets, entrypoint, instrumentation) {
	const unique_assets = [...new Set(assets)];
	const metadata = [];
	for (const file of unique_assets) {
		const source = Bun.file(resolve(out, file));
		const hash = new Bun.CryptoHasher('sha256').update(await source.arrayBuffer()).digest('hex');
		metadata.push({
			file,
			size: source.size,
			type: source.type,
			lastModified: new Date(source.lastModified).toUTCString(),
			etag: `"${hash}"`
		});
	}
	const imports = unique_assets.map(
		(file, index) =>
			`import asset_${index} from ${JSON.stringify(posixify(resolve(out, file)))} with { type: 'file' };`
	);
	const entries = metadata.map(({ file, ...metadata }, index) => [
		file,
		`{ path: asset_${index}, ...${JSON.stringify(metadata)} }`
	]);
	return [
		...imports,
		`globalThis[Symbol.for('sveltekit.adapter-bun.assets')] = new Map([${entries
			.map(([file, value]) => `[${JSON.stringify(file)}, ${value}]`)
			.join(',')}]);`,
		instrumentation && `await import(${JSON.stringify(instrumentation)});`,
		`await import(${JSON.stringify(entrypoint)});`
	]
		.filter(Boolean)
		.join('\n');
}

/** @param {string} str */
function posixify(str) {
	return str.replace(/\\/g, '/');
}
