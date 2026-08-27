/** @import { Plugin, ResolvedConfig } from 'vite' */
/** @import { EnvVarConfig } from '@sveltejs/kit/env' */
/** @import { ValidatedConfig } from 'types' */
import path from 'node:path';
import { exactRegex } from '@rolldown/pluginutils';
import * as sync from '../../../core/sync/sync.js';
import { create_env_modules, resolve_env_entry } from '../../../core/env.js';
import { import_peer } from '../../../utils/import.js';
import { write_if_changed } from '../../../core/sync/utils.js';
import { posixify } from '../../../utils/os.js';

/**
 * Generate (and, in dev, maintain) the `${outDir}/generated/{build,dev}/env` modules
 * derived from `src/env.ts`
 *
 * @param {ValidatedConfig} config
 * @param {(variables: Record<string, EnvVarConfig<any>> | null) => void} callback
 * @returns {Plugin}
 */
export function plugin_env_vars(config, callback) {
	/** @type {string} */
	let dir;

	/** @type {Record<string, any>} */
	let env;

	/** @type {ResolvedConfig} */
	let resolved_config;

	/** @type {string | null} */
	let resolved_entry = null;

	/** @type {Set<string>} */
	let deps = new Set();

	let is_build = false;

	/** @type {Promise<void> | undefined} */
	let generated;

	async function generate() {
		const synced = await sync.env(
			config,
			resolved_entry,
			resolved_config.root,
			resolved_config.mode
		);

		deps = synced.deps;

		const vars = synced.variables;
		callback(vars);

		const modules = create_env_modules(
			config,
			vars,
			env,
			dir,
			resolved_entry && posixify(path.relative(dir, resolved_entry)),
			!is_build
		);

		for (const [file, code] of Object.entries(modules)) {
			write_if_changed(`${dir}/${file}`, code);
		}
	}

	return {
		name: 'vite-plugin-sveltekit-env-vars',

		async configResolved(c) {
			resolved_config = c;

			const vite = await import_peer('vite', c.root);
			env = vite.loadEnv(c.mode, path.resolve(c.root, config.env.dir), '');

			is_build = c.command === 'build';

			dir = posixify(
				path.resolve(c.root, config.outDir, `generated/${is_build ? 'build' : 'dev'}/env`)
			);
		},

		async buildStart() {
			// runs once via the memo — per-process, whichever environment starts first
			// (environment names vary by adapter), and never in the postbuild forks,
			// which resolve the config without building
			await (generated ??= (async () => {
				resolved_entry = resolve_env_entry(config, resolved_config.root);
				await generate();
			})());
		},

		async hotUpdate({ type, file }) {
			// runs for every environment; the generated modules are shared, so do the work once
			if (this.environment.name !== 'client') return;

			if (type === 'update') {
				if (deps.has(file)) await generate();
				return;
			}

			// the env entry was created or deleted: re-resolve it and reload
			const resolved = resolve_env_entry(config, resolved_config.root);
			if (file !== resolved_entry && file !== resolved) return;

			resolved_entry = resolved;
			await generate();
			this.environment.hot.send({ type: 'full-reload' });
		}
	};
}

/**
 * @param {() => string | null} get_service_worker_entry_file
 * @returns {Plugin}
 */
export function plugin_service_worker_env_vars(get_service_worker_entry_file) {
	/** @type {string | null} */
	let service_worker_entry_file;

	/** @satisfies {Plugin} */
	const plugin = {
		name: 'vite-plugin-sveltekit-service-worker-env',
		configResolved() {
			service_worker_entry_file = get_service_worker_entry_file();

			if (service_worker_entry_file) {
				plugin.transform.filter = {
					id: exactRegex(service_worker_entry_file)
				};
			}
		},
		applyToEnvironment(environment) {
			return !!service_worker_entry_file && environment.config.consumer === 'client';
		},
		transform: {
			filter: {},
			handler(code) {
				// prepend the service worker with an import that configures
				// `env`, in case `$app/env/public` is imported. In production
				// this is required: dynamic public env vars aren't known at
				// build time, so `env.js` is loaded at runtime. In dev, the
				// imported module just inlines the current values instead.
				return {
					code: `import '<sveltekit:generated>/env/service-worker.js';\n${code}`
				};
			}
		}
	};

	return plugin;
}
