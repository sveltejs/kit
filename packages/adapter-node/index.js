import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// posix so it matches the module ids Vite reports on every platform
const src = fileURLToPath(new URL('./src', import.meta.url).href).replaceAll('\\', '/');
const handoff = '#@sveltejs/adapter-node';

/** @type {typeof import('./index.js').default} */
export default function (opts = {}) {
	const { out = 'build', precompress = true, envPrefix = '' } = opts;

	return {
		name: '@sveltejs/adapter-node',
		async adapt(builder) {
			fs.rmSync(out, { force: true, recursive: true });

			const base = builder.config.paths.base;
			const client_dir = `${out}/client${base}`;
			const prerendered_dir = `${out}/prerendered${base}`;

			builder.log.minor('Copying assets');
			builder.writeClient(client_dir);
			builder.writePrerendered(prerendered_dir);

			if (precompress) builder.log.minor('Compressing assets');
			const [client_compressed, prerendered_compressed] = precompress
				? await Promise.all([builder.compress(client_dir), builder.compress(prerendered_dir)])
				: [[], []];

			const assets = create_asset_table(base, builder.clientFiles, client_compressed);
			const prerendered_assets = create_prerendered_table(
				builder.prerendered,
				prerendered_compressed
			);

			const server = builder.getServerDirectory();

			builder.generateServerInstance(`${server}/server.js`);

			if (builder.hasServerInstrumentationFile()) {
				builder.instrument({
					entrypoint: `${server}/adapter-index.js`,
					instrumentation: `${server}/instrumentation.server.js`,
					initializer: builder.createInstrumentationInitializer({ outputDirectory: server }),
					module: {
						exports: ['path', 'host', 'port', 'server']
					}
				});
			}

			builder.copy(server, `${out}/server`);

			// values only known after the build. `dir` needs the output root
			fs.writeFileSync(
				`${out}/adapter-node.js`,
				[
					`import { dirname } from 'node:path';`,
					`import { fileURLToPath } from 'node:url';`,
					`export { server } from './server/server.js';`,
					`export const dir = dirname(fileURLToPath(import.meta.url));`,
					`export const base = ${JSON.stringify(base)};`,
					`export const app_path = ${JSON.stringify(builder.getAppPath())};`,
					`export const origin = ${JSON.stringify(builder.config.paths.origin)};`,
					`export const env_prefix = ${JSON.stringify(envPrefix)};`,
					`export const mime_types = ${JSON.stringify(builder.mimeTypes)};`,
					// JSON.parse of a string loads about twice as fast as an object literal of the same size
					`export const assets = JSON.parse(${JSON.stringify(JSON.stringify(assets))});`,
					`export const prerendered_assets = JSON.parse(${JSON.stringify(JSON.stringify(prerendered_assets))});`
				].join('\n')
			);

			fs.writeFileSync(`${out}/index.js`, `export * from './server/adapter-index.js';\n`);
			fs.writeFileSync(`${out}/handler.js`, `export * from './server/handler.js';\n`);
		},

		supports: {
			read: () => true,
			instrumentation: () => true
		},

		vite: {
			plugins: {
				post: [
					{
						name: 'vite-plugin-sveltekit-adapter-node',
						apply: 'build',
						config() {
							const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

							return {
								environments: {
									ssr: {
										build: {
											rolldownOptions: {
												// bundled with the app's server code so shared modules aren't duplicated (#15755)
												input: {
													'adapter-index': `${src}/index.js`,
													'adapter-env': `${src}/env.js`,
													handler: `${src}/handler.js`
												},
												// only production dependencies (and their deep imports) stay external
												external: [
													handoff,
													...Object.keys(pkg.dependencies || {}).map(
														(d) => new RegExp(`^${d}(\\/.*)?$`)
													)
												],
												output: {
													paths: { [handoff]: '../adapter-node.js' },
													// the hand-off path only holds at the output root, so adapter chunks may not nest
													chunkFileNames: (chunk) =>
														chunk.moduleIds.some((id) => id.startsWith(src))
															? 'adapter-node-[name].js'
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
 * Dotfiles are not served, with the customary exception of `.well-known`
 * @param {string} file
 */
function is_hidden(file) {
	return file.split('/').some((segment) => segment[0] === '.') && !file.startsWith('.well-known/');
}

/**
 * @param {{ file: string, size: number, hash: string }} measured
 * @param {{ gz: number, br: number } | undefined} variants sizes of the `.gz` and `.br` files `builder.compress` wrote, if any
 * @returns {AssetEntry}
 */
function to_entry({ file, size, hash }, variants) {
	/** @type {AssetEntry} */
	const entry = { file, size, etag: hash };

	if (variants) {
		entry.gz = variants.gz;
		entry.br = variants.br;
	}

	return entry;
}

/**
 * @param {Array<{ file: string, gz: number, br: number }>} compressed
 */
function by_file(compressed) {
	return new Map(compressed.map((entry) => [entry.file, entry]));
}

/**
 * Keys the client files by URL: the exact pathname, plus the `/foo` and
 * `/foo/` forms of `foo.html`/`foo/index.html` files
 * @param {string} base
 * @param {Array<{ file: string, size: number, hash: string }>} files
 * @param {Array<{ file: string, gz: number, br: number }>} compressed
 * @returns {AssetTable}
 */
function create_asset_table(base, files, compressed) {
	const variants = by_file(compressed);

	/** @type {Array<[string, AssetEntry]>} */
	const entries = [];

	for (const measured of files) {
		if (is_hidden(measured.file)) continue;
		entries.push([`${base}/${measured.file}`, to_entry(measured, variants.get(measured.file))]);
	}

	entries.sort(([a], [b]) => (a < b ? -1 : 1));

	const keys = new Set(entries.map(([key]) => key));

	/** @type {Array<[string, string]>} */
	const aliases = [];

	/**
	 * @param {string} alias
	 * @param {string} key
	 */
	function alias(alias, key) {
		if (!keys.has(alias)) {
			keys.add(alias);
			aliases.push([alias, key]);
		}
	}

	// `/foo` and `/foo/` resolve to `foo.html`, or to `foo/index.html` when only that exists.
	// `foo.html` sorts first, so it claims the aliases (the resolution order sirv used)
	for (const [key, entry] of entries) {
		if (!entry.file.endsWith('.html')) continue;

		const is_index = entry.file === 'index.html' || entry.file.endsWith('/index.html');
		const with_slash = is_index ? key.slice(0, -'index.html'.length) : key.slice(0, -5) + '/';

		alias(with_slash, key);
		if (with_slash.length > 1) alias(with_slash.slice(0, -1), key);
	}

	return { entries, aliases };
}

/**
 * Keys the prerendered pages, assets and redirect stubs by the exact paths kit
 * prerendered, so a lookup hit is precisely one of those and every other
 * pathname (including the non-canonical trailing-slash form) misses
 * @param {import('@sveltejs/kit').Builder['prerendered']} prerendered
 * @param {Array<{ file: string, gz: number, br: number }>} compressed
 * @returns {AssetTable}
 */
function create_prerendered_table(prerendered, compressed) {
	const variants = by_file(compressed);

	/** @type {Array<[string, AssetEntry]>} */
	const entries = [];

	for (const map of [prerendered.pages, prerendered.assets, prerendered.redirects]) {
		for (const [path, measured] of map) {
			entries.push([path, to_entry(measured, variants.get(measured.file))]);
		}
	}

	entries.sort(([a], [b]) => (a < b ? -1 : 1));

	return { entries, aliases: [] };
}
