/** @import { Plugin, ResolvedConfig } from 'vite' */
/** @import { EnvVarConfig } from '@sveltejs/kit/env' */
/** @import { ValidatedConfig } from 'types' */
import path from 'node:path';
import * as sync from '../../../core/sync/sync.js';
import { resolve_entry } from '../../../utils/filesystem.js';
import {
	create_sveltekit_env,
	create_sveltekit_env_dev,
	create_sveltekit_env_private,
	create_sveltekit_env_public,
	create_sveltekit_env_service_worker,
	create_sveltekit_env_service_worker_dev
} from '../../../core/env.js';
import { import_peer } from '../../../utils/import.js';
import { runtime_directory } from '../../../core/utils.js';
import { s } from '../../../utils/misc.js';
import { write_if_changed } from '../../../core/sync/utils.js';
import { hash } from '../../../utils/hash.js';
import { posixify } from '../../../utils/os.js';
import { prefixRegex } from '@rolldown/pluginutils';

/**
 * Generate (and, in dev, maintain) a `${outDir}/generated/env/config.js` module
 * derived from `src/env.ts`
 *
 * @param {ValidatedConfig} config
 * @param {(variables: Record<string, EnvVarConfig<any>> | null) => void} callback
 * @returns {Plugin}
 */
export function plugin_env_vars(config, callback) {
	// grab these values eagerly because they get mutated (TODO stop mutating them)
	const entry = path.join(config.files.src, 'env');
	const dir = config.env.dir;
	const out = config.outDir;

	const version_hash = hash(config.version.name);

	/** @type {string} */
	let out_dir;

	/** @type {Record<string, any>} */
	let env;

	/** @type {ResolvedConfig} */
	let resolved_config;

	/** @type {string | null} */
	let resolved_entry = null;

	/** @type {Set<string>} */
	let deps = new Set();

	let is_build = false;

	async function generate() {
		const synced = await sync.env(
			config,
			resolved_entry,
			resolved_config.root,
			resolved_config.mode
		);

		deps = synced.deps;

		const vars = synced.variables;
		const dir = `${out_dir}/generated/env`;

		write_if_changed(
			`${dir}/config.js`,
			create_sveltekit_env(vars, env, resolved_entry && path.relative(dir, resolved_entry))
		);

		write_if_changed(`${dir}/config-dev.js`, create_sveltekit_env_dev(vars, env));

		write_if_changed(
			`${dir}/public/client.js`,
			create_sveltekit_env_public(
				vars,
				env,
				`import { payload } from ${s(path.relative(`${dir}/client`, `${runtime_directory}/client/payload.js`))};\nconst env = payload.env;`
			)
		);

		write_if_changed(
			`${dir}/public/server.js`,
			create_sveltekit_env_public(
				vars,
				env,
				`import { rendered_env as env } from '__sveltekit/env';`
			)
		);

		write_if_changed(
			`${dir}/public/service-worker-prod.js`,
			create_sveltekit_env_public(
				vars,
				env,
				`const env = globalThis.__sveltekit_${version_hash}.env;`
			)
		);

		write_if_changed(
			`${dir}/public/service-worker-dev.js`,
			create_sveltekit_env_public(vars, env, `const env = globalThis.__sveltekit_dev.env;`)
		);

		write_if_changed(`${dir}/private/server.js`, create_sveltekit_env_private(vars, env));

		write_if_changed(
			`${dir}/service-worker-prod.js`,
			create_sveltekit_env_service_worker(
				vars,
				env,
				config.version.name,
				`globalThis.__sveltekit_${version_hash}`,
				config.paths.base,
				config.appDir
			)
		);

		write_if_changed(
			`${dir}/service-worker-dev.js`,
			create_sveltekit_env_service_worker_dev(
				vars,
				env,
				config.version.name,
				'globalThis.__sveltekit_dev'
			)
		);

		callback(vars);
	}

	return {
		name: 'vite-plugin-sveltekit-env-vars',

		async configResolved(c) {
			resolved_config = c;

			const vite = await import_peer('vite', c.root);
			env = vite.loadEnv(c.mode, path.resolve(c.root, dir), '');

			out_dir = posixify(path.resolve(c.root, out));

			is_build = c.command === 'build';
		},

		async buildStart() {
			resolved_entry = resolve_entry(path.join(resolved_config.root, entry)) ?? null;
			await generate();
		},

		configureServer(server) {
			// `handleHotUpdate` only fires for `change` events on files Vite already knows about,
			// so it doesn't cover the env entry being created or deleted while the dev server is
			// running. Watch for those events explicitly, re-resolve the entry, regenerate the
			// modules and trigger a full reload (mirroring the previous behaviour).
			const on_entry_add_unlink = async (/** @type {string} */ file) => {
				const resolved = resolve_entry(path.join(resolved_config.root, entry)) ?? null;

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
		},

		resolveId: {
			filter: {
				id: prefixRegex('__sveltekit/env')
			},
			handler(id) {
				const dir = `${out_dir}/generated/env`;

				if (id === '__sveltekit/env') {
					return is_build ? `${dir}/config.js` : `${dir}/config-dev.js`;
				}

				if (id === '__sveltekit/env/private') {
					return `${dir}/private/server.js`;
				}

				if (id === '__sveltekit/env/public/server') {
					return `${dir}/public/server.js`;
				}

				if (id === '__sveltekit/env/public/client') {
					return this.environment.name === 'serviceWorker'
						? `${dir}/public/service-worker-prod.js`
						: `${dir}/public/client.js`;
				}

				if (id === '__sveltekit/env/service-worker') {
					return is_build ? `${dir}/service-worker-prod.js` : `${dir}/service-worker-dev.js`;
				}
			}
		}
	};
}
