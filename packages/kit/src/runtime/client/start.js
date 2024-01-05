import { DEV } from 'esm-env';
import { create_client } from './client.js';

/**
 * @param {import('./types.js').SvelteKitApp} app
 * @param {HTMLElement} target
 * @param {any} [hydrate] (see _hydrate in client.js for the type)
 */
export function start(app, target, hydrate) {
	if (DEV && target === document.body) {
		console.warn(
			'Placing %sveltekit.body% directly inside <body> is not recommended, as your app may break for users who have certain browser extensions installed.\n\nConsider wrapping it in an element:\n\n<div style="display: contents">\n  %sveltekit.body%\n</div>'
		);
	}

	create_client(app, target, hydrate);
}
