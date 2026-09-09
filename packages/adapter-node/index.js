/** @import { TopLevelFilterExpression } from '@rolldown/pluginutils' */
import {
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	renameSync,
	rmSync,
	writeFileSync
} from 'node:fs';
import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { and, id, importerId, include } from '@rolldown/pluginutils';
import remapping from '@jridgewell/remapping';
import MagicString from 'magic-string';

const files = fileURLToPath(new URL('./files', import.meta.url).href);
const posixified_files = posixify(files);
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

			const output_server = `${out}/server`;
			builder.copy(server, output_server);

			// `dir.js` must evaluate at the output root because it anchors the asset directories
			renameSync(`${output_server}/dir.js`, `${out}/dir.js`);
			if (existsSync(`${output_server}/dir.js.map`)) {
				renameSync(`${output_server}/dir.js.map`, `${out}/dir.js.map`);
			}
			writeFileSync(`${output_server}/dir.js`, `export * from '../dir.js';\n`);

			// replace the stubs whose values are only known after the build
			replace_stubs(output_server, {
				__SVELTEKIT_ADAPTER_NODE_UNCOMPRESSED_EXTENSIONS__: `new Set(${JSON.stringify([...uncompressed_extensions])})`,
				__SVELTEKIT_ADAPTER_NODE_PRERENDERED__: `new Set(${JSON.stringify([...builder.prerendered.paths])})`,
				__SVELTEKIT_ADAPTER_NODE_MIMETYPES__: JSON.stringify(builder.mimeTypes)
			});

			writeFileSync(`${out}/index.js`, `export * from './server/adapter-index.js';\n`);
			writeFileSync(`${out}/handler.js`, `export * from './server/handler.js';\n`);
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
								filter: { id: new RegExp(`^${escape_regex(posixified_files)}/`) },
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
								// composable filters are not accepted type-wise but still work during build
								// see https://github.com/vitejs/rolldown-vite/issues/605
								filter: /** @type {any} */ (
									/** @satisfies {TopLevelFilterExpression[]} */ ([
										include(
											and(
												importerId(new RegExp(`^${escape_regex(posixified_files)}/`)),
												id(/^SERVER$/)
											)
										)
									])
								),
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

/**
 * @param {string} dir
 * @param {Record<string, string>} replacements
 */
function replace_stubs(dir, replacements) {
	const pattern = new RegExp(`\\b(${Object.keys(replacements).join('|')})\\b`, 'g');

	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const file = `${dir}/${entry.name}`;
		if (entry.isDirectory()) {
			replace_stubs(file, replacements);
		} else if (entry.name.endsWith('.js')) {
			const code = readFileSync(file, 'utf8');
			const s = new MagicString(code);
			let changed = false;

			for (const match of code.matchAll(pattern)) {
				s.overwrite(match.index, match.index + match[0].length, replacements[match[0]]);
				changed = true;
			}

			if (changed) {
				writeFileSync(file, s.toString());

				const map_file = `${file}.map`;
				if (existsSync(map_file)) {
					const map = remapping(
						[
							JSON.parse(s.generateMap({ hires: 'boundary', source: entry.name }).toString()),
							JSON.parse(readFileSync(map_file, 'utf8'))
						],
						() => null
					);
					writeFileSync(map_file, map.toString());
				}
			}
		}
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
