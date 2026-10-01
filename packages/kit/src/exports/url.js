// we use the export subpath to conditionally import the client/server `get_origin`
// so that `node:async_hooks` isn't pulled into the client build
import { get_origin } from '#internal';
import { matches_external_allowlist_entry } from '../utils/url.js';
import * as e from '../messages/shared-errors.js';

// See https://datatracker.ietf.org/doc/html/rfc2606 - no domains under the .invalid TLD can be registered
const REDIRECT_BASE = 'https://sveltekit-redirect.invalid';

/**
 * Whether a redirect location is absolute, i.e. not a root-relative or path-relative URL,
 * and not pointing to the same origin as we're currently on (if determineable).
 * @param {string} location
 */
export function is_external_location(location) {
	const origin = get_origin();

	try {
		return !matches_external_allowlist_entry(location, origin ?? REDIRECT_BASE);
	} catch {
		return true;
	}
}

const javascript_protocols = new Set(['javascript:', 'data:']);

/**
 * @param {string} location
 */
function is_javascript_location(location) {
	try {
		return javascript_protocols.has(new URL(location, REDIRECT_BASE).protocol);
	} catch {
		return false;
	}
}

/**
 * @param {string} location
 * @param {{ external?: boolean | string[] }} [options]
 */
export function validate_redirect_location(location, options) {
	if (!is_external_location(location)) return;

	const external = options?.external;

	if (!external) {
		e.redirect_external_not_allowed({ location: JSON.stringify(location) });
	}

	if (external === true) {
		if (is_javascript_location(location)) {
			e.redirect_external_javascript({ location: JSON.stringify(location) });
		}

		return;
	}

	if (Array.isArray(external)) {
		if (!external.some((allowed) => matches_external_allowlist_entry(location, allowed))) {
			e.redirect_external_not_in_allowlist({ location: JSON.stringify(location) });
		}

		return;
	}

	e.redirect_external_option_invalid();
}
