import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// posix so it matches the module ids Vite reports on every platform
const files = fileURLToPath(new URL('./files', import.meta.url).href).replaceAll('\\', '/');
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
			const client_files = builder.writeClient(client_dir);
			const prerendered_files = builder.writePrerendered(prerendered_dir);

			builder.log.minor(precompress ? 'Compressing and hashing assets' : 'Hashing assets');
			const [client_compressed, prerendered_compressed] = precompress
				? await Promise.all([builder.compress(client_dir), builder.compress(prerendered_dir)])
				: [[], []];

			const assets = create_asset_table(
				base,
				measure_files(client_dir, client_files, client_compressed)
			);
			const prerendered_assets = create_prerendered_table(
				base,
				measure_files(prerendered_dir, prerendered_files, prerendered_compressed),
				builder.prerendered.paths
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
													'adapter-index': `${files}/index.js`,
													'adapter-env': `${files}/adapter-env.js`,
													handler: `${files}/handler.js`
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
														chunk.moduleIds.some((id) => id.startsWith(files))
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
 * Size and content hash from one pass over the file, a buffer at a time
 * @param {string} file
 * @param {Buffer} buffer
 */
function measure(file, buffer) {
	const fd = fs.openSync(file, 'r');
	const hash = createHash('sha256');
	let size = 0;

	try {
		let read;
		while ((read = fs.readSync(fd, buffer)) > 0) {
			hash.update(buffer.subarray(0, read));
			size += read;
		}
	} finally {
		fs.closeSync(fd);
	}

	return { size, etag: hash.digest('base64url') };
}

/**
 * Size and content hash of every servable file, plus the sizes of the
 * compressed variants where `builder.compress` wrote them.
 * Files are read one at a time through a single buffer, so large outputs
 * neither exhaust file descriptors nor pile up in memory
 * @param {string} root
 * @param {string[]} files
 * @param {string[]} compressed
 * @returns {AssetEntry[]}
 */
function measure_files(root, files, compressed) {
	const variants = new Set(compressed);
	const buffer = Buffer.allocUnsafe(64 * 1024);

	/** @type {AssetEntry[]} */
	const entries = [];

	for (const file of files) {
		if (is_hidden(file)) continue;

		const abs = join(root, file);

		/** @type {AssetEntry} */
		const entry = { file, ...measure(abs, buffer) };

		// `builder.compress` writes a `.gz` and a `.br` variant of every file it returns
		if (variants.has(file)) {
			entry.gz = fs.statSync(`${abs}.gz`).size;
			entry.br = fs.statSync(`${abs}.br`).size;
		}

		entries.push(entry);
	}

	return entries;
}

/**
 * Keys the measured files by URL: the exact pathname, plus the `/foo` and
 * `/foo/` forms of `foo.html`/`foo/index.html` files
 * @param {string} base
 * @param {AssetEntry[]} measured
 * @returns {AssetTable}
 */
function create_asset_table(base, measured) {
	const entries = measured.map((entry) => /** @type {[string, AssetEntry]} */ ([
		`${base}/${entry.file}`,
		entry
	]));

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
 * Keys the measured files by the exact paths kit prerendered, so a lookup
 * hit is precisely a prerendered page, asset or redirect and every other
 * pathname (including the non-canonical trailing-slash form) misses
 * @param {string} base
 * @param {AssetEntry[]} measured
 * @param {string[]} paths
 * @returns {AssetTable}
 */
function create_prerendered_table(base, measured, paths) {
	const by_file = new Map(measured.map((entry) => [entry.file, entry]));

	/** @type {Array<[string, AssetEntry]>} */
	const entries = [];

	for (const path of paths) {
		// invert `output_filename` in kit's prerenderer
		const file = path.slice(base.length + 1) || 'index.html';
		const entry =
			by_file.get(file) ?? by_file.get(file + (file.endsWith('/') ? 'index.html' : '.html'));
		if (entry) entries.push([path, entry]);
	}

	entries.sort(([a], [b]) => (a < b ? -1 : 1));

	return { entries, aliases: [] };
}
