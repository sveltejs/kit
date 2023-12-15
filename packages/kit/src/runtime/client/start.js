import { DEV } from 'esm-env';
import { _hydrate, _start_router, create_client, goto } from './client.js';

/**
 * @param {import('./types.js').SvelteKitApp} app
 * @param {HTMLElement} target
 * @param {Parameters<import('./client.js')._hydrate>[0]} [hydrate]
 */
export async function start(app, target, hydrate) {
	if (DEV && target === document.body) {
		console.warn(
			'Placing %sveltekit.body% directly inside <body> is not recommended, as your app may break for users who have certain browser extensions installed.\n\nConsider wrapping it in an element:\n\n<div style="display: contents">\n  %sveltekit.body%\n</div>'
		);
	}

	create_client(app, target);

	if (hydrate) {
		await _hydrate(hydrate);
	} else {
		goto(location.href, { replaceState: true });
	}

	_start_router();
}
