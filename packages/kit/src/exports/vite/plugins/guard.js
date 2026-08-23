/** @import { TopLevelFilterExpression } from '@rolldown/pluginutils' */
/** @import { ManifestData, ValidatedConfig } from 'types' */
/** @import { Plugin } from 'vite' */
import path from 'node:path';
import { and, exactRegex, importerId, include, not } from '@rolldown/pluginutils';
import { app_env_private, app_server } from '../module_ids.js';
import {
	error_for_missing_config,
	normalize_id,
	remote_module_pattern,
	server_only_directory_pattern,
	server_only_module_pattern
} from '../utils.js';
import { stackless } from '../../../utils/error.js';
import { posixify } from '../../../utils/os.js';

/**
 * Ensures that client-side code can't accidentally import server-side code,
 * whether in `*.server.js` files, `$app/server`, any `/server/` directory, or `$app/env/private`
 * @param {ValidatedConfig} kit
 * @param {() => { vite: typeof import('vite'); root: string; normalized_aliases: Array<{ alias: string, path: string }>; service_worker_entry_file: string | null; }} get_config
 * @param {() => ManifestData} get_manifest_data
 * @returns {Plugin}
 */
export function plugin_guard(kit, get_config, get_manifest_data) {
	/** @type {string} */
	let root;

	/** @type {string} */
	let normalized_cwd;
	/** @type {Array<{ alias: string, path: string }>} */
	let normalized_aliases;
	/** @type {string} */
	let normalized_node_modules;
	/** @type {string} */
	let normalized_routes;
	/** @type {string} */
	let normalized_assets;

	/** @type {string | null} */
	let service_worker_entry_file;

	/** @type {Map<string, Set<string>>} */
	const import_map = new Map();

	return {
		name: 'vite-plugin-sveltekit-guard',

		// Run this plugin before built-in resolution, so that relative imports
		// are added to the module graph
		enforce: 'pre',

		configResolved() {
			/** @type {typeof import('vite')} */
			let vite;
			({ vite, root, normalized_aliases, service_worker_entry_file } = get_config());

			normalized_cwd = vite.normalizePath(root);
			normalized_node_modules = vite.normalizePath(path.resolve(root, 'node_modules'));
			normalized_routes = vite.normalizePath(path.resolve(root, kit.files.routes));
			normalized_assets = vite.normalizePath(path.resolve(root, kit.files.assets));
		},

		applyToEnvironment(environment) {
			// the import map is only read for client-side violations in `load`, so skip other environments
			return environment.config.consumer === 'client';
		},

		resolveId: {
			// composable filters are not accepted type-wise but still work during build
			// see https://github.com/vitejs/rolldown-vite/issues/605
			filter: /** @type {any} */ (
				/** @satisfies {TopLevelFilterExpression[]} */ ([
					include(and(importerId(/.+/), not(importerId(/index\.html$/))))
				])
			),
			async handler(id, importer, options) {
				// composable filters only work during build so we still need this guard for dev
				// see https://github.com/vitejs/rolldown-vite/issues/605
				if (importer && !importer.endsWith('index.html')) {
					const resolved = await this.resolve(id, importer, { ...options, skipSelf: true });

					if (resolved) {
						const normalized = normalize_id(resolved.id, normalized_aliases, normalized_cwd);

						let importers = import_map.get(normalized);

						if (!importers) {
							importers = new Set();
							import_map.set(normalized, importers);
						}

						importers.add(normalize_id(importer, normalized_aliases, normalized_cwd));
					}
				}
			}
		},

		load: {
			filter: {
				id: [
					exactRegex(app_server),
					exactRegex(app_env_private),
					server_only_module_pattern,
					server_only_directory_pattern
				]
			},
			handler(id) {
				const normalized = normalize_id(id, normalized_aliases, normalized_cwd);

				let is_server_only = normalized === '$app/env/private' || normalized === '$app/server';

				// skip .server.js files outside the cwd or in node_modules, as the filename might not mean 'server-only module' in this context
				if (id.startsWith(normalized_cwd + '/') && !id.startsWith(normalized_node_modules + '/')) {
					// e.g. `server.ts` or `foo.server.ts`
					is_server_only ||= server_only_module_pattern.test(id);

					// e.g. `server/foo.ts`, unless in `src/routes` or `static`
					is_server_only ||=
						server_only_directory_pattern.test(id) &&
						!id.startsWith(normalized_routes + '/') &&
						!id.startsWith(normalized_assets + '/');
				}

				if (!is_server_only) return;

				const manifest_data = get_manifest_data();

				/** @type {Set<string>} */
				const entrypoints = new Set();

				/**
				 * Entrypoints must be normalized like the import map keys, or files
				 * outside the project root (e.g. hooks) would never match an importer
				 * @param {string} file - absolute, or relative to the project root
				 */
				const add_entrypoint = (file) => {
					entrypoints.add(
						normalize_id(posixify(path.resolve(root, file)), normalized_aliases, normalized_cwd)
					);
				};

				for (const node of manifest_data.nodes) {
					if (node.component) add_entrypoint(node.component);
					if (node.universal) add_entrypoint(node.universal);
				}

				if (manifest_data.hooks.client) add_entrypoint(manifest_data.hooks.client);
				if (manifest_data.hooks.universal) add_entrypoint(manifest_data.hooks.universal);

				if (service_worker_entry_file) {
					add_entrypoint(service_worker_entry_file);
				}

				// Walk up the import graph from the server-only module, looking for a chain
				// that leads back to a client entrypoint. We search all candidates (not just
				// the first) because a module can be imported by both server and client code,
				// and a greedy first-match could follow a server-only branch that never
				// reaches an entrypoint — see https://github.com/sveltejs/kit/issues/16232
				/** @type {Set<string>} */
				const visited = new Set([normalized]);

				/**
				 * @param {string} current
				 * @param {string[]} chain
				 * @returns {string[] | null}
				 */
				function find_chain(current, chain) {
					const importers = import_map.get(current);
					if (!importers) return null;

					for (const importer of importers) {
						if (visited.has(importer)) continue;
						visited.add(importer);

						const next_chain = [...chain, importer];
						if (entrypoints.has(importer)) {
							return next_chain;
						}
						const result = find_chain(importer, next_chain);
						if (result) return result;
					}
					return null;
				}

				const chain = find_chain(normalized, [normalized]);

				if (chain) {
					if (chain.some((id) => remote_module_pattern.test(id))) {
						error_for_missing_config('remote functions', 'experimental.remoteFunctions', 'true');
					}

					const pyramid = chain
						.reverse()
						.map((id, i) => {
							return `${' '.repeat(i + 1)}${id}`;
						})
						.join(' imports\n');

					let message = `Cannot import ${normalized} into code that runs in the browser, as this could leak sensitive information.`;
					message += `\n\n${pyramid}`;
					message += `\n\nIf you're only using the import as a type, change it to \`import type\`.`;

					throw stackless(message);
				}

				// No chain from this server-only module to a client entrypoint was found —
				// the module is only imported from server code, which is valid.
			}
		},

		// avoid watch mode rebuilds using stale import map data
		buildEnd() {
			import_map.clear();
		}
	};
}
