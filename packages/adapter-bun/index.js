import { relative, resolve } from 'node:path';
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
			const manifest_file = resolve(server, 'manifest.js');
			const server_options_file = resolve(src_dir, 'options.js');

			const virtual_files = {
				[manifest_file]:
					`export const manifest = ${builder.generateManifest({ relativePath: './' })};\n` +
					`export const base = ${JSON.stringify(builder.config.kit.paths.base || '/')};\n` +
					`export const embed = ${JSON.stringify(!!buildOptions.compile)};\n` +
					`export const env_prefix = ${JSON.stringify(envPrefix)};\n` +
					`export const origin = ${JSON.stringify(builder.config.kit.paths.origin) || 'undefined'};`,
				[server_options_file]: [`export default ${JSON.stringify(serverOptions)};`].join('\n'),
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
 * @param {string[]} options.server_assets
 * @returns {Promise<{imports: string[], entries: string[], server_assets: string[]}>}
 */
async function get_embed_entries({ builder, server_assets }) {
	const builtFiles = `${builder.config.kit.outDir}/output`;

	const [cl_files, pr_pages, pr_deps, pr_data] = await Promise.all([
		read_files_recursive(`${builtFiles}/client`),
		read_files_recursive(`${builtFiles}/prerendered/pages`),
		read_files_recursive(`${builtFiles}/prerendered/dependencies`),
		read_files_recursive(`${builtFiles}/prerendered/data`)
	]);

	const assets = [...cl_files, ...pr_pages, ...pr_deps, ...pr_data];

	const imports = assets.map(({ abs }, i) => {
		return `import asset_${i} from ${JSON.stringify(abs)} with { type: 'file' };`;
	});

	let offset = 0;
	const cl_entries = cl_files.map(({ rel }, i) => {
		return `...client_asset(${JSON.stringify(rel)}, asset_${offset + i})`;
	});

	offset += cl_files.length;
	const prerendered_pages_files = new Set(
		[...builder.prerendered.pages].map(([_, { file }]) => file)
	);
	const pr_pages_entries = [...builder.prerendered.pages].map(([path, { file }]) => {
		const fileIdx = pr_pages.findIndex((f) => f.rel === file);
		if (fileIdx === -1)
			throw new Error(`Could not find prerendered page ${file} for route ${path}`);
		return `...prerendered_page(${JSON.stringify(path)}, asset_${offset + fileIdx})`;
	});
	const pr_page_assets_entries = pr_pages.flatMap(({ rel }, i) => {
		return prerendered_pages_files.has(rel)
			? []
			: [`prerendered_asset(${JSON.stringify(rel)}, asset_${offset + i})`];
	});

	offset += pr_pages.length;
	const pr_assets_entries = [...pr_deps, ...pr_data].map(({ rel }, i) => {
		return `prerendered_asset(${JSON.stringify(rel)}, asset_${offset + i})`;
	});

	const pr_redirects = [...builder.prerendered.redirects].map(([src, { status, location }]) => {
		return `prerendered_redirect(${JSON.stringify(src)}, ${status}, ${JSON.stringify(location)})`;
	});

	return {
		imports,
		entries: [
			...cl_entries,
			...pr_pages_entries,
			...pr_page_assets_entries,
			...pr_assets_entries,
			...pr_redirects
		],
		server_assets: server_assets.map((file) => {
			const idx = assets.findIndex((f) => f.rel === file);
			if (idx === -1) throw new Error(`Could not find server asset ${file}`);
			return `server_asset(${JSON.stringify(file)}, asset_${idx})`;
		})
	};
}

/**
 * @param {object} options
 * @param {import('@sveltejs/kit').Builder} options.builder
 * @param {string[]} options.server_assets
 * @param {string} options.out
 * @returns {{imports: string[], entries: string[], server_assets: string[]}}
 */
function get_no_embed_entries({ builder, server_assets, out }) {
	const client_files = builder.writeClient(`${out}/client`);
	const prerendered_files = builder.writePrerendered(`${out}/prerendered`);

	const cl_entries = client_files.map((filePath) => {
		return `...client_asset(${JSON.stringify(filePath)})`;
	});

	const prerendered_pages = [...builder.prerendered.pages];
	const prerendered_pages_files = new Set(prerendered_pages.map(([_, { file }]) => file));

	const pr_pages_entries = prerendered_pages.map(([path, { file }]) => {
		return `...prerendered_page(${JSON.stringify(path)}, ${JSON.stringify(file)})`;
	});

	const pr_assets_entries = prerendered_files
		.filter((filePath) => !prerendered_pages_files.has(filePath))
		.map((filePath) => {
			return `prerendered_asset(${JSON.stringify(filePath)})`;
		});

	const pr_redirects = [...builder.prerendered.redirects].map(([src, { status, location }]) => {
		return `prerendered_redirect(${JSON.stringify(src)}, ${status}, ${JSON.stringify(location)})`;
	});

	return {
		imports: [],
		entries: [...cl_entries, ...pr_pages_entries, ...pr_assets_entries, ...pr_redirects],
		server_assets: server_assets.map((file) => {
			return `server_asset(${JSON.stringify(file)})`;
		})
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
	const server_assets = builder.findServerAssets(
		builder.routes.filter((route) => route.prerender !== true)
	);

	const {
		imports,
		entries,
		server_assets: resolved_server_assets
	} = embed
		? await get_embed_entries({ builder, server_assets })
		: get_no_embed_entries({ builder, out, server_assets });

	return [
		`// eslint-disable-next-line @typescript-eslint/no-unused-vars`,
		`import { client_asset, prerendered_asset, prerendered_page, prerendered_redirect, server_asset } from './routes-util.js';`,
		...imports,
		`export const routes = Object.fromEntries([${entries.join(',\n')}]);`,
		`export const server_assets = new Map([${resolved_server_assets
			.map((file, i) => `[${JSON.stringify(server_assets[i])}, ${file}]`)
			.join(',\n')}]);`
	].join('\n');
}

/** @param {string} path */
function posixify(path) {
	return path.replace(/\\/g, '/');
}
