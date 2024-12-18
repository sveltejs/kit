import * as kit from './entry.js';

// @ts-expect-error
import * as app from '__sveltekit/APP';

export function start(element, options) {
	kit.start(app, element, options);
}
