import { DEV } from 'esm-env';
import { create_client } from './client.js';
import { init } from './singletons.js';
import { set_version, set_public_env } from '../shared.js';

/**
 * @param {{
 *   env: Record<string, string>;
 *   hydrate: Parameters<import('./types').Client['_hydrate']>[0];
 *   paths: {
 *     assets: string;
 *     base: string;
 *   },
 *   target: HTMLElement;
 *   version: string;
 * }} opts
 */
export async function start({ env, hydrate, target, version }) {
	set_public_env(env);
	set_version(version);

	if (DEV && target === document.body) {
		console.warn(
			`Placing %sveltekit.body% directly inside <body> is not recommended, as your app may break for users who have certain browser extensions installed.\n\nConsider wrapping it in an element:\n\n<div style="display: contents">\n  %sveltekit.body%\n</div>`
		);
	}

	const client = create_client({
		target
	});

	init({ client });

	if (hydrate) {
		await client._hydrate(hydrate);
	} else {
		client.goto(location.href, { replaceState: true });
	}

	client._start_router();
}
