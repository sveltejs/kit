// @ts-ignore
import Root from 'ROOT'; // eslint-disable-line import/no-unresolved
// @ts-ignore
import { routes, layout } from 'MANIFEST'; // eslint-disable-line import/no-unresolved
import { Router } from './router.js';
import { Renderer } from './renderer.js';
import { init } from './singletons.js';
import { set_paths } from '../paths.js';

/** @param {{
 *   paths: {
 *     assets: string;
 *     base: string;
 *   },
 *   target: Node;
 *   session: any;
 *   error: Error;
 *   status: number;
 *   host: string;
 *   route: boolean;
 *   hydrate: import('./types').NavigationCandidate;
 * }} opts */
export async function start({ paths, target, session, host, route, hydrate }) {
	const router =
		route &&
		new Router({
			base: paths.base,
			routes
		});

	const renderer = new Renderer({
		Root,
		layout,
		target,
		session,
		host
	});

	init(router);
	set_paths(paths);

	if (hydrate) await renderer.start(hydrate);
	if (route) router.init(renderer);

	dispatchEvent(new CustomEvent('sveltekit:start'));
}

if (import.meta.env.VITE_SVELTEKIT_SERVICE_WORKER) {
	if ('serviceWorker' in navigator) {
		navigator.serviceWorker.register(import.meta.env.VITE_SVELTEKIT_SERVICE_WORKER);
	}
}
