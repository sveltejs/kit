import { statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const files = fileURLToPath(new URL('./files', import.meta.url).href);

/** @type {import('./index.js').default} */
export default function (opts = {}) {
	const {
		out = 'build',
		precompress = true,
		envPrefix = '',
		serverOptions = {},
		compile = false
	} = opts;

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

			/** @type {string[]} */
			let client_compressed = [];
			/** @type {string[]} */
			let prerendered_compressed = [];
			if (precompress) {
				builder.log.minor('Compressing assets');
				[client_compressed, prerendered_compressed] = await Promise.all([
					builder.compress(`${out}/client`),
					builder.compress(`${out}/prerendered`)
				]);
			}
			const compressed_files = [...client_compressed, ...prerendered_compressed];

			builder.log.minor(compile ? 'Compiling executable' : 'Building server');

			const pkg = JSON.parse(await readFile('package.json', 'utf8'));
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
					`export const compressed_files = new Set(${JSON.stringify(compressed_files)});`,
					`export const prerendered_paths = new Set(${JSON.stringify(builder.prerendered.paths)});`
				].join('\n\n'),
				[server_options_file]: `export default ${serialize(serverOptions)};\n`
			};

			const compile_options = compile === true ? { compile: { outfile: `${out}/app` } } : compile;
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
					...client_compressed.flatMap((file) => [
						`client/${posixify(file)}.br`,
						`client/${posixify(file)}.gz`
					]),
					...prerendered_files.map((file) => `prerendered/${file}`),
					...prerendered_compressed.flatMap((file) => [
						`prerendered/${posixify(file)}.br`,
						`prerendered/${posixify(file)}.gz`
					])
				];
				const compile_file = `${out}/adapter-bun-compile.js`;
				virtual_files[compile_file] = create_compile_entrypoint(
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
						let contents = await readFile(path, 'utf8');
						if (contents.includes('dirname(fileURLToPath(import.meta.url))')) {
							// Bun places shared modules two levels below the output directory
							contents = contents.replace(
								'dirname(fileURLToPath(import.meta.url))',
								"fileURLToPath(new URL('../../', import.meta.url))"
							);
						}
						contents = contents
							.replace(/\bENV_PREFIX\b/g, JSON.stringify(envPrefix))
							.replace(/\bPRECOMPRESS\b/g, JSON.stringify(precompress))
							.replace(
								/\bORIGIN\b/g,
								JSON.stringify(builder.config.kit.paths.origin) || 'undefined'
							);
						return { contents, loader: 'js' };
					});
				}
			};

			const result = await Bun.build({
				target: 'bun',
				format: 'esm',
				conditions: ['bun', 'node'],
				...build_options,
				entrypoints,
				files: {
					...build_options.files,
					...virtual_files
				},
				plugins: [...(build_options.plugins ?? []), adapter_plugin]
			});

			if (!result.success) {
				throw new AggregateError(result.logs, 'Bun server build failed');
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
 * @returns {string}
 */
function create_compile_entrypoint(out, assets, entrypoint, instrumentation) {
	const unique_assets = [...new Set(assets)];
	const imports = unique_assets.map(
		(file, index) =>
			`import asset_${index} from ${JSON.stringify(posixify(resolve(out, file)))} with { type: 'file' };`
	);
	const entries = unique_assets.map((file, index) => [
		file,
		`{ path: asset_${index}, lastModified: ${Math.trunc(statSync(`${out}/${file}`).mtimeMs)} }`
	]);
	return [
		...imports,
		`globalThis[Symbol.for('sveltekit.adapter-bun.assets')] = new Map([${entries
			.map(([file, identifier]) => `[${JSON.stringify(file)}, ${identifier}]`)
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
