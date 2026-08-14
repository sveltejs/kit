/** @import { Plugin, ResolvedConfig } from 'vite' */
/** @import { ValidatedConfig } from 'types' */
import path from 'node:path';
import * as sync from '../../../core/sync/sync.js';
import { resolve_entry } from '../../../utils/filesystem.js';
import {
	create_sveltekit_env,
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

/**
 * Generate (and, in dev, maintain) a `${outDir}/generated/env/config.js` module
 * derived from `src/env.ts`
 *
 * @param {ValidatedConfig} config
 * @returns {Plugin}
 */
export function plugin_env_vars(config) {
	// grab these values eagerly because they get mutated (TODO stop mutating them)
	const entry = path.join(config.files.src, 'env');
	const dir = config.env.dir;
	const out = config.outDir;

	const version_hash = hash(config.version.name);

	/** @type {Record<string, any>} */
	let env;

	/** @type {ResolvedConfig} */
	let resolved_config;

	/** @type {string | null} */
	let resolved_entry = null;

	let is_build = false;

	/** @type {Set<string>} */
	let deps;

	async function generate() {
		const synced = await sync.env(
			config,
			resolved_entry,
			resolved_config.root,
			resolved_config.mode
		);

		deps = synced.deps;

		write_if_changed(
			`${out}/generated/env/config.js`,
			create_sveltekit_env(synced.variables, env, resolved_entry, !is_build)
		);

		write_if_changed(
			`${out}/generated/env/public/client.js`,
			create_sveltekit_env_public(
				synced.variables,
				env,
				`import { payload } from ${s(`${runtime_directory}/client/payload.js`)};\nconst env = payload.env;`
			)
		);

		write_if_changed(
			`${out}/generated/env/public/server.js`,
			create_sveltekit_env_public(
				synced.variables,
				env,
				`import { rendered_env as env } from '../config.js';`
			)
		);

		write_if_changed(
			`${out}/generated/env/public/service-worker-prod.js`,
			create_sveltekit_env_public(
				synced.variables,
				env,
				`const env = globalThis.__sveltekit_${version_hash}.env;`
			)
		);

		write_if_changed(
			`${out}/generated/env/public/service-worker-dev.js`,
			create_sveltekit_env_public(
				synced.variables,
				env,
				`const env = globalThis.__sveltekit_dev.env;`
			)
		);

		write_if_changed(
			`${out}/generated/env/private/server.js`,
			create_sveltekit_env_private(synced.variables, env)
		);

		write_if_changed(
			`${out}/generated/env/service-worker-prod.js`,
			create_sveltekit_env_service_worker(
				synced.variables,
				env,
				config.version.name,
				`globalThis.__sveltekit_${version_hash}`,
				config.paths.base,
				config.appDir
			)
		);

		write_if_changed(
			`${out}/generated/env/service-worker-dev.js`,
			create_sveltekit_env_service_worker_dev(
				synced.variables,
				env,
				config.version.name,
				'globalThis.__sveltekit_dev'
			)
		);
	}

	return {
		name: 'vite-plugin-sveltekit-env-vars',
		async configResolved(c) {
			resolved_config = c;

			const vite = await import_peer('vite', c.root);
			env = vite.loadEnv(c.mode, path.resolve(c.root, dir), '');

			is_build = c.command === 'build';
		},
		async buildStart() {
			resolved_entry = resolve_entry(path.join(resolved_config.root, entry)) ?? null;
			await generate();
		},
		async handleHotUpdate(update) {
			if (!deps.has(update.file)) return;
			await generate();
		}
	};
}
