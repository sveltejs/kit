export function reroute({ url }) {
	if (url.hash === '#/reroute-a') {
		// works with leading hash...
		return '#/rerouted';
	}

	if (url.hash === '#/reroute-b') {
		// ...and without
		return '/rerouted';
	}
}
