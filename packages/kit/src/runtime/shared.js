/** @import { Transport } from '@sveltejs/kit' */

import { stringify as _stringify } from 'devalue';

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
	const encoders = Object.fromEntries(
		Object.entries(transport).map(([key, value]) => [key, value.encode])
	);

	return _stringify(data, encoders);
}

/**
 * @param {any[]} args
 * @param {Transport} transport
 */
export function stringify_remote_args(args, transport) {
	if (args.length === 0) return '';
	return stringify(args, transport);
}

/**
 * @param {string} id
 * @param {string} stringified_args
 */
export function create_remote_cache_key(id, stringified_args) {
	return id + '|' + stringified_args;
}
