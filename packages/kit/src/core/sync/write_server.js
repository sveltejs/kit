import path from 'node:path';
import { hash } from '../../utils/hash.js';
import { resolve_entry } from '../../utils/filesystem.js';
import { posixify } from '../../utils/os.js';
import { s } from '../../utils/misc.js';
import { load_error_page, load_template } from '../config/index.js';
import { check_spelling, write_if_changed } from './utils.js';
import { escape_html } from '../../utils/escape.js';

/**
 * @param {{
 *   server_hooks: string | null;
 *   universal_hooks: string | null;
 *   config: import('types').ValidatedConfig;
 *   has_service_worker: boolean;
 *   template: string;
 * }} opts
 */
const server_template = ({
	config,
	server_hooks,
	universal_hooks,
	has_service_worker,
	template
}) => `
import { set_building, set_prerendering } from '$app/env/internal';
import { set_assets } from '$app/paths/internal/server';
import { set_fix_stack_trace, set_manifest, set_read_implementation, log_response } from '__sveltekit/server';
import error from '../shared/error-template.js';

export const options = {
	app_template_contains_nonce: ${template.includes('%sveltekit.nonce%')},
	csp: ${s(config.csp)},
	csrf_check_origin: ${s(!config.csrf.trustedOrigins.includes('*'))},
	csrf_trusted_origins: ${s(config.csrf.trustedOrigins)},
	embedded: ${config.embedded},
	hash_routing: ${s(config.router.type === 'hash')},
	hooks: null, // added lazily, via \`get_hooks\`
	link_header_preload: ${s(config.output.linkHeaderPreload)},
	paths_origin: ${s(config.paths.origin)},
	service_worker: ${has_service_worker},
	service_worker_options: ${config.serviceWorker.register ? s(config.serviceWorker.options) : 'null'},
	templates: {
		app: ({ head, body, assets, nonce, env }) => ${s(template)
			.replace('%sveltekit.head%', '" + head + "')
			.replace('%sveltekit.body%', '" + body + "')
			.replace(/%sveltekit\.assets%/g, '" + assets + "')
			.replace(/%sveltekit\.nonce%/g, '" + nonce + "')
			.replace(/%sveltekit\.version%/g, escape_html(config.version.name))
			.replace(
				/%sveltekit\.env\.([^%]+)%/g,
				(_match, capture) => `" + (env[${s(capture)}] ?? "") + "`
			)},
		error
	},
	version: ${s(config.version.name)},
	version_hash: ${s(hash(config.version.name))}
};

export async function get_hooks() {
	let handle;
	let handleFetch;
	let handleError;
	let init;
	${server_hooks ? `({ handle, handleFetch, handleError, init } = await import(${s(server_hooks)}));` : ''}

	let reroute;
	let transport;
	${universal_hooks ? `({ reroute, transport } = await import(${s(universal_hooks)}));` : ''}

	return {
		handle,
		handleFetch,
		handleError,
		init,
		reroute,
		transport
	};
}

export { set_assets, set_building, set_fix_stack_trace, set_manifest, set_prerendering, set_read_implementation, log_response };
`;

/**
 * Write server configuration to disk
 * @param {import('types').ValidatedConfig} config
 * @param {string} output
 * @param {string} root The project root directory
 */
export function write_server(config, output, root) {
	const server_hooks_file = resolve_entry(config.files.hooks.server);
	const universal_hooks_file = resolve_entry(config.files.hooks.universal);

	if (!server_hooks_file) {
		check_spelling('src/hooks.server', 'src/+hooks.server', 'Unexpected + prefix');
		check_spelling('src/hooks.server', 'src/hook.server', 'Missing s suffix');
	}

	if (!universal_hooks_file) {
		check_spelling('src/hooks', 'src/+hooks', 'Unexpected + prefix');
		check_spelling('src/hooks', 'src/hook', 'Missing s suffix');
	}

	/** @param {string} file */
	function relative(file) {
		return posixify(path.relative(`${output}/server`, file));
	}

	write_if_changed(
		`${output}/shared/error-template.js`,
		`export default ({ status, message }) => ${s(load_error_page(config))
			.replace(/%sveltekit\.status%/g, '" + status + "')
			.replace(/%sveltekit\.error\.message%/g, '" + message + "')};`
	);

	// Contains the stringified version of
	/** @type {import('types').SSROptions} */
	write_if_changed(
		`${output}/server/internal.js`,
		server_template({
			config,
			server_hooks: server_hooks_file ? relative(server_hooks_file) : null,
			universal_hooks: universal_hooks_file ? relative(universal_hooks_file) : null,
			has_service_worker:
				config.serviceWorker.register && !!resolve_entry(config.files.serviceWorker),
			template: load_template(root, config)
		})
	);
}
