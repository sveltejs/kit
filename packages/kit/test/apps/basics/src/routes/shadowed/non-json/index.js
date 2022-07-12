export function get() {
	return {
		headers: {
			'content-type': 'text/html'
		},
		body: '<h1>this is some HTML from an endpoint</h1>'
	};
}
