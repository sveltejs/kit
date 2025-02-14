export async function reroute({ url, headers, cookies }) {
	if (url.pathname === '/not-rerouted') {
		return;
	}

	if (url.pathname === '/reroute') {
		await new Promise((resolve) => setTimeout(resolve, 100)); // simulate async
		return '/rerouted';
	}

	if (headers.get('x-reroute')) {
		return '/rerouted-header';
	}

	if (cookies.get('reroute')) {
		return '/rerouted-cookie';
	}
}
