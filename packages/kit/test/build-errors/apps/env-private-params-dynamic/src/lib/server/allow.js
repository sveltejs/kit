import { SHOULD_EXPLODE } from '$app/env/private';

/** @param {string} value */
export function is_allowed(value) {
	return value === SHOULD_EXPLODE;
}
