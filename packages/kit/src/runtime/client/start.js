// @ts-ignore
import Root from 'ROOT'; // eslint-disable-line import/no-unresolved
// @ts-ignore
import { routes, fallback } from 'MANIFEST'; // eslint-disable-line import/no-unresolved
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
 *   host: string;
 *   route: boolean;
 *   spa: boolean;
 *   trailing_slash: import('types/internal').TrailingSlash;
 *   hydrate: {
 *     status: number;
 *     error: Error;
 *     nodes: Array<Promise<import('types/internal').CSRComponent>>;
 *     page: import('types/page').Page;
 *   };
 * }} opts */
export async function start({ paths, target, session, host, route, spa, trailing_slash, hydrate }) {
	if (import.meta.env.DEV && !target) {
		throw new Error('Missing target element. See https://kit.svelte.dev/docs#configuration-target');
	}

	const router =
		route &&
		new Router({
			base: paths.base,
			routes,
			trailing_slash
		});

	const renderer = new Renderer({
		Root,
		fallback,
		target,
		session,
		host
	});

	init(router);
	set_paths(paths);

	if (hydrate) await renderer.start(hydrate);
	if (route) router.init(renderer);

	if (spa) router.goto(location.href, { replaceState: true }, []);

	dispatchEvent(new CustomEvent('sveltekit:start'));
}
