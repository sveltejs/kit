import { is_form_content_type } from '../../utils/http.js';

const mutating_form_methods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * The origin SvelteKit treats as "self" when validating the `Origin` header on
 * cross-site requests.
 *
 * By default (`paths.origin` is `undefined`), SvelteKit derives the origin
 * from `request.url` (which is set by the adapter, and ultimately by the
 * platform). When `paths.origin` is configured — for example so that a preview
 * deployment whose URL isn't known at build time, or an app behind a reverse
 * proxy, can declare a canonical origin — that value takes precedence.
 *
 * @param {string | undefined} paths_origin the configured `kit.paths.origin`
 * @param {string} url_origin the origin derived from `request.url`
 * @returns {string}
 */
export function get_self_origin(paths_origin, url_origin) {
	return paths_origin || url_origin;
}

/**
 * Determines whether a non-remote request should be rejected as a cross-site
 * form submission (CSRF). Used by `respond.js` to gate form `POST`/`PUT`/
 * `PATCH`/`DELETE` requests whose `Origin` header doesn't match the app's
 * self-origin (and isn't in `trusted_origins`).
 *
 * @param {{
 *   request: Request;
 *   request_origin: string | null;
 *   self_origin: string;
 *   trusted_origins: string[];
 * }} input
 * @returns {boolean}
 */
export function is_csrf_forbidden({ request, request_origin, self_origin, trusted_origins }) {
	return (
		is_form_content_type(request) &&
		mutating_form_methods.has(request.method) &&
		request_origin !== self_origin &&
		(!request_origin || !trusted_origins.includes(request_origin))
	);
}

/**
 * Determines whether a remote-function request should be rejected as cross-site.
 *
 * Unlike form submissions, remote functions accept any content type (e.g.
 * `application/json`), so the check is solely on the request method and origin:
 * a non-`GET` request is forbidden when its `Origin` header matches neither the
 * app's self-origin nor an entry in `trusted_origins`. This is the same origin
 * policy `is_csrf_forbidden` applies to form submissions, minus the
 * form-content-type gate, so that deliberately-trusted third parties (e.g.
 * payment gateways listed in `csrf.trustedOrigins`) may call remote functions
 * just as they may submit forms.
 *
 * @param {{
 *   request: Request;
 *   request_origin: string | null;
 *   self_origin: string;
 *   trusted_origins: string[];
 * }} input
 * @returns {boolean}
 */
export function is_remote_forbidden({ request, request_origin, self_origin, trusted_origins }) {
	return (
		request.method !== 'GET' &&
		request_origin !== self_origin &&
		(!request_origin || !trusted_origins.includes(request_origin))
	);
}
