/** @type {import('./client').Client} */
export let client;

/**
 * @param {{
 *   client: import('./client').Client;
 * }} opts
 */
export function init(opts) {
	client = opts.client;
}
