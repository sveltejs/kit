import { text } from '@sveltejs/kit';
import { ENDPOINT_METHODS } from '../../constants.js';

/**
 * @param {Partial<Record<import('types').HttpMethod, any>>} mod
 * @param {import('types').HttpMethod} method
 */
export function method_not_allowed(mod, method) {
	return text(`${method} method not allowed`, {
		status: 405,
		headers: {
			// https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/405
			// "The server must generate an Allow header field in a 405 status code response"
			allow: allowed_methods(mod).join(', ')
		}
	});
}

/** @param {Partial<Record<import('types').HttpMethod, any>>} mod */
export function allowed_methods(mod) {
	const allowed = ENDPOINT_METHODS.filter((method) => method in mod);

	// if there's no HEAD handler, but we have a GET handler, we respond to
	// HEAD requests using the GET handler and omit the response body.
	if ('GET' in mod && !('HEAD' in mod)) {
		allowed.push('HEAD');
	}

	return allowed;
}

/**
 * @param {import('types').SSROptions} options
 */
export function get_global_name(options) {
	return __SVELTEKIT_DEV__ ? '__sveltekit_dev' : `__sveltekit_${options.version_hash}`;
}

/**
 * @param {number} status
 * @param {string} location
 */
export function redirect_response(status, location) {
	const response = new Response(undefined, {
		status,
		headers: { location }
	});
	return response;
}

/**
 * @param {Response} response
 */
export function with_version_header(response) {
	if (__SVELTEKIT_APP_VERSION_CHECKS_ENABLED__) {
		response.headers.set('x-sveltekit-version', __SVELTEKIT_APP_VERSION__);
	}
	return response;
}

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {Error & { path: string }} error
 */
export function clarify_devalue_error(event, error) {
	if (error.path) {
		return (
			`Data returned from \`load\` while rendering ${event.route.id} is not serializable: ${error.message} (${error.path}). ` +
			`If you need to serialize/deserialize custom types, use transport hooks: https://svelte.dev/docs/kit/hooks#transport.`
		);
	}

	if (error.path === '') {
		return `Data returned from \`load\` while rendering ${event.route.id} is not a plain object`;
	}

	// belt and braces — this should never happen
	return error.message;
}

/**
 * @param {import('types').ServerDataNode} node
 */
export function serialize_uses(node) {
	const uses = {};

	if (node.uses && node.uses.dependencies.size > 0) {
		uses.dependencies = Array.from(node.uses.dependencies);
	}

	if (node.uses && node.uses.search_params.size > 0) {
		uses.search_params = Array.from(node.uses.search_params);
	}

	if (node.uses && node.uses.params.size > 0) {
		uses.params = Array.from(node.uses.params);
	}

	if (node.uses?.parent) uses.parent = 1;
	if (node.uses?.route) uses.route = 1;
	if (node.uses?.url) uses.url = 1;

	return uses;
}

/**
 * Returns `true` if the given path was prerendered
 * @param {import('@sveltejs/kit').SSRManifest} manifest
 * @param {string} pathname Should include the base and be decoded
 */
export function has_prerendered_path(manifest, pathname) {
	return (
		manifest._.prerendered_routes.has(pathname) ||
		(pathname.at(-1) === '/' && manifest._.prerendered_routes.has(pathname.slice(0, -1)))
	);
}

/**
 * Returns the filename without the extension. e.g., `+page.server`, `+page`, etc.
 * @param {string | undefined} node_id
 * @returns {string}
 */
export function get_node_type(node_id) {
	const parts = node_id?.split('/');
	const filename = parts?.at(-1);
	if (!filename) return 'unknown';
	const dot_parts = filename.split('.');
	return dot_parts.slice(0, -1).join('.');
}

/**
 * Counts HTML comments that are not SSI directives (which start with `<!--#`).
 * Used to detect when `transformPageChunk` removes comments that Svelte needs for hydration.
 * @param {string} str
 * @returns {number}
 */
export function count_non_ssi_comments(str) {
	return (str.match(/<!--(?!#)/g) ?? []).length;
}
