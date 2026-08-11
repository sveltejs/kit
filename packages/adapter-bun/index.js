/** @import { Builder } from '@sveltejs/kit' */
/** @import { BunPlugin } from 'bun' */
import fs from 'node:fs';
import path from 'node:path';

/**
 * @param {string} dir
 * @returns {{abs: string, rel: string}[]}
 */
function read_files_recursive(dir) {
	if (!fs.existsSync(dir)) return [];
	return fs
		.readdirSync(dir, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) => {
			const abs = path.resolve(entry.parentPath, entry.name);
			const rel = posixify(path.relative(dir, abs));
			return { abs, rel };
		})
		.filter(({ rel }) => rel.split('/').every((segment) => segment !== '.vite'));
}

/**
 * Matches sirv's default behaviour in adapter-node: dotfiles are not served,
 * with an exception for the `.well-known` directory.
 * @param {string} file
 */
function is_dotfile(file) {
	return file
		.split('/')
		.some((segment, i) => segment.startsWith('.') && !(i === 0 && segment === '.well-known'));
}

// bounds open file handles while every asset hashes concurrently
const MAX_OPEN_FILES = 64;
let open_files = 0;
/** @type {Array<() => void>} */
const file_waiters = [];

/**
 * Streams the file through the hasher so build memory stays bounded by chunk
 * size instead of total asset size.
 * @param {string} file
 * @returns {Promise<string>}
 */
async function hash_file(file) {
	if (open_files === MAX_OPEN_FILES) {
		await new Promise((resolve) => {
			file_waiters.push(() => resolve(undefined));
		});
	}
	open_files++;
	try {
		const hasher = new Bun.CryptoHasher('blake2b256');
		for await (const chunk of Bun.file(file).stream()) {
			hasher.update(chunk);
		}
		return hasher.digest('hex').slice(0, 16);
	} finally {
		open_files--;
		file_waiters.shift()?.();
	}
}

/**
 * The build-time validator for conditional requests: Bun only generates ETags for
 * in-memory static routes, not file-backed responses, so the adapter ships its own.
 * @param {string} file
 * @param {boolean} [precompress]
 * @returns {Promise<{ hash: string, mtime: number, br?: boolean, gz?: boolean }>}
 */
async function asset_meta(file, precompress = false) {
	const hash = await hash_file(file);

	/** @type {{ hash: string, mtime: number, br?: boolean, gz?: boolean }} */
	const meta = { hash, mtime: Bun.file(file).lastModified };
	if (precompress) {
		if (fs.existsSync(`${file}.br`)) meta.br = true;
		if (fs.existsSync(`${file}.gz`)) meta.gz = true;
	}

	return meta;
}

/** @param {string[]} files */
function validate_file_paths(files) {
	for (const file of files) {
		if (file.includes('*')) {
			throw new Error(
				`Cannot build with ${JSON.stringify(file)} because Bun treats literal \`*\` characters in route paths as wildcards. Rename the file or route to remove the \`*\` character.`
			);
		}
		// a leading ':' would need percent-encoding, but browsers request the colon raw
		if (file.split('/').some((segment) => segment.startsWith(':'))) {
			throw new Error(
				`Cannot build with ${JSON.stringify(file)} because Bun treats a route segment starting with \`:\` as a parameter. Rename the file or route so no segment starts with \`:\`.`
			);
		}
	}
}

