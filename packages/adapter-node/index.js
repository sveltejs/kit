import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { join } from 'node:path';
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
			const client_files = builder.writeClient(client_dir);
			const prerendered_files = builder.writePrerendered(prerendered_dir);

			builder.log.minor(precompress ? 'Compressing and hashing assets' : 'Hashing assets');
			const [client_compressed, prerendered_compressed] = precompress
				? await Promise.all([builder.compress(client_dir), builder.compress(prerendered_dir)])
				: [[], []];

			const assets = create_asset_table(
				base,
				await measure_files(client_dir, client_files, client_compressed)
			);
			const prerendered_assets = create_prerendered_table(
				base,
				await measure_files(prerendered_dir, prerendered_files, prerendered_compressed),
				builder.prerendered.paths
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
 * Size and content hash, from a single pass over the file
 * @param {string} file
 * @returns {Promise<[number, string]>}
 */
async function measure(file) {
	const hash = createHash('sha256');
	let size = 0;

	for await (const chunk of fs.createReadStream(file)) {
		hash.update(chunk);
		size += chunk.length;
	}

	return [size, hash.digest('base64url')];
}

/**
 * Dotfiles are not served, with the customary exception of `.well-known`
 * @param {string} file
 */
function is_hidden(file) {
	return file.split('/').some((segment) => segment[0] === '.') && !file.startsWith('.well-known/');
}

/**
 * Sizes and content hashes for every servable file, plus its compressed
 * variants where `builder.compress` wrote them
 * @param {string} root
 * @param {string[]} files
 * @param {string[]} compressed
 * @returns {Promise<AssetEntry[]>}
 */
function measure_files(root, files, compressed) {
	const variants = new Set(compressed);

	return Promise.all(
		files
			.filter((file) => !is_hidden(file))
			.map(async (file) => {
				const [size, etag] = await measure(join(root, file));

				/** @type {AssetEntry} */
				const entry = { file, size, etag };

				// `builder.compress` writes a `.gz` and a `.br` variant of every file it returns
				if (variants.has(file)) {
					entry.gz = await measure(join(root, `${file}.gz`));
					entry.br = await measure(join(root, `${file}.br`));
				}

				return entry;
			})
	);
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

	// `/foo` and `/foo/` resolve to `foo.html`, unless a `foo/index.html` exists,
	// in which case `foo.html` wins (matching the resolution order sirv used)
	for (const [key, entry] of entries) {
		if (!entry.file.endsWith('.html')) continue;
		if (entry.file === 'index.html' || entry.file.endsWith('/index.html')) continue;
		alias(key.slice(0, -5), key);
		alias(key.slice(0, -5) + '/', key);
	}

	for (const [key, entry] of entries) {
		if (entry.file !== 'index.html' && !entry.file.endsWith('/index.html')) continue;
		const with_slash = key.slice(0, -'index.html'.length);
		if (with_slash.length > 1) alias(with_slash.slice(0, -1), key);
		alias(with_slash, key);
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

/** @param {string} str */
function posixify(str) {
	return str.replace(/\\/g, '/');
}
