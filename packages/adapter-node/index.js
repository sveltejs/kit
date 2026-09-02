import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { rolldown } from 'rolldown';

const files = fileURLToPath(new URL('./files', import.meta.url).href);

/** @param {string} str */
function escape_regex(str) {
	// TODO replace with `RegExp.escape(str)` when we require Node >= 24
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** @type {typeof import('./index.js').default} */
export default function (opts = {}) {
	const { out = 'build', precompress = true, envPrefix = '' } = opts;

	return {
		name: '@sveltejs/adapter-node',
		async adapt(builder) {
			const tmp = builder.getBuildDirectory('adapter-node');

			fs.rmSync(out, { force: true, recursive: true });
			fs.rmSync(tmp, { force: true, recursive: true });
			fs.mkdirSync(tmp, { recursive: true });

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
				builder.prerenderedFiles,
				prerendered_compressed
			);

			builder.log.minor('Building server');

			const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
			const server = builder.getServerDirectory();

			// Copy the prebuilt entrypoints into the build directory so that the
			// adapter's own bundled dependencies resolve correctly, then bundle them
			// together with the app's server code. Bundling everything in a single
			// pass means shared modules (e.g. `SvelteKitError` from `@sveltejs/kit`)
			// aren't duplicated. See https://github.com/sveltejs/kit/issues/15755
			const entries = posixify(`${tmp}/entries`);
			builder.copy(files, entries);

			const dir_id = `${entries}/dir.js`;

			/** @type {Record<string, string>} */
			const input = {
				index: `${entries}/index.js`,
				'adapter-env': `${entries}/adapter-env.js`,
				env: `${server}/env.js`,
				handler: `${entries}/handler.js`
			};

			if (builder.hasServerInstrumentationFile()) {
				input.environment = builder.createInstrumentationInitializer({ outputDirectory: entries });
				input['instrumentation.server'] = `${server}/instrumentation.server.js`;
			}

			builder.generateServerInstance(`${server}/server.js`);

			/** @type {Record<string, string>} */
			const defines = {
				BASE_PATH: JSON.stringify(base),
				APP_PATH: JSON.stringify(builder.getAppPath()),
				MIME_TYPES: JSON.stringify(builder.mimeTypes),
				ASSETS: JSON.stringify(assets),
				PRERENDERED_ASSETS: JSON.stringify(prerendered_assets),
				ORIGIN: JSON.stringify(builder.config.paths.origin) || 'undefined',
				ENV_PREFIX: JSON.stringify(envPrefix)
			};

			// we bundle the Vite output so that deployments only need
			// their production dependencies. Anything in devDependencies
			// will get included in the bundled code
			const bundle = await rolldown({
				input,
				external: [
					// dependencies could have deep exports, so we need a regex
					...Object.keys(pkg.dependencies || {}).map((d) => new RegExp(`^${d}(\\/.*)?$`)),
					// `@opentelemetry/api` is an optional peer dependency of `@sveltejs/kit`,
					// so it's not in `pkg.dependencies` and wouldn't be matched by the regex above.
					// It must stay external so that `instrumentation.server.js` and the SvelteKit
					// runtime share a single instance — see https://github.com/sveltejs/kit/issues/16288
					/^@opentelemetry\/api(\/.*)?$/
				],
				platform: 'node',
				resolve: {
					conditionNames: ['node']
				},
				experimental: {
					nativeMagicString: true
				},
				plugins: [
					{
						// resolve the app's server and manifest, generated above
						name: 'adapter-node-resolve-app',
						resolveId: {
							filter: { id: /^SERVER$/ },
							handler() {
								return `${server}/server.js`;
							}
						}
					},
					{
						// replace build-time constants in the adapter's own entrypoints
						// only, so that identifiers in the app or its dependencies aren't
						// accidentally replaced
						name: 'adapter-node-replace-constants',
						transform: {
							filter: { id: new RegExp(escape_regex(entries)) },
							handler(_code, _id, { magicString }) {
								if (!magicString) throw new Error('experimental.nativeMagicString is not enabled');

								for (const [from, to] of Object.entries(defines)) {
									// remove $& and $N substitutions by replacing every $ with $$
									const value = to.replace(/\$/g, '$$$$');
									magicString.replace(new RegExp(`\\b${from}\\b`, 'g'), value);
								}

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
					initializer: `${out}/environment.js`,
					module: {
						exports: ['path', 'host', 'port', 'server']
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
 * @template {{ file: string }} T
 * @param {T[]} entries
 */
function by_file(entries) {
	return new Map(entries.map((entry) => [entry.file, entry]));
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
 * @param {import('@sveltejs/kit').Builder['prerenderedFiles']} files
 * @param {Array<{ file: string, gz: number, br: number }>} compressed
 * @returns {AssetTable}
 */
function create_prerendered_table(prerendered, files, compressed) {
	const measured = by_file(files);
	const variants = by_file(compressed);

	/** @type {Array<[string, AssetEntry]>} */
	const entries = [];

	for (const map of [prerendered.pages, prerendered.assets, prerendered.redirects]) {
		for (const [path, { file }] of map) {
			const entry = measured.get(file);
			if (entry) entries.push([path, to_entry(entry, variants.get(file))]);
		}
	}

	entries.sort(([a], [b]) => (a < b ? -1 : 1));

	return { entries, aliases: [] };
}

/** @param {string} str */
function posixify(str) {
	return str.replace(/\\/g, '/');
}
