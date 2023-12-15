import { DEV } from 'esm-env';

/**
 * @param {import('./types.js').SvelteKitApp} app
 * @param {HTMLElement} target
 * @param {number} id
 * @param {Parameters<import('./client.js')._hydrate>[0]} [hydrate]
 */
export async function start(app, target, id, hydrate) {
	if (DEV && target === document.body) {
		console.warn(
			'Placing %sveltekit.body% directly inside <body> is not recommended, as your app may break for users who have certain browser extensions installed.\n\nConsider wrapping it in an element:\n\n<div style="display: contents">\n  %sveltekit.body%\n</div>'
		);
	}

	// In embedded mode, the client is potentially loaded multiple times for different embeddings.
	// Since the client file is a singleton, we need to import it dynamically with a hash to ensure
	// it's treated as a separate module.
	// Note that this will not make SvelteKit instances completely isolated because things like beforeNavigate
	// are still shared, but it's good enough for now / backwards compatible.
	const { _hydrate, _start_router, create_client, goto } = await import(`./client.js?${id}`);
	create_client(app, target);

	if (hydrate) {
		await _hydrate(hydrate);
	} else {
		goto(location.href, { replaceState: true });
	}

	_start_router();
}
