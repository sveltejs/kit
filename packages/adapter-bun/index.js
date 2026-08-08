import { resolve, posix } from 'node:path';
import { readdir } from 'node:fs/promises';

/**
 * @param {string} path
 * @returns {Promise<{abs: string, rel: string}[]>}
 */
async function read_files_recursive(path) {
	try {
		const entries = await readdir(path, { recursive: true, withFileTypes: true });
		return entries
			.filter((entry) => entry.isFile())
			.map((entry) => {
				const abs = resolve(entry.parentPath, entry.name);
				const rel = posix.relative(path, abs);
				return { abs, rel };
			})
			.filter(({ rel }) => rel.split('/').every((segment) => segment !== '.vite'));
	} catch {
		return [];
	}
}

/** @type {import('./index.js').default} */
export default function (opts = {}) {
	const { out = 'build', envPrefix = '', serverOptions = {}, buildOptions = {} } = opts;

	return {
		name: '@sveltejs/adapter-bun',
		async adapt(builder) {
			if (typeof Bun === 'undefined') {
				throw new Error(
					'adapter-bun requires running the SvelteKit build with Bun. Use `bun run --bun build`.'
				);
			}

			builder.rimraf(out);

			builder.log.minor('Building server');

			const server = builder.getServerDirectory();

			const manifest_file = `${server}/adapter-bun-manifest.js`;
			const routes_file = `${server}/adapter-bun-routes.js`;
			const server_options_file = `${server}/adapter-bun-options.js`;
			const virtual_files = {
				[manifest_file]: `export const manifest = ${builder.generateManifest({ relativePath: './' })};\n`,
				[server_options_file]: `export default ${JSON.stringify(serverOptions)};\n`,
				[routes_file]: await create_routes({
					builder,
					out,
					embed: !!buildOptions.compile
				})
			};
			const src_dir = resolve(import.meta.dirname, 'src');
			const index_file = resolve(src_dir, 'index.js');
			const start_file = resolve(src_dir, 'start.js');

			const instrumentation = builder.hasServerInstrumentationFile()
				? `${server}/instrumentation.server.js`
				: undefined;

			if (instrumentation) {
				// Virtually rename index.js to start.js
				virtual_files[start_file] = await Bun.file(index_file).text();

				// Virtually create a new index.js that imports the instrumentation and then starts the server
				virtual_files[index_file] = [
					`import ${JSON.stringify(instrumentation)};`,
					`await import(${JSON.stringify(start_file)});`
				].join('\n');
			}

			/** @type {import('bun').BunPlugin} */
			const adapter_plugin = {
				name: 'adapter-bun',
				setup(build) {
					build.onResolve({ filter: /^(SERVER|MANIFEST|ROUTES|SERVER_OPTIONS)$/ }, ({ path }) => {
						if (path === 'SERVER') return { path: `${server}/index.js` };
						if (path === 'MANIFEST') return { path: manifest_file };
						if (path === 'ROUTES') return { path: routes_file };
						if (path === 'SERVER_OPTIONS') return { path: server_options_file };
					});
				}
			};

			const result = await Bun.build({
				...buildOptions,
				splitting: true,
				entrypoints: [index_file],
				target: 'bun',
				format: 'esm',
				naming: {
					entry: '[name].[ext]',
					chunk: 'server/chunks/[name]-[hash].[ext]',
					asset: 'server/assets/[name]-[hash].[ext]'
				},
				plugins: [adapter_plugin],
				define: {
					ENV_PREFIX: JSON.stringify(envPrefix),
					ORIGIN: JSON.stringify(builder.config.kit.paths.origin) || 'undefined'
				},
				conditions: ['bun', 'node'],
				throw: false,
				files: virtual_files,
				outdir: out,
				compile: buildOptions.compile
					? {
							outfile: 'server',
							...(typeof buildOptions.compile === 'string' ? { target: buildOptions.compile } : {}),
							...(typeof buildOptions.compile === 'object' ? buildOptions.compile : {})
						}
					: false
			});
			if (!result.success) {
				for (const log of result.logs) {
					switch (log.level) {
						case 'error':
							builder.log.error(log.message);
							break;
						case 'warning':
							builder.log.warn(log.message);
							break;
						default:
							builder.log.info(log.message);
					}
				}
				throw new AggregateError(result.logs);
			}
		},

		supports: {
			read: () => true,
			instrumentation: () => true
		}
	};
}

/**
 * @param {object} options
 * @param {import('@sveltejs/kit').Builder} options.builder
 * @param {string} options.out
 * @param {boolean} options.embed
 * @returns {Promise<string>}
 */
