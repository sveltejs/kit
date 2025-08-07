/** @import { Transport } from '@sveltejs/kit' */
import * as devalue from 'devalue';

/**
 * @param {string} route_id
 * @param {string} dep
 */
export function validate_depends(route_id, dep) {
	const match = /^(moz-icon|view-source|jar):/.exec(dep);
	if (match) {
		console.warn(
			`${route_id}: Calling \`depends('${dep}')\` will throw an error in Firefox because \`${match[1]}\` is a special URI scheme`
		);
	}
}

export const INVALIDATED_PARAM = 'x-sveltekit-invalidated';

export const TRAILING_SLASH_PARAM = 'x-sveltekit-trailing-slash';

/**
 * Try to `devalue.stringify` the data object using the provided transport encoders.
 * @param {any} data
 * @param {Transport} transport
 */
export function stringify(data, transport) {
	const encoders = Object.fromEntries(Object.entries(transport).map(([k, v]) => [k, v.encode]));

	return devalue.stringify(data, encoders);
}

/**
 * Stringifies the argument (if any) for a remote function in such a way that
 * it is both a valid URL and a valid file name (necessary for prerendering).
 * @param {any} value
 * @param {Transport} transport
 */
export function stringify_remote_arg(value, transport) {
	if (value === undefined) return '';

	// If people hit file/url size limits, we can look into using something like compress_and_encode_text from svelte.dev beyond a certain size
	const json_string = stringify(value, transport);

	// Convert to UTF-8 bytes, then base64 - handles all Unicode properly (btoa would fail on exotic characters)
	const utf8_bytes = new TextEncoder().encode(json_string);
	return btoa(String.fromCharCode(...utf8_bytes))
		.replace(/=/g, '')
		.replace(/\+/g, '-')
		.replace(/\//g, '_');
}

/**
 * Parses the argument (if any) for a remote function
 * @param {string} string
 * @param {Transport} transport
 */
export function parse_remote_arg(string, transport) {
	if (!string) return undefined;

	const decoders = Object.fromEntries(Object.entries(transport).map(([k, v]) => [k, v.decode]));

	// We don't need to add back the `=`-padding because atob can handle it
	const base64_restored = string.replace(/-/g, '+').replace(/_/g, '/');
	const binary_string = atob(base64_restored);
	const utf8_bytes = new Uint8Array([...binary_string].map((char) => char.charCodeAt(0)));
	const json_string = new TextDecoder().decode(utf8_bytes);

	return devalue.parse(json_string, decoders);
}

/**
 * @param {string} id
 * @param {string} payload
 */
export function create_remote_cache_key(id, payload) {
	return id + '/' + payload;
}
