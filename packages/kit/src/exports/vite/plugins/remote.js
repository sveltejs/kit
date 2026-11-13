/** @import { RemoteChunk, RemoteInternals, ServerMetadata, ValidatedConfig } from 'types' */
/** @import { Plugin, ViteDevServer } from 'vite' */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { TraceMap, originalPositionFor } from '@jridgewell/trace-mapping';
import { prefixRegex } from '@rolldown/pluginutils';
import MagicString from 'magic-string';
import {
	error_for_missing_config,
	get_dev_origin,
	is_remote_module,
	query_pattern,
	remote_module_pattern
} from '../utils.js';
import { DEV_REMOTE_EXPORTS_HEADER } from '../../../constants.js';
import { create_exported_declarations } from '../../../core/env.js';
import { dedent } from '../../../core/sync/utils.js';
import { runtime_directory } from '../../../core/utils.js';
import { get_runner } from '../../../runner.js';
import { hash } from '../../../utils/hash.js';
import { s } from '../../../utils/misc.js';
import { posixify } from '../../../utils/os.js';
import { get_locator } from '../../../utils/vite.js';

/**
 * @param {ValidatedConfig} svelte_config
 * @param {() => { root: string; vite: typeof import('vite'); }} get_config
 * @param {() => ServerMetadata | null} get_build_metadata
 * @param {(remote_metadata: {remotes: RemoteChunk[]; remote_original_by_hash: Map<string, string>}) => void} set_remote_metadata
 * @returns {Plugin}
 */
