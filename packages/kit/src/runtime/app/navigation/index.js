import { router, renderer } from '../../internal/singletons';

export function goto(href, { noscroll = false, replaceState = false } = {}) {
	const page = router.select(new URL(href, get_base_uri(document)));

	if (page) {
		// history[opts.replaceState ? 'replaceState' : 'pushState']({ id: cid }, '', href);
		return router.navigate(page, null, { noscroll, replaceState });
	}

	location.href = href;
	return new Promise(() => {
		/* never resolves */
	});
}

export function prefetch(href) {
	const page = router.select(new URL(href, get_base_uri(document)));

	return renderer.prefetch(page);

	// if (page) {
	// 	if (!prefetching || href !== prefetching.href) {
	// 		prefetching = { href, promise: hydrate_target(page) };
	// 	}

	// 	return prefetching.promise;
	// }
}

export async function prefetchRoutes(pathnames) {
	const path_routes = pathnames
		? router.pages.filter((page) => pathnames.some((pathname) => page.pattern.test(pathname)))
		: router.pages;

	const promises = path_routes.map((r) => Promise.all(r.parts.map((p) => p[0]())));

	await Promise.all(promises);
}