async function create_routes({ builder, out, embed }) {
	const app_path = builder.getAppPath();
	const base = builder.config.kit.paths.base || '/';
	const builtFiles = `${builder.config.kit.outDir}/output`;

	const client_files = embed
		? await read_files_recursive(`${builtFiles}/client`)
		: builder
				.writeClient(`${out}/client`)
				.map((rel) => ({ rel, abs: resolve(`${out}/client`, rel) }));

	const prerendered_files = embed
		? (
				await Promise.all([
					read_files_recursive(`${builtFiles}/prerendered/pages`),
					read_files_recursive(`${builtFiles}/prerendered/dependencies`),
					read_files_recursive(`${builtFiles}/prerendered/data`)
				])
			).flat()
		: builder
				.writePrerendered(`${out}/prerendered`)
				.map((rel) => ({ rel, abs: resolve(`${out}/prerendered`, rel) }));

	/** @type {string[]} */
	const asset_imports = [];
	/** @type {string[]} */
	const file_entries = [];
	/** @type {Map<string, string>} */
	const file_identifiers = new Map();

	/**
	 * @param {string} file
	 * @param {string} abspath
	 * @returns {string}
	 */
	function make_file(file, abspath) {
		const relpath = posix.relative(resolve(out), abspath);
		let asset;
		if (embed) {
			asset = `asset_${asset_imports.length}`;
			asset_imports.push(`import ${asset} from ${JSON.stringify(abspath)} with { type: 'file' };`);
		} else {
			asset = `resolve(import.meta.dir, ${JSON.stringify(relpath)})`;
		}

		const identifier = `file_${file_entries.length}`;
		file_entries.push(`const ${identifier} = Bun.file(${asset});`);
		file_identifiers.set(file, identifier);
		return identifier;
	}

	/**
	 * @param {string} file
	 * @param {string} abspath
	 * @param {boolean} [immutable]
	 * @returns {string}
	 */
	function make_response(file, abspath, immutable = false) {
		if (!embed && !immutable) return file;

		/** @type {Record<string, string>} */
		const headers = {};
		if (embed) headers['content-type'] = Bun.file(abspath).type;
		if (immutable) headers['cache-control'] = 'public,max-age=31536000,immutable';

		return `new Response(${file}, { headers: ${JSON.stringify(headers)} })`;
	}

	/** @type {Array<{ path: string; value: string }>} */
	const entries = [];

	for (const { rel, abs } of client_files) {
		const path = posix.join(base, rel);
		const immutable = path.startsWith(`/${app_path}/immutable/`);
		const file = make_file(`client/${rel}`, abs);
		entries.push({ path, value: make_response(file, abs, immutable) });
	}

	for (const [path, { file }] of builder.prerendered.pages) {
		const fileIdx = prerendered_files.findIndex((f) => f.rel === file);
		if (fileIdx === -1)
			throw new Error(`Could not find prerendered page ${file} for route ${path}`);
		const { abs, rel } = prerendered_files.splice(fileIdx, 1)[0];
		const bun_file = make_file(`prerendered/${rel}`, abs);
		entries.push({ path, value: make_response(bun_file, abs) });

		const inverted = path.endsWith('/') ? path.slice(0, -1) : `${path}/`;
		if (inverted) {
			entries.push({
				path: inverted,
				value: `(request) => Response.redirect(${JSON.stringify(encode_pathname(path))} + new URL(request.url).search, 308)`
			});
		}
	}

	for (const { abs, rel } of prerendered_files) {
		const file = make_file(`prerendered/${rel}`, abs);
		entries.push({ path: posix.join(base, rel), value: make_response(file, abs) });
	}

	const imports = embed ? [] : [`import { resolve } from 'node:path';`];
	const server_assets = builder.findServerAssets(
		builder.routes.filter((route) => route.prerender !== true)
	);
	const readable_files = `export const server_assets = new Map([${server_assets
		.map((file) => {
			const identifier = file_identifiers.get(`client/${file}`);
			if (!identifier) throw new Error(`Could not find server asset ${file} in client output`);
			return `[${JSON.stringify(file)}, ${identifier}]`;
		})
		.join(',\n')}]);`;

	const routes = entries.map(
		(entry) => `${JSON.stringify(encode_pathname(entry.path))}: ${entry.value}`
	);

	return [
		...imports,
		...asset_imports,
		...file_entries,
		readable_files,
		`export const routes = {${routes.join(',\n')}};`
	].join('\n');
}

/**
 * @param {string} pathname
 * @returns {string}
 */
function encode_pathname(pathname) {
	return pathname.split('/').map(encodeURIComponent).join('/');
}