export function plugin_remote(svelte_config, get_config, get_build_metadata, set_remote_metadata) {
	/** @type {string} */
	let root;
	/** @type {typeof import('vite')} */
	let vite;

	/** @type {ViteDevServer} */
	let dev_server;

	/** @type {ServerMetadata | null} */
	let build_metadata;

	/** @type {RemoteChunk[]} */
	let remotes = [];

	/** @type {Map<string, string>} Maps remote hash -> original module id */
	const remote_original_by_hash = new Map();
	/** @type {Set<string>} Track which remote hashes have already been emitted */
	const emitted_remote_hashes = new Set();

	/**
	 * loads a remote module in this process to find the types of its remote functions
	 * @param {string} id
	 * @returns {Promise<Record<string, RemoteInternals['type']>>}
	 */
	async function load_exports(id) {
		const module = await get_runner(vite, dev_server).import(id);

		/** @type {Record<string, RemoteInternals['type']>} */
		const exports = {};
		for (const [name, value] of Object.entries(module)) {
			const type = value?.__?.type;
			if (type) exports[name] = type;
		}

		return exports;
	}

	/**
	 * finds the types of the remote functions in a module, asking the server when the adapter renders
	 * elsewhere so the module only runs there
	 * @param {RemoteChunk} remote
	 * @param {string} id
	 * @returns {Promise<Record<string, RemoteInternals['type']>>}
	 */
	async function get_dev_exports(remote, id) {
		const respond = svelte_config.adapter?.dev?.respond;
		if (!respond) return load_exports(id);

		// the server loads remote modules by their hash, which it looks up in this list
		if (!remotes.some((existing) => existing.hash === remote.hash)) remotes.push(remote);

		const url = new URL(
			`${svelte_config.paths.base}/${svelte_config.appDir}/remote/${remote.hash}`,
			get_dev_origin(dev_server)
		);

		/** @type {Response} */
		let response;

		try {
			response = await respond(
				new Request(url, { headers: { [DEV_REMOTE_EXPORTS_HEADER]: 'true' } }),
				{
					getClientAddress: () => '127.0.0.1',
					resolve: async () => Response.json(await load_exports(id))
				}
			);
		} catch (error) {
			return fall_back(/** @type {Error} */ (error).message);
		}

		if (response.ok) return await response.json();

		// the module failed to load on the server, which loading it here would hide
		if (response.status >= 500) {
			throw new Error(`Failed to load ${remote.file} on the server: ${await response.text()}`);
		}

		// the request did not reach sveltekit, such as when a custom worker handled it
		return fall_back(`${response.status} ${response.statusText}`);

		/** @param {string} reason */
		function fall_back(reason) {
			dev_server.config.logger.warn(
				`Could not get the exports of ${remote.file} from the server, so it was loaded in the Vite process as well (${reason})`
			);
			return load_exports(id);
		}
	}

	return {
		name: 'vite-plugin-sveltekit-remote',

		configResolved() {
			({ root, vite } = get_config());
		},

		configureServer(_dev_server) {
			dev_server = _dev_server;
		},

		applyToEnvironment(environment) {
			return svelte_config.experimental.remoteFunctions && environment.name !== 'serviceWorker';
		},

		perEnvironmentStartEndDuringDev: true,

		buildStart() {
			// avoid stale data when building with watch mode
			if (this.meta.watchMode && this.environment.config.consumer === 'server') {
				remotes = [];
				remote_original_by_hash.clear();
				emitted_remote_hashes.clear();
			}

			build_metadata = get_build_metadata();
			set_remote_metadata({ remotes, remote_original_by_hash });
		},

		// prevent other plugins from resolving our remote virtual module
		resolveId: {
			filter: {
				id: prefixRegex('\0sveltekit-remote:')
			},
			handler(id) {
				return id;
			}
		},

		load: {
			filter: {
				id: prefixRegex('\0sveltekit-remote:')
			},
			handler(id) {
				// On-the-fly generated entry point for remote file just forwards the original module
				// We're not using manualChunks because it can cause problems with circular dependencies
				// (e.g. https://github.com/sveltejs/kit/issues/14679) and module ordering in general
				// (e.g. https://github.com/sveltejs/kit/issues/14590).
				const hash_id = id.slice('\0sveltekit-remote:'.length);
				const original = remote_original_by_hash.get(hash_id);
				if (!original) throw new Error(`Expected to find metadata for remote file ${id}`);
				return `import * as m from ${s(original)};\nexport default m;`;
			}
		},

		transform: {
			filter: {
				id: remote_module_pattern
			},
			async handler(code, id) {
				if (!is_remote_module(id)) return;

				// node_modules ids get a per-environment `?v=` query in dev, which must not affect the hash
				const file = posixify(path.relative(root, id.replace(query_pattern, '')));
				const remote = {
					hash: hash(file),
					file
				};

				if (this.environment.config.consumer === 'server') {
					remotes.push(remote);

					// we need to add an `await Promise.resolve()` because if the user imports this function
					// on the client AND in a load function when loading the client module we will trigger
					// an import during dev. During a link preload, the module can be mistakenly
					// loaded and transformed twice and the first time all its exports would be undefined
					// triggering a dev server error. By adding a microtask we ensure that the module is fully loaded
					const ms = new MagicString(code);

					let dev_decoration = '';
					// Decorate remotes with line number references
					if (dev_server) {
						dev_decoration = `, ${s({
							file: pathToFileURL(path.resolve(root, file))
						})}`;
						const locate = get_locator(code);
						const map = new TraceMap(
							/** @type {ReturnType<typeof this.getCombinedSourcemap> & { version: 3 }} */ (
								this.getCombinedSourcemap()
							)
						);

						const ast = this.parse(code);
						for (const statement of ast.body) {
							if (statement.type !== 'ExportNamedDeclaration') continue;
							if (!statement.declaration) continue;
							if (statement.declaration.type !== 'VariableDeclaration') continue;
							// This is currently deliberately only scoped to remotes that are exported directly.
							// It won't catch reexports, but the fallback behavior is jumping to the file instead
							// of directly to the line number, which is acceptable.
							for (const declaration of statement.declaration.declarations) {
								if (declaration.id.type !== 'Identifier') continue;
								const loc = locate(declaration.start);
								const { line, column } = originalPositionFor(map, {
									line: loc.line + 1,
									column: loc.column
								});
								// unmapped positions fall back to linking to the file
								if (line === null) continue;
								ms.appendRight(
									statement.end,
									'\n' +
										dedent`
											if (${declaration.id.name}?.__) {
												${declaration.id.name}.__.dev_loc = ${s({ line, column })}
											}
										`
								);
							}
						}
					}

					// Extra newlines to prevent syntax errors around missing semicolons or comments
					ms.append(
						'\n\n' +
							dedent`
								import * as $$_self_$$ from './${path.basename(id)}';
								import { init_remote_functions as $$_init_$$ } from '@sveltejs/kit/internal/server';

								${dev_server ? 'await Promise.resolve()' : ''}

								$$_init_$$($$_self_$$, ${s(file)}, ${s(remote.hash)}${dev_decoration});
							`
					);

					// Emit a dedicated entry chunk for this remote in SSR builds (prod only)
					if (!dev_server) {
						remote_original_by_hash.set(remote.hash, id);

						if (!emitted_remote_hashes.has(remote.hash)) {
							this.emitFile({
								type: 'chunk',
								id: `\0sveltekit-remote:${remote.hash}`,
								name: `remote-${remote.hash}`
							});
							emitted_remote_hashes.add(remote.hash);
						}
					}

					return {
						code: ms.toString(),
						map: ms.generateMap({ hires: 'boundary' })
					};
				}

				// For the client, read the exports and create a new module that only contains fetch functions with the correct metadata

				/** @type {Map<string, RemoteInternals['type']>} */
				const map = new Map();

				// in dev, find what the server module exports, which loads it if it is not loaded yet
				if (dev_server) {
					for (const [name, type] of Object.entries(await get_dev_exports(remote, id))) {
						map.set(name, type);
					}
				}
				// in prod, we already built and analysed the server code before
				// building the client code, so `remotes` is populated
				else if (build_metadata?.remotes) {
					const exports = build_metadata.remotes.get(remote.hash);
					if (!exports) throw new Error('Expected to find metadata for remote file ' + id);

					for (const [name, value] of exports) {
						map.set(name, value.type);
					}
				}

				const { namespace, declarations, reexports } = create_exported_declarations(
					map.keys(),
					(name, ns) => `${ns}.${map.get(name)}('${remote.hash}/${name}')`,
					'__remote'
				);

				const relative = posixify(
					path.relative(path.dirname(id), `${runtime_directory}/client/remote-functions/index.js`)
				);

				let result = `import * as ${namespace} from '${relative}';\n\n${declarations.join('\n')}`;
				if (reexports.length > 0) {
					result += `\nexport { ${reexports.join(', ')} };`;
				}
				result += '\n';

				if (dev_server) {
					result += `\nimport.meta.hot?.accept();\n`;
				}

				return {
					code: result,
					map: null
				};
			}
		}
	};
}

/**
 * @param {ValidatedConfig} svelte_config
 * @returns {Plugin}
 */
export function plugin_remote_guard(svelte_config) {
	return {
		name: 'vite-plugin-sveltekit-remote-guard',

		applyToEnvironment() {
			return !svelte_config.experimental.remoteFunctions;
		},

		transform: {
			filter: {
				id: new RegExp(
					`.remote(${svelte_config.moduleExtensions.join('|')})$`.replaceAll('.', '\\.')
				)
			},
			handler() {
				error_for_missing_config('remote functions', 'experimental.remoteFunctions', 'true');
			}
		}
	};
}
