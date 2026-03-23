// This module is a stub and will not be used once Vite takes over module loading

import { set_building, set_prerendering } from '../app/environment/internal.js';
import { set_assets } from '../app/paths/internal/server.js';
import { set_manifest, set_read_implementation } from './external.js';
import { set_private_env, set_public_env } from '../shared-server.js';

/** @type {import('types').SSROptions} */
export const options = {
	app_template_contains_nonce: false,
	async: false,
	csp: {
		mode: 'auto',
		directives: {
			'child-src': [],
			'default-src': [],
			'frame-src': [],
			'worker-src': [],
			'connect-src': [],
			'font-src': [],
			'img-src': [],
			'manifest-src': [],
			'media-src': [],
			'object-src': [],
			'prefetch-src': [],
			'script-src': [],
			'script-src-elem': [],
			'script-src-attr': [],
			'style-src': [],
			'style-src-elem': [],
			'style-src-attr': [],
			'base-uri': [],
			sandbox: [],
			'form-action': [],
			'frame-ancestors': [],
			'navigate-to': [],
			'report-uri': [],
			'report-to': [],
			'require-trusted-types-for': [],
			'trusted-types': [],
			'upgrade-insecure-requests': false,
			'require-sri-for': [],
			'block-all-mixed-content': false,
			'plugin-types': [],
			referrer: []
		},
		reportOnly: {
			'child-src': [],
			'default-src': [],
			'frame-src': [],
			'worker-src': [],
			'connect-src': [],
			'font-src': [],
			'img-src': [],
			'manifest-src': [],
			'media-src': [],
			'object-src': [],
			'prefetch-src': [],
			'script-src': [],
			'script-src-elem': [],
			'script-src-attr': [],
			'style-src': [],
			'style-src-elem': [],
			'style-src-attr': [],
			'base-uri': [],
			sandbox: [],
			'form-action': [],
			'frame-ancestors': [],
			'navigate-to': [],
			'report-uri': [],
			'report-to': [],
			'require-trusted-types-for': [],
			'trusted-types': [],
			'upgrade-insecure-requests': false,
			'require-sri-for': [],
			'block-all-mixed-content': false,
			'plugin-types': [],
			referrer: []
		}
	},
	csrf_check_origin: true,
	csrf_trusted_origins: [],
	embedded: false,
	env_public_prefix: 'PUBLIC_',
	env_private_prefix: '',
	hash_routing: false,
	// @ts-expect-error
	hooks: null, // added lazily, via \`get_hooks\`,
	root: {
		render: () => {
			return { css: { code: '', map: '' }, head: '', html: '', assets: '' };
		}
	},
	service_worker: false,
	service_worker_options: {},
	server_error_boundaries: false,
	templates: {
		app: () => '',
		error: () => ''
	},
	version_hash: ''
};

/**
 * @returns {Promise<Partial<import('types').ServerHooks>>}
 */
// eslint-disable-next-line @typescript-eslint/require-await
export async function get_hooks() {
	return {
		handle: undefined,
		handleFetch: undefined,
		handleError: undefined,
		handleValidationError: undefined,
		init: undefined,
		reroute: undefined,
		transport: undefined
	};
}

export {
	set_assets,
	set_building,
	set_manifest,
	set_prerendering,
	set_private_env,
	set_public_env,
	set_read_implementation
};
