import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const files = fileURLToPath(new URL('./files', import.meta.url).href);

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

			const server = builder.getServerDirectory();

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
			builder.generateServerInstance(`${server}/server.js`);

			// replace the stubs whose values are only known after the build
			builder.copy(server, out, {
				replace: {
					__SVELTEKIT_ADAPTER_NODE_UNCOMPRESSED_EXTENSIONS__: `new Set(${JSON.stringify([...uncompressed_extensions])})`,
					__SVELTEKIT_ADAPTER_NODE_PRERENDERED__: `new Set(${JSON.stringify([...builder.prerendered.paths])})`,
					__SVELTEKIT_ADAPTER_NODE_MIMETYPES__: JSON.stringify(builder.mimeTypes)
				}
			});
		},

		supports: {
			read: () => true,
			instrumentation: () => true
		},

		vite({ config }) {
			return {
				plugins: {
					post: [
						{
							name: 'vite-plugin-sveltekit-adapter-node',
							apply: 'build',
							config() {
								const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

								/** @type {Record<string, string>} */
								const defines = {
									// these get replaced later in the adapt step
									UNCOMPRESSED_EXTENSIONS: '__SVELTEKIT_ADAPTER_NODE_UNCOMPRESSED_EXTENSIONS__',
									PRERENDERED: '__SVELTEKIT_ADAPTER_NODE_PRERENDERED__',
									MIME_TYPES: '__SVELTEKIT_ADAPTER_NODE_MIMETYPES__',

									BASE_PATH: JSON.stringify(config.paths.base),
									APP_PATH: JSON.stringify(
										`${config.paths.base.slice(1)}${config.paths.base ? '/' : ''}${config.appDir}`
									),
									ORIGIN: JSON.stringify(config.paths.origin) || 'undefined',
									ENV_PREFIX: JSON.stringify(envPrefix),
									PRECOMPRESS: JSON.stringify(precompress)
								};

								return {
									environments: {
										ssr: {
											// TODO: replace build-time constants in the adapter's own entrypoints only, so that identifiers in the app or its dependencies aren't accidentally replaced
											define: {
												...defines
											},
											build: {
												rolldownOptions: {
													// Copy the prebuilt entrypoints into the build directory so that the
													// adapter's own bundled dependencies resolve correctly, then bundle them
													// together with the app's server code. Bundling everything in a single
													// pass means shared modules (e.g. `SvelteKitError` from `@sveltejs/kit`)
													// aren't duplicated. See https://github.com/sveltejs/kit/issues/15755
													input: {
														// TODO: adapter-index.js should be index.js but we need to avoid overridding the sveltekit one
														'adapter-index': `${files}/index.js`,
														'adapter-env': `${files}/adapter-env.js`,
														handler: `${files}/handler.js`
													},
													// deployments only need their production dependencies.
													// Anything in devDependencies will get included in the
													// bundled code
													external: [
														// dependencies could have deep exports, so we need a regex
														...Object.keys(pkg.dependencies || {}).map(
															(d) => new RegExp(`^${d}(\\/.*)?$`)
														)
													]
												}
											}
										}
									}
								};
							},
							applyToEnvironment(environment) {
								return environment.name === 'ssr';
							},
							resolveId: {
								// TODO: only apply this to our own files, not the app's code or its dependencies
								filter: { id: /^SERVER$/ },
								handler() {
									return { external: true, id: '../server.js' };
								}
							}
						}
					]
				}
			};
		}
	};
}
