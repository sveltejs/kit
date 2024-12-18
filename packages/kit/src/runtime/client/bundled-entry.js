import * as kit from './entry.js';

// @ts-expect-error
import * as app from '__sveltekit/APP';

/**
 *
 * @param {HTMLElement} element
 * @param {import('./types.js').HydrateOptions} options
 */
export function start(element, options) {
	kit.start(app, element, options);
}
