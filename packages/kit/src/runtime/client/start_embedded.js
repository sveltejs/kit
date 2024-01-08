import { DEV } from 'esm-env';

let instance_id = -1;

// This is a hack to get the client module url while making sure Vite compiles it correctly.
// https://github.com/vitejs/vite/issues/6757
const modules = import.meta.glob('./client.js');
const importPathRegex = /import\(['"]([^'"]+)['"]\)/;
const client_import = Object.values(modules)[0];
const importStatement = client_import.toString();
const match = /** @type {RegExpMatchArray } */ (importStatement.match(importPathRegex));
const client_url = match[1];

/**
 * @param {import('./types.js').SvelteKitApp} app
 * @param {HTMLElement} target
 * @param {any} [hydrate] (see _hydrate in client.js for the type)
 */
export async function start(app, target, hydrate) {
	if (DEV && target === document.body) {
		console.warn(
			'Placing %sveltekit.body% directly inside <body> is not recommended, as your app may break for users who have certain browser extensions installed.\n\nConsider wrapping it in an element:\n\n<div style="display: contents">\n  %sveltekit.body%\n</div>'
		);
	}

	// In embedded mode, the client is potentially loaded multiple times for different embeddings.
	// Since the client file is a singleton, we need to import it dynamically with a query string to ensure
	// it's treated as a separate module.
	// Note that this will not make SvelteKit instances completely isolated because things like beforeNavigate
	// are still shared, but it's good enough for now / backwards compatible.
	instance_id++;
	const { create_client } =
		// ensures that the first embedded instance uses the preloaded module / the one that files like app/navigation.js also use
		instance_id === 0
			? await client_import()
			: await import(/* @vite-ignore */ `${client_url}?${instance_id}`);

	create_client(app, target, hydrate);
}
