export function middleware({ url, setRequestHeaders, setResponseHeaders, cookies, reroute }) {
	if (url.pathname === '/middleware/custom-response') {
		return new Response('<html><body><h1>Custom Response</h1></body></html>', {
			headers: {
				'content-type': 'text/html'
			}
		});
	}

	if (url.pathname === '/middleware/reroute/a') {
		return reroute('/middleware/reroute/b');
	}

	if (url.pathname === '/middleware/headers') {
		setRequestHeaders({ 'x-custom-request-header': 'value' });
		setResponseHeaders({ 'x-custom-response-header': 'value' });
		cookies.set('cookie', 'value', { path: '/middleware' });
	}
}
