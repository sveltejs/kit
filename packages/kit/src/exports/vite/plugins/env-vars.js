/** @import { Plugin, ResolvedConfig } from 'vite' */
/** @import { EnvVarConfig } from '@sveltejs/kit/env' */
/** @import { ValidatedConfig } from 'types' */
import path from 'node:path';
import * as sync from '../../../core/sync/sync.js';
import {
	create_sveltekit_env,
	create_sveltekit_env_exports,
	create_sveltekit_env_service_worker,
	resolve_env_entry
} from '../../../core/env.js';
import { import_peer } from '../../../utils/import.js';
import { runtime_directory } from '../../../core/utils.js';
import { s } from '../../../utils/misc.js';
import { write_if_changed } from '../../../core/sync/utils.js';
import { hash } from '../../../utils/hash.js';
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
	const version_hash = hash(config.version.name);

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

		write_if_changed(
			`${dir}/config.js`,
			create_sveltekit_env(
				vars,
				env,
				resolved_entry && posixify(path.relative(dir, resolved_entry)),
				!is_build
			)
		);

		write_if_changed(
			`${dir}/public/server.js`,
			create_sveltekit_env_exports(
				vars,
				env,
				true,
				`import { rendered_env as env } from '../config.js';`
			)
		);

		write_if_changed(
			`${dir}/private/server.js`,
			create_sveltekit_env_exports(
				vars,
				env,
				false,
				`import { dynamic_private_env as env } from '../config.js';`
			)
		);

		if (is_build) {
			write_if_changed(
				`${dir}/public/client.js`,
				create_sveltekit_env_exports(
					vars,
					env,
					true,
					`import { payload } from ${s(posixify(path.relative(`${dir}/public`, `${runtime_directory}/client/payload.js`)))};\nconst env = payload.env;`
				)
			);

			write_if_changed(
				`${dir}/service-worker.js`,
				create_sveltekit_env_service_worker(
					vars,
					env,
					config.version.name,
					`globalThis.__sveltekit_${version_hash}`,
					{ base: config.paths.base, app_dir: config.appDir }
				)
			);
		} else {
			write_if_changed(
				`${dir}/public/client.js`,
				create_sveltekit_env_exports(vars, env, true, `const { env } = globalThis.__sveltekit_dev;`)
			);

			write_if_changed(
				`${dir}/service-worker.js`,
				create_sveltekit_env_service_worker(
					vars,
					env,
					config.version.name,
					'globalThis.__sveltekit_dev',
					null
				)
			);
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

		configureServer(server) {
			// `handleHotUpdate` only fires for `change` events on files Vite already knows about,
			// so it doesn't cover the env entry being created or deleted while the dev server is
			// running. Watch for those events explicitly, re-resolve the entry, regenerate the
			// modules and trigger a full reload (mirroring the previous behaviour).
			const on_entry_add_unlink = async (/** @type {string} */ file) => {
				const resolved = resolve_env_entry(config, resolved_config.root);

				if (file === resolved_entry || file === resolved) {
					resolved_entry = resolved;
					await generate();
					server.hot.send({ type: 'full-reload' });
				}
			};

			server.watcher.on('add', on_entry_add_unlink);
			server.watcher.on('unlink', on_entry_add_unlink);
		},

		async handleHotUpdate(update) {
			if (!deps.has(update.file)) return;
			await generate();
		}
	};
}
