export function load({ params, route, url }) {
	return {
		params,
		route,
		url: new URL(url)
	};
}
