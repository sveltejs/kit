/** @import { TopLevelFilterExpression } from '@rolldown/pluginutils' */
/** @import { EnvVarConfig } from '@sveltejs/kit/env' */
/** @import { BuildData, ManifestData, Prerendered, ServerMetadata, RemoteChunk, ValidatedConfig } from 'types' */
/** @import { Manifest, Plugin, ResolvedConfig, Rolldown, UserConfig } from 'vite' */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { styleText } from 'node:util';
import { code, include } from '@rolldown/pluginutils';
import { build_server_nodes } from './build_server.js';
import { treeshake_prerendered_remotes } from './remote.js';
import { find_deps, resolve_symlinks } from './utils.js';
import { warn_overridden_config } from '../utils.js';
import { adapt } from '../../../core/adapt/index.js';
import { generate_manifest } from '../../../core/generate_manifest/index.js';
import analyse from '../../../core/postbuild/analyse.js';
import prerender from '../../../core/postbuild/prerender.js';
import * as sync from '../../../core/sync/sync.js';
import create_manifest_data from '../../../core/sync/create_manifest_data/index.js';
import { get_manifest_routes } from '../../../core/sync/write_app_manifest.js';
import { write_client_manifest } from '../../../core/sync/write_client_manifest.js';
import { logger, runtime_directory } from '../../../core/utils.js';
import { compact } from '../../../utils/array.js';
import { copy, read, resolve_entry } from '../../../utils/filesystem.js';
import { load_and_validate_params } from '../../../utils/params.js';
import { posixify } from '../../../utils/os.js';
import { stackless } from '../../../utils/error.js';
import { s } from '../../../utils/misc.js';

/**
 * @typedef {object} Config
 * @property {typeof import('vite')} vite
 * @property {UserConfig} initial_config
 * @property {string} root
 * @property {string} global_name
 * @property {string} kit_global
 * @property {string | null} service_worker_entry_file
 * @property {(relative_path: string) => boolean} sourcemapIgnoreList
 */

/**
 * @param {ValidatedConfig} kit
 * @param {() => Config} get_config
 * @param {(metadata: ServerMetadata) => void} set_build_metadata
 * @param {(data: ManifestData) => void} set_manifest_data
 * @param {() => Record<string, EnvVarConfig<any>> | null} get_explicit_env_config
 * @param {() => ({ remotes: RemoteChunk[]; remote_original_by_hash: Map<string, string> })} get_remote_metadata
 * @param {(fn: () => Promise<void>) => void} set_finalise
 * @returns {Plugin}
 */
