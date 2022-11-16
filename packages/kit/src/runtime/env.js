export let prerendering = false;
export let version = '';

/** @param {boolean} value */
export function set_prerendering(value) {
	prerendering = value;
}

/** @param {string} value */
export function set_version(value) {
	version = value;
}
