import { router, renderer } from '../../internal/singletons';

function get_base_uri(window_document) {
	let baseURI = window_document.baseURI;

	if (!baseURI) {
		const baseTags = window_document.getElementsByTagName('base');
		baseURI = baseTags.length ? baseTags[0].href : window_document.URL;
	}

	return baseURI;
}

export function goto(href, { noscroll = false, replaceState = false } = {}) {
	const url = new URL(href, get_base_uri(document));
	const page = router.select(url);

	if (page) {
		// TODO this logic probably belongs inside router? cid should be private
		history[replaceState ? 'replaceState' : 'pushState']({ id: router.cid }, '', href);

		// TODO shouldn't need to pass the hash here
		return router.navigate(page, null, noscroll, url.hash);
	}

	location.href = href;
	return new Promise(() => {
		/* never resolves */
	});
}

export function prefetch(href) {
	return renderer.prefetch(new URL(href, get_base_uri(document)));
}

export async function prefetchRoutes(pathnames) {
	const path_routes = pathnames
		? router.pages.filter((page) => pathnames.some((pathname) => page.pattern.test(pathname)))
		: router.pages;

	const promises = path_routes.map((r) => Promise.all(r.parts.map((p) => p[0]())));

	await Promise.all(promises);
}
