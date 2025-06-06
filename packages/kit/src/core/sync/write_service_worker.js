import path from 'node:path';
import process from 'node:process';
import { hash } from '../../runtime/hash.js';
import { posixify, resolve_entry } from '../../utils/filesystem.js';
import { s } from '../../utils/misc.js';
import { load_error_page, load_template } from '../config/index.js';
import { runtime_directory } from '../utils.js';
import { isSvelte5Plus, write_if_changed } from './utils.js';
import colors from 'kleur';

/**
 * @param {{
 *   worker_hooks: string | null;
 *   universal_hooks: string | null;
 *   config: import('types').ValidatedConfig;
 *   runtime_directory: string;
 *   template: string;
 *   error_page: string;
 * }} opts
 */
const service_worker_template = ({
	config,
	worker_hooks,
	universal_hooks,
	runtime_directory,
	template,
	error_page
}) => `
import root from '../root.${isSvelte5Plus() ? 'js' : 'svelte'}';
import { set_building, set_prerendering } from '__sveltekit/environment';
import { set_assets } from '__sveltekit/paths';
import { set_manifest, set_read_implementation } from '__sveltekit/service-worker';
import { set_private_env, set_public_env, set_safe_public_env } from '${runtime_directory}/shared-server.js';

export const options = {
	app_template_contains_nonce: ${template.includes('%sveltekit.nonce%')},
	csp: ${s(config.kit.csp)},
	csrf_check_origin: ${s(config.kit.csrf.checkOrigin)},
	embedded: ${config.kit.embedded},
	env_public_prefix: '${config.kit.env.publicPrefix}',
	env_private_prefix: '${config.kit.env.privatePrefix}',
	hash_routing: ${s(config.kit.router.type === 'hash')},
	hooks: null, // added lazily, via \`get_hooks\`
	preload_strategy: ${s(config.kit.output.preloadStrategy)},
	root,
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

export async function get_hooks() {
	let handle;
	let handleFetch;
	let handleError;
	${worker_hooks ? `({ handle, handleFetch, handleError } = await import(${s(worker_hooks)}));` : ''}

	let reroute;
	let transport;
	${universal_hooks ? `({ reroute, transport } = await import(${s(universal_hooks)}));` : ''}

	return {
		handle,
		handleFetch,
		handleError,
		reroute,
		transport
	};
}

export { set_assets, set_building, set_manifest, set_prerendering, set_private_env, set_public_env, set_read_implementation, set_safe_public_env };
`;

// TODO need to re-run this whenever src/app.html or src/error.html are
// created or changed. Also, need to check that updating hooks.worker.js works

/**
 * Write service worker configuration to disk
 * @param {import('types').ValidatedConfig} config
 * @param {string} output
 */
export function write_service_worker(config, output) {
	const service_worker_hooks_file = resolve_entry(config.kit.files.hooks.serviceWorker);
	const universal_hooks_file = resolve_entry(config.kit.files.hooks.universal);

	const typo = resolve_entry('src/+hooks.worker');
	if (typo) {
		console.log(
			colors
				.bold()
				.yellow(
					`Unexpected + prefix. Did you mean ${typo.split('/').at(-1)?.slice(1)}?` +
						` at ${path.resolve(typo)}`
				)
		);
	}

	/** @param {string} file */
	function relative(file) {
		return posixify(path.relative(`${output}/service-worker`, file));
	}

	// Contains the stringified version of
	/** @type {import('types').SSROptions} */
	write_if_changed(
		`${output}/service-worker/internal.js`,
		service_worker_template({
			config,
			worker_hooks: service_worker_hooks_file ? relative(service_worker_hooks_file) : null,
			universal_hooks: universal_hooks_file ? relative(universal_hooks_file) : null,
			runtime_directory: relative(runtime_directory),
			template: load_template(process.cwd(), config),
			error_page: load_error_page(config)
		})
	);
}
