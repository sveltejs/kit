export function load({ params, parent, url, untrack }) {
	untrack(() => {
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		params.x;
		parent();
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		url.pathname;
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		url.search;
	});

	return {
		id: Math.random()
	};
}