/** @type {import('./index.js').default} */
export default function (opts = {}) {
	const {
		out = 'build',
		envPrefix = '',
		precompress = false,
		serverOptions = {},
		buildOptions = {}
	} = opts;

	return {
		name: '@sveltejs/adapter-bun',
		async adapt(builder) {
			if (typeof Bun === 'undefined') {
				throw new Error(
					'adapter-bun requires running the SvelteKit build with Bun. Use `bun run --bun build`.'
				);
			}

			fs.rmSync(out, { recursive: true, force: true });

			builder.log.minor('Building server');

			if (precompress && buildOptions.compile) {
				builder.log.warn(
					'precompress is ignored with buildOptions.compile: embedded assets are imported by identity path'
				);
			}

			const server = builder.getServerDirectory();

			const src_dir = path.resolve(import.meta.dirname, 'src');
			const index_file = path.resolve(src_dir, 'index.js');
			const routes_file = path.resolve(src_dir, 'routes.js');
			const manifest_file = path.resolve(server, 'manifest.js');
			const server_options_file = path.resolve(src_dir, 'options.js');

			const virtual_files = {
				[manifest_file]:
					`export const manifest = ${builder.generateManifest({ relativePath: './' })};\n` +
					`export const base = ${JSON.stringify(builder.config.kit.paths.base || '/')};\n` +
					`export const embed = ${JSON.stringify(!!buildOptions.compile)};\n` +
					`export const env_prefix = ${JSON.stringify(envPrefix)};\n` +
					`export const origin = ${JSON.stringify(builder.config.kit.paths.origin) || 'undefined'};`,
				[server_options_file]: `export default ${JSON.stringify(serverOptions)};`,
				[routes_file]: await create_routes({
					builder,
					out,
					embed: !!buildOptions.compile,
					precompress: precompress && !buildOptions.compile
				})
			};

			const instrumentation = builder.hasServerInstrumentationFile()
				? `${server}/instrumentation.server.js`
				: undefined;

			if (instrumentation) {
				const start_file = path.resolve(src_dir, 'start.js'); // Virtual only
				virtual_files[start_file] = await Bun.file(index_file).text();
				virtual_files[index_file] = [
					`import ${JSON.stringify(instrumentation)};`,
					`await import(${JSON.stringify(start_file)});`
				].join('\n');
			}

			/** @type {BunPlugin} */
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
				splitting: buildOptions.splitting ?? true,
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
					// BuildMessage properties are not enumerable, so console.error(log) prints `{}`
					const message = log.message ?? String(log);
					if (log.level === 'error') builder.log.error(message);
					else if (log.level === 'warning') builder.log.warn(message);
					else builder.log.info(message);
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
 * @param {Builder} options.builder
 * @param {string[]} options.server_assets
 * @returns {Promise<{imports: string[], entries: string[], server_assets: string[]}>}
 */
async function get_embed_entries({ builder, server_assets }) {
	const built_files = `${builder.config.kit.outDir}/output`;

	const all_cl_files = read_files_recursive(`${built_files}/client`);
	const pr_pages = read_files_recursive(`${built_files}/prerendered/pages`);
	const pr_deps = read_files_recursive(`${built_files}/prerendered/dependencies`);
	const pr_data = read_files_recursive(`${built_files}/prerendered/data`);

	const cl_files = all_cl_files.filter(({ rel }) => !is_dotfile(rel));

	const assets = [...cl_files, ...pr_pages, ...pr_deps, ...pr_data];
	validate_file_paths(assets.map(({ rel }) => rel));

	// keyed by identity: client and prerendered trees can contain the same relative path
	const asset_index = new Map(assets.map((file, i) => [file, i]));
	const imports = assets.map(({ abs }, i) => {
		return `import asset_${i} from ${JSON.stringify(abs)} with { type: 'file' };`;
	});

	/**
	 * @param {{ abs: string, rel: string }} file
	 * @param {string} helper
	 * @param {string} [url]
	 */
	const entry = async (file, helper, url = file.rel) =>
		`...${helper}(${JSON.stringify(url)}, asset_${asset_index.get(file)}, ${JSON.stringify(await asset_meta(file.abs))})`;

	const page_files = new Map(pr_pages.map((file) => [file.rel, file]));
	const page_rels = new Set([...builder.prerendered.pages].map(([_, { file }]) => file));

	const entries = await Promise.all([
		...cl_files.map((file) => entry(file, 'client_asset')),
		...[...builder.prerendered.pages].map(([path, { file }]) => {
			const page = page_files.get(file);
			if (page === undefined)
				throw new Error(`Could not find prerendered page ${file} for route ${path}`);
			return entry(page, 'prerendered_page', path);
		}),
		...pr_pages
			.filter(({ rel }) => !page_rels.has(rel))
			.map((file) => entry(file, 'prerendered_asset')),
		...[...pr_deps, ...pr_data].map((file) => entry(file, 'prerendered_asset'))
	]);

	const index_by_rel = new Map(
		assets.map(({ rel }, i) => /** @type {[string, number]} */ ([rel, i])).reverse()
	);

	return {
		imports,
		entries,
		server_assets: server_assets.map((file) => {
			const idx = index_by_rel.get(file);
			if (idx === undefined) throw new Error(`Could not find server asset ${file}`);
			return `[${JSON.stringify(file)}, server_asset(${JSON.stringify(file)}, asset_${idx})]`;
		})
	};
}

/**
 * @param {object} options
 * @param {Builder} options.builder
 * @param {string[]} options.server_assets
 * @param {string} options.out
 * @param {boolean} options.precompress
 * @returns {Promise<{imports: string[], entries: string[], server_assets: string[]}>}
 */
async function get_no_embed_entries({ builder, server_assets, out, precompress }) {
	const client_files = builder.writeClient(`${out}/client`).filter((file) => !is_dotfile(file));
	const prerendered_files = builder.writePrerendered(`${out}/prerendered`);
	validate_file_paths([...client_files, ...prerendered_files]);

	if (precompress) {
		await Promise.all([builder.compress(`${out}/client`), builder.compress(`${out}/prerendered`)]);
	}

	/**
	 * @param {string} helper
	 * @param {string} url
	 * @param {string} dir
	 * @param {string} [filename]
	 */
	const entry = async (helper, url, dir, filename) =>
		`...${helper}(${JSON.stringify(url)}, ${JSON.stringify(filename)}, ${JSON.stringify(await asset_meta(`${out}/${dir}/${filename ?? url}`, precompress))})`;

	const pages = [...builder.prerendered.pages];
	const page_files = new Set(pages.map(([_, { file }]) => file));

	const entries = await Promise.all([
		...client_files.map((file) => entry('client_asset', file, 'client')),
		...pages.map(([path, { file }]) => entry('prerendered_page', path, 'prerendered', file)),
		...prerendered_files
			.filter((file) => !page_files.has(file))
			.map((file) => entry('prerendered_asset', file, 'prerendered'))
	]);

	return {
		imports: [],
		entries,
		server_assets: server_assets.map((file) => {
			return `[${JSON.stringify(file)}, server_asset(${JSON.stringify(file)})]`;
		})
	};
}

/**
 * @param {object} options
 * @param {Builder} options.builder
 * @param {string} options.out
 * @param {boolean} options.embed
 * @param {boolean} options.precompress
 * @returns {Promise<string>}
 */
async function create_routes({ builder, out, embed, precompress }) {
	validate_file_paths([
		...builder.prerendered.pages.keys(),
		...builder.prerendered.redirects.keys()
	]);

	const server_assets = builder.findServerAssets(
		builder.routes.filter((route) => route.prerender !== true)
	);

	const {
		imports,
		entries,
		server_assets: resolved_server_assets
	} = embed
		? await get_embed_entries({ builder, server_assets })
		: await get_no_embed_entries({ builder, out, server_assets, precompress });

	const redirects = [...builder.prerendered.redirects].map(([src, { status, location }]) => {
		return `...prerendered_redirect(${JSON.stringify(src)}, ${status}, ${JSON.stringify(location)})`;
	});

	return [
		`import { client_asset, prerendered_asset, prerendered_page, prerendered_redirect, server_asset } from './routes-util.js';`,
		...imports,
		// reversed because Object.fromEntries keeps the last duplicate: the first generated
		// entry for a path must win so exact files beat aliases, like sirv's lookup order
		`export const routes = Object.fromEntries([${[...entries, ...redirects].join(',\n')}].reverse());`,
		`export const server_assets = new Map([${resolved_server_assets.join(',\n')}]);`
	].join('\n');
}

/** @param {string} path */
function posixify(path) {
	return path.replace(/\\/g, '/');
}
