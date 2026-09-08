import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import MagicString from 'magic-string';

const files = fileURLToPath(new URL('./files', import.meta.url).href);
const dir_id = posixify(`${files}/dir.js`);

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

			const server_entry = `${server}/server.js`;
			builder.generateServerInstance(server_entry);
			const server_code = readFileSync(server_entry, 'utf8');
			const runtime_import = "from './index.js'";

			if (!server_code.includes(runtime_import)) {
				throw new Error(`Could not find ${runtime_import} in generated server entry`);
			}

			writeFileSync(
				server_entry,
				server_code.replace(runtime_import, "from './server-runtime.js'")
			);

			rename_entry(server, 'index', 'server-runtime');
			rename_entry(server, 'adapter-index', 'index');

			if (builder.hasServerInstrumentationFile()) {
				builder.instrument({
					entrypoint: `${server}/index.js`,
					instrumentation: `${server}/instrumentation.server.js`,
					initializer: builder.createInstrumentationInitializer({ outputDirectory: server }),
					module: {
						exports: ['path', 'host', 'port', 'server']
					}
				});
			}

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
				plugins: {
					post: [
						{
							name: 'vite-plugin-sveltekit-adapter-node',
							apply: 'build',
							config() {
								const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

								return {
									environments: {
										ssr: {
											build: {
												rolldownOptions: {
													// Copy the prebuilt entrypoints into the build directory so that the
													// adapter's own bundled dependencies resolve correctly, then bundle them
													// together with the app's server code. Bundling everything in a single
													// pass means shared modules (e.g. `SvelteKitError` from `@sveltejs/kit`)
													// aren't duplicated. See https://github.com/sveltejs/kit/issues/15755
													input: {
														'adapter-index': `${files}/index.js`,
														'adapter-env': `${files}/adapter-env.js`,
														handler: `${files}/handler.js`
													},
													output: {
														chunkFileNames(chunk) {
															if (chunk.name === 'dir') return '[name].js';
															return 'chunks/[name].js';
														},
														codeSplitting: {
															groups: [
																{
																	name: 'dir',
																	test: dir_id
																}
															]
														}
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
							transform: {
								filter: { id: new RegExp(`^${escape_regex(posixify(files))}/`) },
								handler(code) {
									const s = new MagicString(code);

									for (const [from, to] of Object.entries(defines)) {
										for (const match of code.matchAll(new RegExp(`\\b${from}\\b`, 'g'))) {
											s.overwrite(match.index, match.index + from.length, to);
										}
									}

									return {
										code: s.toString(),
										map: s.generateMap({ hires: 'boundary' })
									};
								}
							},
							resolveId: {
								filter: { id: /^SERVER$/ },
								handler(_source, importer) {
									if (importer?.startsWith(`${posixify(files)}/`)) {
										return { external: true, id: '../server.js' };
									}
								}
							}
						}
					]
				}
			};
		}
	};
}

/**
 * @param {string} dir
 * @param {string} from
 * @param {string} to
 */
function rename_entry(dir, from, to) {
	const entry = `${dir}/${to}.js`;
	const map = `${entry}.map`;
	renameSync(`${dir}/${from}.js`, entry);

	if (existsSync(`${dir}/${from}.js.map`)) {
		renameSync(`${dir}/${from}.js.map`, map);

		const code = readFileSync(entry, 'utf8');
		const source_map_url = `sourceMappingURL=${from}.js.map`;
		if (!code.includes(source_map_url)) {
			throw new Error(`Could not find ${source_map_url} in ${entry}`);
		}
		writeFileSync(entry, code.replace(source_map_url, `sourceMappingURL=${to}.js.map`));

		const source_map = JSON.parse(readFileSync(map, 'utf8'));
		source_map.file = `${to}.js`;
		writeFileSync(map, JSON.stringify(source_map));
	}
}

/** @param {string} str */
function escape_regex(str) {
	// TODO replace with `RegExp.escape(str)` when we require Node >= 24
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** @param {string} str */
function posixify(str) {
	return str.replace(/\\/g, '/');
}
