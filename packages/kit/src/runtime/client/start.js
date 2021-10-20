// @ts-expect-error - value will be replaced on build step
import Root from 'ROOT';
// @ts-expect-error - value will be replaced on build step
import { routes, fallback } from 'MANIFEST';
import { Router } from './router.js';
import { Renderer } from './renderer.js';
import { init } from './singletons.js';
import { set_paths } from '../paths.js';
import { Prefetcher } from './prefetcher.js';

/**
 * @param {{
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
 * }} opts
 */
export async function start({ paths, target, session, host, route, spa, trailing_slash, hydrate }) {
	if (import.meta.env.DEV && !target) {
		throw new Error('Missing target element. See https://kit.svelte.dev/docs#configuration-target');
	}

	const renderer = new Renderer({
		Root,
		fallback,
		target,
		session,
		host
	});

	let router = null;
	let prefetcher = null;

	if (route) {
		router = new Router({
			base: paths.base,
			routes,
			trailing_slash,
			handle_nav: renderer.handle_navigation
		});
		renderer.router = router;
		prefetcher = new Prefetcher({ router, handle_prefetch: renderer.load });
	}

	init(renderer, router, prefetcher);
	set_paths(paths);

	if (hydrate) await renderer.start(hydrate);
	if (router) {
		if (spa) router.goto(location.href, { replaceState: true }, []);
		router.init_listeners();
		prefetcher?.init_listeners();
	}

	dispatchEvent(new CustomEvent('sveltekit:start'));
}
