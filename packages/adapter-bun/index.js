import { relative, resolve, posix } from 'node:path';
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
				const rel = posixify(relative(path, abs));
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

			const src_dir = resolve(import.meta.dirname, 'src');
			const index_file = resolve(src_dir, 'index.js');
			const routes_file = resolve(src_dir, 'routes.js');
			const manifest_file = resolve(src_dir, 'manifest.js');
			const server_options_file = resolve(src_dir, 'options.js');

			const virtual_files = {
				[manifest_file]:
					`export const manifest = ${builder.generateManifest({ relativePath: './' })};\n` +
					`export const base = ${builder.config.kit.paths.base || '/'};\n` +
					`export const embed = ${!!buildOptions.compile};\n`,
				[server_options_file]: `export default ${JSON.stringify(serverOptions)};\n`,
				[routes_file]: await create_routes({
					builder,
					out,
					embed: !!buildOptions.compile
				})
			};

			const instrumentation = builder.hasServerInstrumentationFile()
				? `${server}/instrumentation.server.js`
				: undefined;

			if (instrumentation) {
				const start_file = resolve(src_dir, 'start.js'); // Virtual only
				virtual_files[start_file] = await Bun.file(index_file).text();
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
				sourcemap: buildOptions.sourcemap ?? 'external',
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
 * @returns {Promise<string>}
 */
async function create_routes_embed({ builder }) {
	const builtFiles = `${builder.config.kit.outDir}/output`;

	const [cl_files, pr_pages, pr_deps, pr_data] = await Promise.all([
		read_files_recursive(`${builtFiles}/client`),
		read_files_recursive(`${builtFiles}/prerendered/pages`),
		read_files_recursive(`${builtFiles}/prerendered/dependencies`),
		read_files_recursive(`${builtFiles}/prerendered/data`)
	]);

	builder.prerendered.pages;

	const assets = [...cl_files, ...pr_pages, ...pr_deps, ...pr_data];

	const asset_imports = assets.map(({ abs }, i) => {
		return `import asset_${i} from ${JSON.stringify(abs)} with { type: 'file' };`;
	});

	const cl_entries = cl_files.map(({ rel }, i) => {
		return `client_asset(${JSON.stringify(rel)}, asset_${i})`;
	});
	const pr_pages_entries = [...builder.prerendered.pages].map(([path, { file }]) => {
		const fileIdx = pr_pages.findIndex((f) => f.rel === file);
		if (fileIdx === -1)
			throw new Error(`Could not find prerendered page ${file} for route ${path}`);
		return `...prerendered_page(${JSON.stringify(path)}, asset_${cl_files.length + fileIdx})`;
	});
	const pr_assets_entries = [...pr_deps, ...pr_data].map(({ rel }, i) => {
		return `prerendered_asset(${JSON.stringify(rel)}, asset_${cl_files.length + pr_pages.length + i})`;
	});
	const pr_redirects = [...builder.prerendered.redirects].map(([src, { status, location }]) => {
		return `prerendered_redirect(${JSON.stringify(src)}, ${status}, ${JSON.stringify(location)})`;
	});

	return [
		`import { client_asset, prerendered_asset, prerendered_page, prerendered_redirect } from './routes-util.js';`,
		...asset_imports,
		`export const client_routes = Object.fromEntries([${[
			...cl_entries,
			...pr_pages_entries,
			...pr_assets_entries,
			...pr_redirects
		].join(',\n')}]);`
	].join('\n');
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

	const imports = [
		`import { manifest } from 'MANIFEST';`,
		...(embed ? [] : [`import { dirname, resolve } from 'node:path';`])
	];
	const declarations = embed ? [] : [`const dir = dirname(Bun.main);`];

	const client_files = embed
		? await read_files_recursive(`${builtFiles}/client`)
		: builder
				.writeClient(`${out}/client`)
				.map((rel) => ({ rel, abs: resolve(out, 'client', rel) }));

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
				.map((rel) => ({ rel, abs: resolve(out, 'prerendered', rel) }));

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
		const relpath = posixify(relative(resolve(out), abspath));
		let asset;
		if (embed) {
			asset = `asset_${asset_imports.length}`;
			asset_imports.push(`import ${asset} from ${JSON.stringify(abspath)} with { type: 'file' };`);
		} else {
			asset = `resolve(dir, ${JSON.stringify(relpath)})`;
		}

		const identifier = `file_${file_entries.length}`;
		file_entries.push(`const ${identifier} = Bun.file(${asset});`);
		file_identifiers.set(file, identifier);
		return identifier;
	}

	/**
	 * @param {string} file
	 * @param {string} pathname
	 * @param {string} abspath
	 * @param {boolean} [immutable]
	 * @returns {string}
	 */
	function make_response(file, pathname, abspath, immutable = false) {
		/** @type {Record<string, string>} */
		const headers = {};
		if (immutable) headers['cache-control'] = 'public,max-age=31536000,immutable';

		return `file_response(${file}, ${JSON.stringify(pathname)}, ${JSON.stringify(
			Bun.file(abspath).type
		)}, ${JSON.stringify(headers)})`;
	}

	/** @type {Array<{ path: string; value: string }>} */
	const entries = [];

	for (const { rel, abs } of client_files) {
		const path = posix.join(base, rel);
		const immutable = path.startsWith(`/${app_path}/immutable/`);
		const file = make_file(`client/${rel}`, abs);
		entries.push({ path, value: make_response(file, path, abs, immutable) });
	}

	for (const [path, { file }] of builder.prerendered.pages) {
		const fileIdx = prerendered_files.findIndex((f) => f.rel === file);
		if (fileIdx === -1)
			throw new Error(`Could not find prerendered page ${file} for route ${path}`);
		const { abs, rel } = prerendered_files.splice(fileIdx, 1)[0];
		const bun_file = make_file(`prerendered/${rel}`, abs);
		entries.push({ path, value: make_response(bun_file, path, abs) });

		const inverted = path.endsWith('/') ? path.slice(0, -1) : `${path}/`;
		if (inverted) {
			entries.push({
				path: inverted,
				value: `(request) => Response.redirect(${JSON.stringify(encode_pathname(path))} + new URL(request.url).search, 308)`
			});
		}
	}

	for (const [path, { status, location }] of builder.prerendered.redirects) {
		entries.push({ path, value: `Response.redirect(${JSON.stringify(location)}, ${status})` });
	}

	for (const { abs, rel } of prerendered_files) {
		const file = make_file(`prerendered/${rel}`, abs);
		const path = posix.join(base, rel);
		entries.push({ path, value: make_response(file, path, abs) });
	}

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
		...declarations,
		...file_entries,
		readable_files,
		`function file_response(file, pathname, fallback, headers) {
			const type = manifest.mimeTypes[pathname.slice(pathname.lastIndexOf('.'))] || fallback;
			if (type) headers['content-type'] = type;
			return new Response(file, { headers });
		}`,
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

/** @param {string} path */
function posixify(path) {
	return path.replace(/\\/g, '/');
}
