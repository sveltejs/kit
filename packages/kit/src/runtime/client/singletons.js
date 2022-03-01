/** @type {import('./types').Client} */
export let client;

/**
 * @param {{
 *   client: import('./types').Client;
 * }} opts
 */
export function init(opts) {
	client = opts.client;
}
