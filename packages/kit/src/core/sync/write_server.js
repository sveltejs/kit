import fs from 'node:fs';
import path from 'node:path';
import { hash } from '../../runtime/hash.js';
import { posixify, resolve_entry } from '../../utils/filesystem.js';
import { s } from '../../utils/misc.js';
import { load_error_page, load_template } from '../config/index.js';
import { runtime_directory } from '../utils.js';
import { write_if_changed } from './utils.js';

/**
 * @param {{
 *   hooks: string | null;
 *   config: import('types').ValidatedConfig;
 *   has_service_worker: boolean;
 *   runtime_directory: string;
 *   template: string;
 *   error_page: string;
 * }} opts
 */
const server_template = ({
	config,
	hooks,
	has_service_worker,
	runtime_directory,
	template,
	error_page
}) => `
import root from '../root.svelte';
import { set_building } from '__sveltekit/environment';
import { set_assets } from '__sveltekit/paths';
import { set_private_env, set_public_env } from '${runtime_directory}/shared-server.js';

export const options = {
	app_template_contains_nonce: ${template.includes('%sveltekit.nonce%')},
	csp: ${s(config.kit.csp)},
	csrf_check_origin: ${s(config.kit.csrf.checkOrigin)},
	track_server_fetches: ${s(config.kit.dangerZone.trackServerFetches)},
	embedded: ${config.kit.embedded},
	env_public_prefix: '${config.kit.env.publicPrefix}',
	env_private_prefix: '${config.kit.env.privatePrefix}',
	hooks: null, // added lazily, via \`get_hooks\`
	preload_strategy: ${s(config.kit.output.preloadStrategy)},
	root,
	service_worker: ${has_service_worker},
	templates: {
		app: ({ head, body, assets, nonce, env }) => ${s(template)
			.replace('%sveltekit.head%', '" + head + "')
			.replace('%sveltekit.body%', '" + body + "')
			.replace(/%sveltekit\.assets%/g, '" + assets + "')
			.replace(/%sveltekit\.nonce%/g, '" + nonce + "')
			.replace(
				/%sveltekit\.env\.([^%]+)%/g,
				(_match, capture) => `" + (env[${s(capture)}] ?? "") + "`
			)},
		error: ({ status, message }) => ${s(error_page)
			.replace(/%sveltekit\.status%/g, '" + status + "')
			.replace(/%sveltekit\.error\.message%/g, '" + message + "')}
	},
	version_hash: ${s(hash(config.kit.version.name))}
};

export function get_hooks() {
	return ${hooks ? `import(${s(hooks)})` : '{}'};
}

export { set_assets, set_building, set_private_env, set_public_env };
`;

// TODO need to re-run this whenever src/app.html or src/error.html are
// created or changed, or src/service-worker.js is created or deleted.
// Also, need to check that updating hooks.server.js works

/**
 * Write server configuration to disk
 * @param {import('types').ValidatedConfig} config
 * @param {string} output
 */
export function write_server(config, output) {
	// TODO the casting shouldn't be necessary — investigate
	const hooks_file = /** @type {string} */ (resolve_entry(config.kit.files.hooks.server));

	/** @param {string} file */
	function relative(file) {
		return posixify(path.relative(`${output}/server`, file));
	}

	write_if_changed(
		`${output}/server/internal.js`,
		server_template({
			config,
			hooks: fs.existsSync(hooks_file) ? relative(hooks_file) : null,
			has_service_worker:
				config.kit.serviceWorker.register && !!resolve_entry(config.kit.files.serviceWorker),
			runtime_directory: relative(runtime_directory),
			template: load_template(process.cwd(), config),
			error_page: load_error_page(config)
		})
	);
}
