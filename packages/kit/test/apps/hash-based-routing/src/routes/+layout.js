export const ssr = false;

export function load({ params, route, url }) {
	return {
		params,
		route,
		url
	};
}
