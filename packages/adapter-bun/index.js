/** @import { Builder } from '@sveltejs/kit' */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// posix so it matches the module ids Vite reports on every platform
const files = fileURLToPath(new URL('./src', import.meta.url)).replaceAll('\\', '/');
const handoff = '#@sveltejs/adapter-bun';

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

/** @type {import('./index.js').default} */
export default function (opts = {}) {
	const {
		out = 'build',
		envPrefix = '',
		precompress = false,
		serverOptions = {},
		buildOptions = {}
	} = opts;
	const embed = !!buildOptions.compile;

	return {
		name: '@sveltejs/adapter-bun',
		async adapt(builder) {
			if (typeof Bun === 'undefined') {
				throw new Error(
					'adapter-bun requires running the SvelteKit build with Bun. Use `bun run --bun build`.'
				);
			}

			fs.rmSync(out, { recursive: true, force: true });

			if (precompress && embed) {
				builder.log.warn(
					'precompress is ignored with buildOptions.compile: embedded assets are imported by identity path'
				);
			}

			builder.log.minor('Building server');

			const server = builder.getServerDirectory();
			builder.generateServerInstance(`${server}/server.js`);

			// values only known once the app is built, next to server/ so the chunks' `../adapter-bun.js` resolves
			const handoff_file = path.resolve(server, '../adapter-bun.js');
			fs.writeFileSync(
				handoff_file,
				[
					`import { dirname } from 'node:path';`,
					`import { fileURLToPath } from 'node:url';`,
					`export { server } from './server/server.js';`,
					`export const dir = dirname(fileURLToPath(import.meta.url));`,
					`export const app_dir = ${JSON.stringify(builder.config.appDir)};`,
					`export const base = ${JSON.stringify(builder.config.paths.base || '/')};`,
					`export const embed = ${embed};`,
					`export const env_prefix = ${JSON.stringify(envPrefix)};`,
					`export const origin = ${JSON.stringify(builder.config.paths.origin)};`,
					`export const server_options = ${JSON.stringify(serverOptions)};`,
					...(await create_assets({ builder, out, embed, precompress: precompress && !embed }))
				].join('\n')
			);

			const entrypoint = `${server}/adapter-index.js`;

			if (builder.hasServerInstrumentationFile()) {
				builder.instrument({
					entrypoint,
					instrumentation: `${server}/instrumentation.server.js`,
					initializer: builder.createInstrumentationInitializer({ outputDirectory: server }),
					module: { exports: [] }
				});
			}

			if (!embed) {
				builder.copy(server, `${out}/server`);
				builder.copy(handoff_file, `${out}/adapter-bun.js`);
				fs.writeFileSync(`${out}/index.js`, `import './server/adapter-index.js';\n`);
				return;
			}

			const result = await Bun.build({
				...buildOptions,
				sourcemap: buildOptions.sourcemap ?? 'external',
				entrypoints: [entrypoint],
				target: 'bun',
				format: 'esm',
				conditions: ['bun', 'node'],
				throw: false,
				outdir: out,
				compile: {
					outfile: 'server',
					...(typeof buildOptions.compile === 'string' ? { target: buildOptions.compile } : {}),
					...(typeof buildOptions.compile === 'object' ? buildOptions.compile : {})
				}
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
		},

		vite: {
			plugins: {
				post: [
					{
						name: 'vite-plugin-sveltejs-adapter-bun',
						apply: 'build',
						config() {
							const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

							return {
								environments: {
									ssr: {
										build: {
											rolldownOptions: {
												// bundled with the app's server code so shared modules aren't duplicated
												input: { 'adapter-index': `${files}/index.js` },
												// only production dependencies (and their deep imports) stay external
												external: [
													handoff,
													...Object.keys(pkg.dependencies || {}).map(
														(d) => new RegExp(`^${d}(\\/.*)?$`)
													)
												],
												output: {
													paths: { [handoff]: '../adapter-bun.js' },
													// the hand-off path only holds at the output root, so adapter chunks may not nest
													chunkFileNames: (chunk) =>
														chunk.moduleIds.some((id) => id.startsWith(files))
															? 'adapter-bun-[name].js'
															: 'chunks/[name].js'
												}
											}
										}
									}
								}
							};
						}
					}
				]
			}
		}
	};
}

/**
 * The static route table, as data the bundled `src/assets.js` turns into a lookup at startup.
 * @param {object} options
 * @param {Builder} options.builder
 * @param {string} options.out
 * @param {boolean} options.embed
 * @param {boolean} options.precompress
 * @returns {Promise<string[]>}
 */
async function create_assets({ builder, out, embed, precompress }) {
	// executables embed the files from a staging directory instead of shipping them in `out`
	const dest = embed ? builder.getBuildDirectory('adapter-bun') : out;
	if (embed) fs.rmSync(dest, { recursive: true, force: true });

	const client_files = builder.writeClient(`${dest}/client`).filter((file) => !is_dotfile(file));
	const prerendered_files = builder.writePrerendered(`${dest}/prerendered`);

	if (precompress) {
		await Promise.all([
			builder.compress(`${dest}/client`),
			builder.compress(`${dest}/prerendered`)
		]);
	}

	/** @type {Map<string, string>} */
	const embedded = new Map();

	/**
	 * @param {string} helper
	 * @param {string} url
	 * @param {string} dir
	 * @param {string} [filename]
	 */
	const entry = async (helper, url, dir, filename = url) => {
		const file = `${dest}/${dir}/${filename}`;
		if (embed) embedded.set(file, `asset_${embedded.size}`);
		return `[${JSON.stringify(helper)}, ${JSON.stringify(url)}, ${embedded.get(file) ?? JSON.stringify(filename)}, ${JSON.stringify(await asset_meta(file, precompress))}]`;
	};

	const pages = [...builder.prerendered.pages];
	const page_files = new Set(pages.map(([_, { file }]) => file));

	const assets = await Promise.all([
		...client_files.map((file) => entry('client_asset', file, 'client')),
		...pages.map(([path, { file }]) => entry('prerendered_page', path, 'prerendered', file)),
		...prerendered_files
			.filter((file) => !page_files.has(file))
			.map((file) => entry('prerendered_asset', file, 'prerendered'))
	]);

	const server_assets = builder
		.findServerAssets(builder.routes.filter((route) => route.prerender !== true))
		.map((file) => {
			if (!embed) return `[${JSON.stringify(file)}]`;
			const asset = embedded.get(`${dest}/client/${file}`);
			if (asset === undefined) throw new Error(`Could not find server asset ${file}`);
			return `[${JSON.stringify(file)}, ${asset}]`;
		});

	const redirects = [...builder.prerendered.redirects].map(([src, { status, location }]) => {
		return [src, status, location];
	});

	return [
		...[...embedded].map(
			([file, asset]) =>
				`import ${asset} from ${JSON.stringify(path.resolve(file))} with { type: 'file' };`
		),
		`export const assets = [\n${assets.join(',\n')}\n];`,
		`export const redirects = ${JSON.stringify(redirects)};`,
		`export const server_assets = [\n${server_assets.join(',\n')}\n];`
	];
}
