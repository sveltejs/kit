import { readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { rolldown } from 'rolldown';

const files = fileURLToPath(new URL('./files', import.meta.url).href);

/** @param {string} str */
function escape_regex(str) {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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

			builder.log.minor('Building server');

			const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
			const server = builder.getServerDirectory();
			const entries = posixify(`${tmp}/entries`);
			builder.copy(files, entries);

			const dir_id = `${entries}/dir.js`;
			const server_options_file = `${server}/adapter-bun-options.js`;

			writeFileSync(
				`${server}/manifest.js`,
				[
					`export const manifest = ${builder.generateManifest({ relativePath: './' })};`,
					`export const client_files = new Set(${JSON.stringify(client_files)});`,
					`export const prerendered_files = new Set(${JSON.stringify(prerendered_files)});`,
					`export const compressed_files = new Set(${JSON.stringify(compressed_files)});`,
					`export const prerendered_paths = new Set(${JSON.stringify(builder.prerendered.paths)});`
				].join('\n\n')
			);
			writeFileSync(server_options_file, `export default ${serialize(serverOptions)};\n`);

			/** @type {Record<string, string>} */
			const input = {
				index: `${entries}/index.js`,
				handler: `${entries}/handler.js`
			};

			if (builder.hasServerInstrumentationFile()) {
				input['instrumentation.server'] = `${server}/instrumentation.server.js`;
			}

			const bundle = await rolldown({
				input,
				external: [
					'bun',
					/^bun:/,
					// dependencies could have deep exports, so we need a regex
					...Object.keys(pkg.dependencies || {}).map((d) => new RegExp(`^${d}(\\/.*)?$`))
				],
				platform: 'node',
				resolve: {
					conditionNames: ['bun', 'node']
				},
				experimental: {
					nativeMagicString: true
				},
				plugins: [
					{
						name: 'adapter-bun-resolve-app',
						resolveId(id) {
							if (id === 'SERVER') return `${server}/index.js`;
							if (id === 'MANIFEST') return `${server}/manifest.js`;
							if (id === 'SERVER_OPTIONS') return server_options_file;
						}
					},
					{
						name: 'adapter-bun-replace-constants',
						transform: {
							filter: { id: new RegExp(escape_regex(entries)) },
							handler(_code, _id, { magicString }) {
								if (!magicString) {
									throw new Error('experimental.nativeMagicString is not enabled');
								}
								magicString
									.replace(/\bENV_PREFIX\b/g, JSON.stringify(envPrefix))
									.replace(/\bPRECOMPRESS\b/g, JSON.stringify(precompress))
									.replace(
										/\bORIGIN\b/g,
										JSON.stringify(builder.config.kit.paths.origin) || 'undefined'
									);
								return {
									code: magicString,
									map: magicString.generateMap().toString()
								};
							}
						}
					}
				]
			});

			await bundle.write({
				dir: out,
				format: 'esm',
				sourcemap: true,
				codeSplitting: {
					groups: [
						{
							name: 'dir',
							test: dir_id
						}
					]
				},
				chunkFileNames(chunk) {
					if (chunk.name === 'dir') return '[name].js';
					return 'server/chunks/[name]-[hash].js';
				}
			});

			if (builder.hasServerInstrumentationFile()) {
				builder.instrument({
					entrypoint: `${out}/index.js`,
					instrumentation: `${out}/instrumentation.server.js`,
					module: {
						exports: ['hostname', 'port', 'server', 'unix']
					}
				});
			}

			if (compile) {
				builder.log.minor('Compiling executable');
				await compile_executable(out, compile === true ? {} : compile, [
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
				]);
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
 * @param {NonNullable<Exclude<import('./index.js').AdapterOptions['compile'], boolean>>} options
 * @param {string[]} assets
 * @returns {Promise<void>}
 */
async function compile_executable(out, options, assets) {
	if (typeof Bun === 'undefined') {
		throw new Error(
			'Compiling an executable requires running the SvelteKit build with Bun. Use `bun run --bun build`.'
		);
	}

	const outfile = options.outfile ?? `${out}/app`;
	const entrypoint = `${out}/adapter-bun-compile.js`;
	const { bytecode, minify, sourcemap, outfile: _, ...compile } = options;

	const unique_assets = [...new Set(assets)];
	const imports = unique_assets.map(
		(file, index) =>
			`import asset_${index} from ${JSON.stringify(`./${file}`)} with { type: 'file' };`
	);
	const entries = unique_assets.map((file, index) => [
		file,
		`{ path: asset_${index}, lastModified: ${Math.trunc(statSync(`${out}/${file}`).mtimeMs)} }`
	]);
	writeFileSync(
		entrypoint,
		[
			...imports,
			`globalThis[Symbol.for('sveltekit.adapter-bun.assets')] = new Map([${entries
				.map(([file, identifier]) => `[${JSON.stringify(file)}, ${identifier}]`)
				.join(',')}]);`,
			`await import('./index.js');`
		].join('\n')
	);

	try {
		const result = await Bun.build({
			entrypoints: [entrypoint],
			compile: { ...compile, outfile },
			bytecode,
			minify,
			sourcemap: sourcemap ? 'linked' : undefined
		});

		if (!result.success) {
			throw new AggregateError(result.logs, 'Bun executable compilation failed');
		}
	} finally {
		rmSync(entrypoint, { force: true });
	}
}

/** @param {string} str */
function posixify(str) {
	return str.replace(/\\/g, '/');
}
