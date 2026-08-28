import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { extname } from 'node:path';
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

			rmSync(out, { force: true, recursive: true });
			rmSync(tmp, { force: true, recursive: true });
			mkdirSync(tmp, { recursive: true });

			builder.log.minor('Copying assets');
			const written = [
				...builder.writeClient(`${out}/client${builder.config.paths.base}`),
				...builder.writePrerendered(`${out}/prerendered${builder.config.paths.base}`)
			];

			/** @type {string[]} */
			let compressed = [];

			if (precompress) {
				builder.log.minor('Compressing assets');
				compressed = (
					await Promise.all([
						builder.compress(`${out}/client`),
						builder.compress(`${out}/prerendered`)
					])
				).flat();
			}

			const compressed_extensions = new Set(compressed.map((file) => extname(file)));
			// a pathname whose extension appears in neither set may be a route segment
			// resolving to a compressed `index.html`, so it must keep its `Vary` header
			const uncompressed_extensions = new Set(
				written.map((file) => extname(file)).filter((ext) => ext && !compressed_extensions.has(ext))
			);

			builder.log.minor('Building server');

			const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
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
				env: `${entries}/env.js`,
				handler: `${entries}/handler.js`
			};

			if (builder.hasServerInstrumentationFile()) {
				input['instrumentation.server'] = `${server}/instrumentation.server.js`;
			}

			builder.generateServerInstance(`${server}/server.js`);

			/** @type {Record<string, string>} */
			const defines = {
				UNCOMPRESSED_EXTENSIONS: `new Set(${JSON.stringify([...uncompressed_extensions])})`,
				BASE_PATH: JSON.stringify(builder.config.paths.base),
				APP_PATH: JSON.stringify(builder.getAppPath()),
				PRERENDERED: `new Set(${JSON.stringify(builder.prerendered.paths)})`,
				MIME_TYPES: JSON.stringify(builder.mimeTypes),
				ORIGIN: JSON.stringify(builder.config.paths.origin) || 'undefined',
				ENV_PREFIX: JSON.stringify(envPrefix),
				PRECOMPRESS: JSON.stringify(precompress)
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

/** @param {string} str */
function posixify(str) {
	return str.replace(/\\/g, '/');
}
