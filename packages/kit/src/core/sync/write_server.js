import path from 'node:path';
import { resolve_entry } from '../../utils/filesystem.js';
import { posixify } from '../../utils/os.js';
import { s } from '../../utils/misc.js';
import { load_error_page, load_template } from '../config/index.js';
import { check_spelling, write_if_changed } from './utils.js';
import { escape_html } from '../../utils/escape.js';
import { runtime_directory } from '../utils.js';

/**
 * @param {{
 *   server_hooks: string | null;
 *   universal_hooks: string | null;
 *   config: import('types').ValidatedConfig;
 *   template: string;
 *   runtime_directory: string;
 * }} opts
 */
const server_template = ({
	config,
	server_hooks,
	universal_hooks,
	template,
	runtime_directory
}) => `
import { set_building, set_prerendering } from '$app/env/server';
import { set_assets } from '$app/paths/internal/server';
import { set_fix_stack_trace, set_manifest, set_read_implementation, format_response } from '${runtime_directory}/server/internal.js';
import { stream_from_iterable } from '${runtime_directory}/utils.js';
import error from './shared/error-template.js';

export const options = {
	app_template_contains_nonce: ${template.includes('%sveltekit.nonce%')},
	csp: ${s(config.csp)},
	csrf_trusted_origins: ${s(config.csrf.trustedOrigins)},
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
	}
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

/**
 * Sets the module-level state the server runtime reads, in the order it has to happen:
 * \`building\` and \`prerendering\` before the env module evaluates the user's \`src/env\` config,
 * which may read them, and everything else before user modules run
 * @param {import('types').ServerConfigureOptions} opts
 */
export async function configure({ building, prerendering, env, manifest, read, assets, fix_stack_trace }) {
	if (building) set_building();
	if (prerendering) set_prerendering();

	if (env) {
		const { set_env } = await import('<sveltekit:generated>/env/config.js');
		set_env(env);
	}

	if (manifest) set_manifest(manifest);
	if (assets !== undefined) set_assets(assets);
	if (fix_stack_trace) set_fix_stack_trace(fix_stack_trace);

	if (read) {
		// the public \`read\` may return a promise, the runtime expects a stream
		set_read_implementation((file) => {
			const result = read(file);
			if (result instanceof ReadableStream) return result;

			return stream_from_iterable(
				(async function* () {
					const stream = await result;
					if (stream) yield* stream;
				})()
			);
		});
	}
}

export { set_assets, set_building, set_fix_stack_trace, set_manifest, set_prerendering, set_read_implementation, format_response };
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
		return posixify(path.relative(output, file));
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
		`${output}/server.js`,
		server_template({
			config,
			runtime_directory: relative(runtime_directory),
			server_hooks: server_hooks_file ? relative(server_hooks_file) : null,
			universal_hooks: universal_hooks_file ? relative(universal_hooks_file) : null,
			template: load_template(root, config)
		})
	);
}
