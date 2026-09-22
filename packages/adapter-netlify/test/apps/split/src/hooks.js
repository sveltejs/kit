export function reroute({ url }) {
	if (url.pathname.endsWith('/reroute')) {
		return '/reroute';
	}
}
