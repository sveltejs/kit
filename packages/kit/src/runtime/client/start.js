import { DEV } from 'esm-env';
import { create_client } from './client.js';
import { init } from './singletons.js';

/**
 * @param {import('./types.js').SvelteKitApp} app
 * @param {HTMLElement} target
 * @param {Parameters<import('./types.js').Client['_hydrate']>[0]} [hydrate]
 */
export async function start(app, target, hydrate) {
	if (DEV && target === document.body) {
		console.warn(
			'Placing %sveltekit.body% directly inside <body> is not recommended, as your app may break for users who have certain browser extensions installed.\n\nConsider wrapping it in an element:\n\n<div style="display: contents">\n  %sveltekit.body%\n</div>'
		);
	}

	const client = create_client(app, target);

	init({ client });

	if (hydrate) {
		await client._hydrate(hydrate);
	} else {
		client.goto(location.href, { replaceState: true });
	}

	client._start_router();
}
