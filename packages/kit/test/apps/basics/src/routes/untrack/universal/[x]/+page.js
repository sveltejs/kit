export function load({ params, parent, url, untrack }) {
	untrack(() => {
		params.x;
		parent();
		url.pathname;
		url.search;
	});

	return {
		id: Math.random()
	};
}
