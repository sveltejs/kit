// @ts-ignore
import Root from 'ROOT'; // eslint-disable-line import/no-unresolved
// @ts-ignore
import { pages, ignore, layout } from 'MANIFEST'; // eslint-disable-line import/no-unresolved
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
 *   initial: import('./types').NavigationTarget;
 * }} opts */
export async function start({ paths, target, session, error, status, initial }) {
	const router = new Router({
		base: paths.base,
		host: initial.page.host,
		pages,
		ignore
	});

	const renderer = new Renderer({
		Root,
		layout,
		target,
		error,
		status,
		session
	});

	init({ router, renderer });
	set_paths(paths);

	await router.init(renderer);
	await renderer.start(initial);

	dispatchEvent(new CustomEvent('sveltekit:start'));
}

if (import.meta.env.VITE_SVELTEKIT_SERVICE_WORKER) {
	navigator.serviceWorker.register(import.meta.env.VITE_SVELTEKIT_SERVICE_WORKER);
}
