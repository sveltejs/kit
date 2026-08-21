/** @import { RemoteChunk, RemoteInternals, ServerMetadata, ValidatedConfig } from 'types' */
/** @import { Plugin, ViteDevServer } from 'vite' */
import path from 'node:path';
import { prefixRegex } from '@rolldown/pluginutils';
import MagicString from 'magic-string';
import { error_for_missing_config, is_remote_module, remote_module_pattern } from '../utils.js';
import { create_exported_declarations } from '../../../core/env.js';
import { dedent } from '../../../core/sync/utils.js';
import { runtime_directory } from '../../../core/utils.js';
import { get_runner } from '../../../runner.js';
import { hash } from '../../../utils/hash.js';
import { s } from '../../../utils/misc.js';
import { posixify } from '../../../utils/os.js';

/**
 * @param {ValidatedConfig} svelte_config
 * @param {() => { root: string; vite: typeof import('vite'); }} get_config
 * @param {() => ServerMetadata | null} get_build_metadata
 * @param {(remotes: RemoteChunk[], remote_original_by_hash: Map<string, string>) => void} set_remote_metadata
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

	return {
		name: 'vite-plugin-sveltekit-remote',
		perEnvironmentStartEndDuringDev: true,

		configResolved() {
			({ root, vite } = get_config());
		},

		configureServer(_dev_server) {
			dev_server = _dev_server;
		},

		applyToEnvironment(environment) {
			return svelte_config.experimental.remoteFunctions && environment.name !== 'serviceWorker';
		},

		buildStart() {
			// avoid stale data when building with watch mode
			if (this.environment.config.consumer === 'server') {
				remotes = [];
				remote_original_by_hash.clear();
				emitted_remote_hashes.clear();
			}

			build_metadata = get_build_metadata();
			set_remote_metadata(remotes, remote_original_by_hash);
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

				const file = posixify(path.relative(root, id));
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

					// Extra newlines to prevent syntax errors around missing semicolons or comments
					ms.append(
						'\n\n' +
							dedent`
								import * as $$_self_$$ from './${path.basename(id)}';
								import { init_remote_functions as $$_init_$$ } from '@sveltejs/kit/internal/server';

								${dev_server ? 'await Promise.resolve()' : ''}

								$$_init_$$($$_self_$$, ${s(file)}, ${s(remote.hash)});

								for (const [name, fn] of Object.entries($$_self_$$)) {
									fn.__.id = ${s(remote.hash)} + '/' + name;
									fn.__.name = name;
								}
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

				// in dev, load the server module here (which will result in this hook
				// being called again with `opts.ssr === true` if the module isn't
				// already loaded) so we can determine what it exports
				if (dev_server) {
					const module = await get_runner(vite, dev_server).import(id);

					for (const [name, value] of Object.entries(module)) {
						const type = value?.__?.type;
						if (type) map.set(name, type);
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