export function plugin_compile(
	kit,
	get_config,
	set_build_metadata,
	set_manifest_data,
	get_explicit_env_config,
	get_remote_metadata,
	set_finalise
) {
	/** @type {typeof import('vite')} */
	let vite;
	/** @type {UserConfig} */
	let initial_config;
	/** @type {string} */
	let root;
	/** @type {string} */
	let global_name;
	/** @type {string | null} */
	let service_worker_entry_file;

	/** @type {string} */
	let out_dir;
	/** @type {string} */
	let out;
	/** @type {Record<string, string>} */
	let env;
	/** @type {ManifestData} */
	let manifest_data;

	/** @type {ResolvedConfig} */
	let vite_config;

	/** @type {Map<string, Rolldown.RolldownOutput['output']>} */
	const watch_build_output = new Map();
	/**
	 * A map showing which features (such as `$app/server:read`) are defined
	 * in which chunks, so that we can later determine which routes use which features
	 * @type {Record<string, string[]>}
	 */
	let tracked_features = {};
	/** @type {Manifest} */
	let vite_server_manifest;
	/** @type {Manifest | null} */
	let vite_client_manifest = null;
	/** @type {Prerendered} */
	let prerendered;

	return {
		name: 'vite-plugin-sveltekit-compile',

		apply: 'build',

		/**
		 * Build the SvelteKit-provided Vite config to be merged with the user's vite.config.js file.
		 * @see https://vitejs.dev/guide/api-plugin.html#config
		 */
		config: {
			// avoids overwriting the base setting that's also set by Vitest
			order: 'pre',
			handler(config, config_env) {
				let kit_global;
				let sourcemapIgnoreList;

				({
					root,
					global_name,
					kit_global,
					vite,
					initial_config,
					service_worker_entry_file,
					sourcemapIgnoreList
				} = get_config());

				const app_immutable = `${kit.appDir}/immutable`;

				out_dir = posixify(kit.outDir);
				out = `${out_dir}/output`;

				env = vite.loadEnv(config_env.mode, kit.env.dir, '');

				/** @type {Record<string, string>} */
				const server_input = {
					index: `${runtime_directory}/server/index.js`,
					internal: `<sveltekit:generated>/server.js`,
					env: '<sveltekit:generated>/env/config.js',
					['remote-entry']: `${runtime_directory}/app/server/remote/index.js`
				};

				manifest_data = create_manifest_data(kit, root);
				set_manifest_data(manifest_data);
				sync.all(kit, root, manifest_data);

				// add entry points for every endpoint...
				manifest_data.routes.forEach((route) => {
					if (route.endpoint) {
						const resolved = path.resolve(root, route.endpoint.file);
						const relative = decodeURIComponent(path.relative(kit.files.routes, resolved));
						const name = posixify(path.join('entries/endpoints', relative.replace(/\.js$/, '')));
						server_input[name] = resolved;
					}
				});

				// ...and every component used by pages...
				manifest_data.nodes.forEach((node) => {
					for (const file of [node.component, node.universal, node.server]) {
						if (file) {
							const resolved = path.resolve(root, file);
							const relative = decodeURIComponent(path.relative(kit.files.routes, resolved));

							const name = relative.startsWith('..')
								? posixify(path.join('entries/fallbacks', path.basename(file)))
								: posixify(path.join('entries/pages', relative.replace(/\.js$/, '')));
							server_input[name] = resolved;
						}
					}
				});

				// ...and the params file
				if (manifest_data.params) {
					server_input['entries/params'] = path.resolve(root, manifest_data.params);
				}

				// ...and the hooks files
				if (manifest_data.hooks.server) {
					server_input['entries/hooks.server'] = path.resolve(root, manifest_data.hooks.server);
				}
				if (manifest_data.hooks.universal) {
					server_input['entries/hooks.universal'] = path.resolve(
						root,
						manifest_data.hooks.universal
					);
				}

				// ...and the server instrumentation file
				const server_instrumentation = resolve_entry(
					path.join(kit.files.src, 'instrumentation.server')
				);
				if (server_instrumentation) {
					if (kit.adapter && !kit.adapter.supports?.instrumentation?.()) {
						throw new Error(`${server_instrumentation} is unsupported in ${kit.adapter.name}.`);
					}
					server_input['instrumentation.server'] = server_instrumentation;
				}

				/** @type {Record<string, string>} */
				const client_input = {};

				if (kit.output.bundleStrategy !== 'split') {
					client_input['bundle'] = `${runtime_directory}/client/bundle.js`;
				} else {
					client_input['entry/start'] = `${runtime_directory}/client/entry.js`;
					client_input['entry/payload'] = `${runtime_directory}/client/payload.js`;
					client_input['entry/app'] = `${out_dir}/generated/build/client-optimized/app.js`;
					manifest_data.nodes.forEach((node, i) => {
						if (node.component || node.universal) {
							client_input[`nodes/${i}`] =
								`${out_dir}/generated/build/client-optimized/nodes/${i}.js`;
						}
					});
				}

				const inline = kit.output.bundleStrategy === 'inline';

				/** @type {string} */
				const base = (kit.paths.assets || kit.paths.base) + '/';
				const root_to_assets = app_immutable + '/assets/';
				const assets_to_root =
					app_immutable
						.split('/')
						.map(() => '..')
						.join('/') + '/../';

				const relative = kit.paths.relative !== false || !!kit.paths.assets;

				/** @satisfies {UserConfig} */
				const new_config = {
					// Affects how Vite loads JS assets on the client.
					// If the initial HTML we render uses an absolute path for assets,
					// the additional chunks Vite loads must also use an absolute path.
					// Otherwise, you end up with additional chunks being loaded relative
					// to the current chunk rather than the root.
					base: relative ? './' : base,
					build: {
						cssCodeSplit: !inline,
						cssMinify: initial_config.build?.minify == null ? true : !!initial_config.build.minify,
						manifest: true,
						rolldownOptions: {
							output: {
								name: `${global_name}.app`,
								assetFileNames: `${app_immutable}/assets/[name].[hash][extname]`,
								hoistTransitiveImports: false,
								sourcemapIgnoreList
							},
							preserveEntrySignatures: 'strict',
							onwarn(warning, handler) {
								if (
									warning.code === 'IMPORT_IS_UNDEFINED' &&
									warning.id === `${out_dir}/generated/build/client-optimized/app.js`
								) {
									// ignore e.g. undefined `handleError` hook when
									// referencing `client_hooks.handleError`
									return;
								}

								handler(warning);
							},
							watch: {
								exclude: [
									// Ignore all siblings of config.outDir/generated
									`${out_dir}/generated/**`
								]
							}
						},
						emptyOutDir: false,
						ssrEmitAssets: true
					},
					worker: {
						rolldownOptions: {
							output: {
								entryFileNames: `${app_immutable}/workers/[name]-[hash].js`,
								chunkFileNames: `${app_immutable}/workers/chunks/[hash].js`,
								assetFileNames: `${app_immutable}/workers/assets/[name]-[hash][extname]`,
								hoistTransitiveImports: false
							}
						}
					},
					builder: {
						sharedConfigBuild: true,
						sharedPlugins: true
					},
					environments: {
						ssr: {
							build: {
								copyPublicDir: false,
								outDir: `${out}/server`,
								target: 'node22',
								rolldownOptions: {
									input: server_input,
									output: {
										entryFileNames: '[name].js',
										chunkFileNames: 'chunks/[name].js'
									}
								}
							},
							// these are stubs that will be replaced after the initial server build
							define: {
								__SVELTEKIT_HAS_SERVER_LOAD__: 'true',
								__SVELTEKIT_HAS_UNIVERSAL_LOAD__: 'true',
								__SVELTEKIT_PAYLOAD__: '{}'
							}
						},
						client: {
							build: {
								outDir: `${out}/client`,
								rolldownOptions: {
									input: inline ? client_input['bundle'] : client_input,
									output: {
										format: inline ? 'iife' : 'esm',
										entryFileNames: `${app_immutable}/[name].[hash].js`,
										chunkFileNames: (/** @type {Rolldown.PreRenderedChunk} */ chunk_info) => {
											// The manifest data chunk gets a fixed (non-hashed) filename so
											// that importers' content hashes are stable regardless of the
											// manifest content — this breaks the content-hash feedback loop
											if (chunk_info.name === 'sveltekit-manifest') {
												return `${kit.appDir}/manifest.js`;
											}
											return `${app_immutable}/chunks/[hash].js`;
										},
										codeSplitting:
											kit.output.bundleStrategy === 'split'
												? {
														groups: [
															{
																name: 'sveltekit-manifest',
																test: '<sveltekit:generated>/app-manifest.js'
															}
														]
													}
												: false
									},
									// This silences Rolldown warnings about not supporting `import.meta`
									// for the `iife` output format. We don't care because it's
									// only used in development and will be treeshaken away
									transform: inline
										? {
												define: {
													'import.meta': '{}'
												}
											}
										: undefined
								}
							},
							define: {
								__SVELTEKIT_PAYLOAD__:
									kit.output.bundleStrategy !== 'split' ? kit_global : 'undefined'
							}
						}
					},
					experimental: {
						// Allows us to use relative paths in as many places as we can
						renderBuiltUrl(filename, { ssr, hostType }) {
							if (hostType === 'js') {
								// SSR builds should use an absolute path in JS modules to
								// match the default Vite behaviour
								if (ssr) return base + filename;

								// We could always use a relative asset base path here, but it's better for performance not to.
								// E.g. Vite generates `new URL('/asset.png', import.meta).href` for a relative path vs just '/asset.png'.
								// That's larger and takes longer to run and also causes an HTML diff between SSR and client
								// causing us to do a more expensive hydration check.
								return { relative };
							}

							if (!relative) return;

							// ensure assets loaded by CSS files are loaded relative to the
							// CSS file rather than the default of relative to the root

							// _app/immutable/assets files
							if (filename.startsWith(root_to_assets)) {
								return `./${filename.slice(root_to_assets.length)}`;
							}

							// static dir files
							return assets_to_root + filename;
						}
					}
				};

				warn_overridden_config(config, new_config);

				return new_config;
			}
		},

		configResolved(resolved_config) {
			vite_config = resolved_config;
		},

		applyToEnvironment(environment) {
			return environment.name !== 'serviceWorker';
		},

		renderChunk: {
			// composable filters are not accepted type-wise but still work during build
			// see https://github.com/vitejs/rolldown-vite/issues/605
			filter: /** @type {any} */ (
				/** @satisfies {TopLevelFilterExpression[]} */ ([include(code('__SVELTEKIT_TRACK__'))])
			),
			handler(code, chunk) {
				// composable filters only work during build so we still need this guard for dev
				// see https://github.com/vitejs/rolldown-vite/issues/605
				if (code.includes('__SVELTEKIT_TRACK__')) {
					return {
						// Rolldown changes our single quotes to double quotes so we need it in the regex too
						code: code.replace(/__SVELTEKIT_TRACK__\(['"](.+?)['"]\)/g, (_, label) => {
							(tracked_features[chunk.name + '.js'] ??= []).push(label);
							// put extra whitespace at the end of the comment to preserve the source size and avoid interfering with source maps
							return `/* track ${label}            */`;
						}),
						map: null // TODO we may need to generate a sourcemap in future
					};
				}
			}
		},

		generateBundle(_options, bundle) {
			// a watched build returns a watcher rather than the build output from
			// `builder.build` so we need to retrieve it from the generateBundle hook
			if (this.meta.watchMode) {
				watch_build_output.set(
					this.environment.name,
					/** @type {Rolldown.RolldownOutput['output']} */ (Object.values(bundle))
				);
			}

			if (this.environment.config.consumer !== 'client') return;

			this.emitFile({
				type: 'asset',
				fileName: `${kit.appDir}/version.json`,
				source: s({ version: kit.version.name })
			});
		},

		async buildApp(builder) {
			fs.rmSync(out, { force: true, recursive: true });
			fs.mkdirSync(out, { recursive: true });

			const verbose = builder.config.logLevel === 'info' || builder.config.logLevel === undefined;
			const log = logger({ verbose });

			/** @type {(() => Promise<void>) | null} */
			let finalise;

			let ssr_build = await builder.build(builder.environments.ssr);

			/** @param {Rolldown.RolldownOutput['output']} server_chunks */
			const process_ssr_build = async (server_chunks) => {
				// Replace manifest placeholders in SSR output. `assets` and `routes`
				// are known from `manifest_data`. `immutable` and `prerendered` are not
				// known yet — they get sentinel strings that are replaced after
				// the client build and after prerendering respectively.
				replace_manifest_placeholder_variables(server_chunks, `${out}/server`, {
					assets: manifest_data.assets.map((asset) => ({ path: asset.file })),
					routes: get_manifest_routes(manifest_data.routes)
				});

				vite_server_manifest = /** @type {Manifest} */ (
					JSON.parse(read(`${out}/server/.vite/manifest.json`))
				);

				const manifest_path = `${out}/server/manifest-full.js`;
				const assets_path = `${kit.appDir}/immutable/assets`;

				/** @type {BuildData} */
				const build_data = {
					app_dir: kit.appDir,
					app_path: `${kit.paths.base.slice(1)}${kit.paths.base ? '/' : ''}${kit.appDir}`,
					manifest_data,
					out_dir: out,
					service_worker: service_worker_entry_file ? 'service-worker.js' : null, // TODO make file configurable?
					client: null,
					server_manifest: vite_server_manifest
				};

				const { remotes, remote_original_by_hash } = get_remote_metadata();

				fs.writeFileSync(
					manifest_path,
					`export const manifest = ${generate_manifest({
						build_data,
						prerendered: [],
						relative_path: '.',
						routes: manifest_data.routes,
						remotes,
						root
					})};\n`
				);

				// first, build server nodes without the client manifest so we can analyse it
				build_server_nodes(
					out,
					kit,
					manifest_data,
					vite_server_manifest,
					null,
					assets_path,
					server_chunks,
					root
				);

				log.info('Analysing routes');

				const { metadata } = await analyse({
					hash: kit.router.type === 'hash',
					manifest_path,
					manifest_data,
					server_manifest: vite_server_manifest,
					tracked_features,
					env,
					remotes,
					vite_config_file: vite_config.configFile
				});
				set_build_metadata(metadata);

				log.info('Building app');

				/** @type {Record<string, EnvVarConfig<any>> | null} */
				const explicit_env_config = get_explicit_env_config();
				/** @type {Array<{ path: string }> | null} */
				let immutable = null;

				const server_assets = `${out}/server/${assets_path}`;
				const client_assets = `${out}/client/${assets_path}`;

				const skip_client_build = manifest_data.nodes.every(
					(node) => node.page_options?.csr === false
				);

				if (skip_client_build) {
					copy(server_assets, client_assets);
					copy(kit.files.assets, `${out}/client`);
				} else {
					// ...and build the client
					write_client_manifest(
						kit,
						manifest_data,
						`${out_dir}/generated/build/client-optimized`,
						root,
						metadata.nodes
					);

					// Through the finished analysis we can now check if any node has server or universal load functions
					const nodes = Object.values(metadata.nodes);
					const has_server_load = nodes.some((node) => node.has_server_load);
					const has_universal_load = nodes.some((node) => node.has_universal_load);

					if (builder.environments.client.config.define) {
						builder.environments.client.config.define.__SVELTEKIT_HAS_SERVER_LOAD__ =
							s(has_server_load);
						builder.environments.client.config.define.__SVELTEKIT_HAS_UNIVERSAL_LOAD__ =
							s(has_universal_load);
					}

					const client_build = await builder.build(builder.environments.client);
					const client_chunks = await normalise_build(
						builder.environments.client.name,
						client_build,
						watch_build_output
					);

					// We use `build.ssrEmitAssets` so that asset URLs created from
					// imports in server-only modules correspond to files in the build,
					// but we don't want to copy over CSS imports as these are already
					// accounted for in the client bundle. In most cases it would be
					// a no-op, but for SSR builds `url(...)` paths are handled
					// differently (relative for client, absolute for server)
					// resulting in different hashes, and thus duplication
					const ssr_stylesheets = new Set(
						Object.values(vite_server_manifest)
							.map((chunk) => chunk.css ?? [])
							.flat()
					);

					if (fs.existsSync(server_assets)) {
						for (const file of fs.readdirSync(server_assets)) {
							const src = `${server_assets}/${file}`;
							const dest = `${client_assets}/${file}`;

							if (fs.existsSync(dest) || ssr_stylesheets.has(`${assets_path}/${file}`)) {
								continue;
							}

							copy(src, dest);
						}
					}

					vite_client_manifest = /** @type {Manifest} */ (
						JSON.parse(read(`${out}/client/.vite/manifest.json`))
					);

					/**
					 * @param {string} entry
					 * @param {boolean} [add_dynamic_css]
					 */
					const deps_of = (entry, add_dynamic_css = false) =>
						find_deps(
							/** @type {Manifest} */ (vite_client_manifest),
							posixify(path.relative(root, entry)),
							add_dynamic_css,
							root
						);

					// the inline bundle and stylesheet are deleted further down, after
					// being inlined into the page, so they must not appear in `immutable`
					/** @type {Set<string>} */
					const inlined = new Set();
					/** @type {Rolldown.OutputAsset | undefined} */
					let inline_style;

					if (kit.output.bundleStrategy === 'inline') {
						inline_style = /** @type {Rolldown.OutputAsset | undefined} */ (
							client_chunks.find(
								(chunk) =>
									chunk.type === 'asset' &&
									chunk.names.length === 1 &&
									chunk.names[0] === 'style.css'
							)
						);

						inlined.add(deps_of(`${runtime_directory}/client/bundle.js`).file);
						if (inline_style) inlined.add(inline_style.fileName);
					}

					// Replace manifest placeholders in client output. `immutable` is
					// computed from the Vite client manifest, `assets` and `routes`
					// from `manifest_data`. `prerendered` is left as a placeholder
					// for now — it's replaced after prerendering completes.
					immutable = collect_immutable(vite_client_manifest, kit.appDir, inlined);

					replace_manifest_placeholder_variables(client_chunks, `${out}/client`, {
						immutable,
						assets: manifest_data.assets.map((asset) => ({ path: asset.file })),
						routes: get_manifest_routes(manifest_data.routes)
					});

					// Now that the client build is done, replace the `build` sentinel
					// in the SSR output with the real build files
					replace_manifest_placeholder_strings(`${out}/server`, { immutable });

					const has_explicit_dynamic_public_env = Object.values(explicit_env_config ?? {}).some(
						(variable) => variable.public && !variable.static
					);

					// the app only depends on runtime public env if it imports `$app/env/public`
					// *and* at least one public env var is actually dynamic (non-static)
					const uses_env_dynamic_public =
						has_explicit_dynamic_public_env &&
						client_chunks.some(
							(chunk) =>
								chunk.type === 'chunk' &&
								chunk.modules[
									posixify(fs.realpathSync(`${out_dir}/generated/build/env/public/client.js`))
								]
						);

					if (kit.output.bundleStrategy === 'split') {
						const start_entry = posixify(
							path.relative(root, `${runtime_directory}/client/entry.js`)
						);
						const start = find_deps(vite_client_manifest, start_entry, false, root);
						const runtime_entry = resolve_symlinks(vite_client_manifest, start_entry, root).chunk
							.dynamicImports?.[0]; // client/entry.js dynamically imports client/client-entry.js
						if (!runtime_entry) throw new Error('Could not find the client runtime chunk');
						const runtime = find_deps(vite_client_manifest, runtime_entry, false, root);
						const app = deps_of(`${out_dir}/generated/build/client-optimized/app.js`);

						build_data.client = {
							start: start.file,
							app: app.file,
							imports: Array.from(
								new Set([
									...start.imports,
									runtime.file,
									...runtime.imports,
									app.file,
									...app.imports
								])
							),
							stylesheets: [...start.stylesheets, ...runtime.stylesheets, ...app.stylesheets],
							fonts: [...start.fonts, ...runtime.fonts, ...app.fonts],
							uses_env_dynamic_public
						};

						// In case of server-side route resolution, we create a purpose-built route manifest that is
						// similar to that on the client, with as much information computed upfront so that we
						// don't need to include any code of the actual routes in the server bundle.
						if (kit.router.resolution === 'server') {
							const nodes = manifest_data.nodes.map((node, i) => {
								if (node.component || node.universal) {
									const entry = `${out_dir}/generated/build/client-optimized/nodes/${i}.js`;
									const deps = deps_of(entry, true);
									const file = resolve_symlinks(
										/** @type {Manifest} */ (vite_client_manifest),
										`${out_dir}/generated/build/client-optimized/nodes/${i}.js`,
										root
									).chunk.file;

									return { file, css: deps.stylesheets };
								}
							});
							build_data.client.nodes = nodes.map((node) => node?.file);
							build_data.client.css = nodes.map((node) => node?.css);

							build_data.client.routes = compact(
								manifest_data.routes.map((route) => {
									if (!route.page) return;

									return {
										id: route.id,
										pattern: route.pattern,
										params: route.params,
										layouts: route.page.layouts.map((l) =>
											l !== undefined ? [metadata.nodes[l].has_server_load, l] : undefined
										),
										errors: route.page.errors,
										leaf: [metadata.nodes[route.page.leaf].has_server_load, route.page.leaf]
									};
								})
							);
						}
					} else {
						const start = deps_of(`${runtime_directory}/client/bundle.js`);

						build_data.client = {
							start: start.file,
							imports: start.imports,
							stylesheets: start.stylesheets,
							fonts: start.fonts,
							uses_env_dynamic_public
						};

						if (kit.output.bundleStrategy === 'inline') {
							build_data.client.inline = {
								script: read(`${out}/client/${start.file}`),
								style: /** @type {string | undefined} */ (inline_style?.source)
							};

							// the bundle and stylesheet are inlined into the page, so the
							// emitted files are never loaded
							fs.unlinkSync(`${out}/client/${start.file}`);
							fs.rmSync(`${out}/client/${start.file}.map`, { force: true });
							if (inline_style) fs.unlinkSync(`${out}/client/${inline_style.fileName}`);
						}
					}

					// regenerate manifest now that we have client entry...
					fs.writeFileSync(
						manifest_path,
						`export const manifest = ${generate_manifest({
							build_data,
							prerendered: [],
							relative_path: '.',
							routes: manifest_data.routes,
							remotes,
							root
						})};\n`
					);

					// regenerate nodes with the client manifest...
					build_server_nodes(
						out,
						kit,
						manifest_data,
						vite_server_manifest,
						vite_client_manifest,
						assets_path,
						client_chunks,
						root
					);
				}

				// ...and prerender
				let prerender_results;
				try {
					prerender_results = await prerender({
						hash: kit.router.type === 'hash',
						out,
						manifest_path,
						metadata,
						verbose,
						env,
						vite_config_file: vite_config.configFile,
						is_tty: process.stdout.isTTY
					});

					// this silly hack is necessary to ensure that stderr from prerender is flushed before we continue
					await new Promise((f) => setTimeout(f, 0));
				} catch (e) {
					if (e instanceof Error && e.message === '__handled__') {
						// error details are already logged inside `prerender`, don't duplicate them
						throw stackless('Prerendering failed');
					} else {
						// Unforeseen error, rethrow as-is
						throw e;
					}
				}

				prerendered = prerender_results.prerendered;

				// Replace the `prerendered` sentinel in both SSR and client output
				// with the real prerendered paths. The other sentinels (`build`)
				// were already replaced after the client build.
				const prerendered_paths = prerendered.paths.map((p) => {
					return { path: p.replace(kit.paths.base, '').slice(1) };
				});

				replace_manifest_placeholder_strings(`${out}/server`, { prerendered: prerendered_paths });
				replace_manifest_placeholder_strings(`${out}/client`, { prerendered: prerendered_paths });

				// For `inline` strategy, the entry file was deleted and read into
				// `build_data.client.inline.script` — replace the sentinel there too
				if (build_data.client?.inline?.script) {
					build_data.client.inline.script = build_data.client.inline.script.replaceAll(
						'"__sveltekit_manifest_prerendered__"',
						JSON.stringify(prerendered_paths)
					);
				}

				// generate a new manifest that doesn't include prerendered pages
				fs.writeFileSync(
					`${out}/server/manifest.js`,
					`export const manifest = ${generate_manifest({
						build_data,
						prerendered: prerendered.paths,
						relative_path: '.',
						routes: manifest_data.routes.filter(
							(route) => prerender_results.prerender_map.get(route.id) !== true
						),
						remotes,
						root
					})};\n`
				);

				await treeshake_prerendered_remotes(
					vite,
					out,
					remotes,
					remote_original_by_hash,
					metadata,
					process.cwd(),
					server_chunks,
					vite_config.build.sourcemap
				);

				// defer until after other buildApp hooks have run
				finalise = async () => {
					// defer creating the service worker to avoid other plugins from
					// overwriting it if they run a client environment build
					if (service_worker_entry_file) {
						log.info('Building service worker');

						// Add defines for `$app/manifest`
						builder.environments.serviceWorker.config.define = {
							...builder.environments.serviceWorker.config.define,

							__SVELTEKIT_MANIFEST_ASSETS__: s(
								manifest_data.assets.map((asset) => ({ path: asset.file }))
							),
							__SVELTEKIT_MANIFEST_IMMUTABLE__: s(immutable),
							__SVELTEKIT_MANIFEST_PRERENDERED__: s(prerendered_paths),
							__SVELTEKIT_MANIFEST_ROUTES__: s(get_manifest_routes(manifest_data.routes))
						};

						// we have to overwrite this because it can't be configured per environment in the config hook
						builder.environments.serviceWorker.config.experimental.renderBuiltUrl = (filename) => {
							return {
								runtime: `new URL(${JSON.stringify(filename)}, location.href).pathname`
							};
						};

						const service_worker_build = await builder.build(builder.environments.serviceWorker);
						await normalise_build(
							builder.environments.serviceWorker.name,
							service_worker_build,
							watch_build_output
						);
					}

					console.log(
						`\nRun ${styleText(['bold', 'cyan'], 'npm run preview')} to preview your production build locally.`
					);

					if (kit.adapter) {
						await adapt(
							kit,
							build_data,
							metadata,
							prerendered,
							prerender_results.prerender_map,
							log,
							remotes,
							vite_config,
							explicit_env_config
						);
					} else {
						log.warn('\nNo adapter specified');

						const link = styleText(['bold', 'cyan'], 'https://svelte.dev/docs/kit/adapters');
						console.log(
							`See ${link} to learn how to configure your app to run on the platform of your choosing`
						);
					}
				};
				set_finalise(finalise);
			};

			// `vite build`
			ssr_build = Array.isArray(ssr_build) ? ssr_build[0] : ssr_build;
			if ('output' in ssr_build) {
				await load_and_validate_params({
					routes: manifest_data.routes,
					params_path: manifest_data.params,
					root
				});

				return await process_ssr_build(ssr_build.output);
			}

			// `vite build --watch`
			let rebuild = false;

			const before_ssr_build_rerun = async () => {
				rebuild = true;

				// these are set once per plugin initialisation or when the config hook
				// runs. However, those don't re-run during watch mode. So, we need to
				// re-initialise them manually here
				manifest_data = create_manifest_data(kit, root);
				set_manifest_data(manifest_data);
				sync.all(kit, root, manifest_data);

				tracked_features = {};

				finalise = null;

				fs.mkdirSync(out, { recursive: true });

				await load_and_validate_params({
					routes: manifest_data.routes,
					params_path: manifest_data.params,
					root
				});
			};

			ssr_build.on('change', before_ssr_build_rerun);
			ssr_build.on('restart', before_ssr_build_rerun);

			/** @type {PromiseWithResolvers<void>} */
			const task = Promise.withResolvers();

			ssr_build.on('event', async (event) => {
				if (event.code === 'ERROR') {
					return task.reject();
				}

				if (event.code === 'BUNDLE_END') {
					try {
						await process_ssr_build(
							/** @type {Rolldown.RolldownOutput['output']} */ (
								watch_build_output.get(builder.environments.ssr.name)
							)
						);
						// buildApp hooks don't rerun in watch mode so we need to run
						// the deferred steps here on subsequent builds
						if (rebuild) await finalise?.();
					} catch (e) {
						return task.reject(e);
					} finally {
						await event.result.close();
					}
					return task.resolve();
				}
			});

			await task.promise;
		}
	};
}

/**
 * @param {() => Promise<void>} finalise
 * @returns {Plugin}
 */
export function plugin_adapter(finalise) {
	return {
		name: 'vite-plugin-sveltekit-adapter',
		apply: 'build',
		buildApp: {
			// this will run after any buildApp hooks provided by other Vite plugins
			// see https://vite.dev/guide/api-environment-frameworks#environments-during-build
			order: 'post',
			async handler() {
				await finalise();
			}
		}
	};
}

/**
 * Collects the content-hashed files of a Vite manifest, in the shape of
 * `$app/manifest`'s `immutable` export.
 *
 * @param {Manifest} manifest
 * @param {string} app_dir
 * @param {Set<string>} inlined files deleted from the output after being inlined into the page
 * @returns {Array<{ path: string }>}
 */
const collect_immutable = (manifest, app_dir, inlined) => {
	const prefix = `${app_dir}/immutable`;

	/** @type {Set<string>} */
	const files = new Set();

	/** @param {string} file */
	const add = (file) => {
		if (file.startsWith(prefix) && !inlined.has(file)) files.add(file);
	};

	for (const key in manifest) {
		const { file, css, assets } = manifest[key];
		add(file);
		if (css) for (let i = 0; i < css.length; i++) add(css[i]);
		if (assets) for (let i = 0; i < assets.length; i++) add(assets[i]);
	}

	return Array.from(files, (path) => ({ path }));
};

/**
 * Replaces manifest data placeholder identifiers in output chunks with real
 * values, or strings that are valid JS (so thecode doesn't crash during prerendering)
 * but findable on disk for later replacement by `replace_manifest_placeholder_strings`.
 *
 * @param {Rolldown.RolldownOutput['output']} chunks
 * @param {string} output_dir
 * @param {{
 *   immutable?: Array<{ path: string }>;
 *   assets?: Array<{ path: string }>;
 *   prerendered?: Array<{ path: string }>;
 *   routes?: Array<{ id: string; page: boolean; endpoint: boolean }>;
 * }} values
 */
const replace_manifest_placeholder_variables = (chunks, output_dir, values) => {
	/** @type {Record<string, string>} */
	const replacements = {
		__SVELTEKIT_MANIFEST_IMMUTABLE__: JSON.stringify(
			values.immutable ?? '__sveltekit_manifest_build__'
		),
		__SVELTEKIT_MANIFEST_ASSETS__: JSON.stringify(values.assets ?? '__sveltekit_manifest_files__'),
		__SVELTEKIT_MANIFEST_PRERENDERED__: JSON.stringify(
			values.prerendered ?? '__sveltekit_manifest_prerendered__'
		),
		__SVELTEKIT_MANIFEST_ROUTES__: JSON.stringify(values.routes ?? '__sveltekit_manifest_routes__')
	};

	for (const chunk of chunks) {
		if (chunk.type !== 'chunk') continue;
		if (!chunk.code.includes('__SVELTEKIT_MANIFEST_')) continue;

		let code = chunk.code;

		for (const [identifier, replacement] of Object.entries(replacements)) {
			code = code.replaceAll(identifier, replacement);
		}

		const file_path = `${output_dir}/${chunk.fileName}`;
		fs.writeFileSync(file_path, code);
	}
};

/**
 * Replaces manifest sentinel strings in files on disk with real values.
 * This is used for values that weren't known when the first replacement
 * pass ran (e.g. `build` wasn't known until after the client build,
 * `prerendered` wasn't known until after prerendering).
 *
 * @param {string} dir Directory to scan for .js files
 * @param {{
 *   immutable?: Array<{ path: string }>;
 *   prerendered?: Array<{ path: string }>;
 * }} values
 */
const replace_manifest_placeholder_strings = (dir, values) => {
	/** @type {Record<string, string>} */
	const replacements = {};

	if (values.immutable !== undefined) {
		replacements['__sveltekit_manifest_build__'] = JSON.stringify(values.immutable);
	}
	if (values.prerendered !== undefined) {
		replacements['__sveltekit_manifest_prerendered__'] = JSON.stringify(values.prerendered);
	}

	for (const file of fs.readdirSync(dir)) {
		const file_path = `${dir}/${file}`;
		const stat = fs.statSync(file_path);

		if (stat.isDirectory()) {
			replace_manifest_placeholder_strings(file_path, values);
			continue;
		}

		if (!file.endsWith('.js')) continue;

		let code = read(file_path);
		let changed = false;

		for (const [sentinel, replacement] of Object.entries(replacements)) {
			if (code.includes(sentinel)) {
				code = code.replaceAll(`"${sentinel}"`, replacement);
				changed = true;
			}
		}

		if (changed) {
			fs.writeFileSync(file_path, code);
		}
	}
};

/**
 * Normalises the build output to a consistent format, handling watch mode and multiple environments
 * @param {string} name The name of the environment
 * @param {Rolldown.RolldownOutput | Rolldown.RolldownOutput[] | Rolldown.RolldownWatcher} build The return value of builder.build
 * @param {Map<string, Rolldown.RolldownOutput['output']>} build_output_map
 * @returns {Promise<Rolldown.RolldownOutput['output']>}
 */
async function normalise_build(name, build, build_output_map) {
	if ('output' in build) {
		return build.output;
	}

	if (Array.isArray(build)) {
		return build[0].output;
	}

	/** @type {PromiseWithResolvers<void>} */
	const bundling = Promise.withResolvers();

	build.on('event', async (event) => {
		if (event.code === 'ERROR') {
			await build.close();
			return bundling.reject(event.error);
		}

		if (event.code === 'BUNDLE_END') {
			await build.close();
			return bundling.resolve();
		}
	});

	await bundling.promise;

	return /** @type {Rolldown.RolldownOutput['output']} */ (build_output_map.get(name));
}
