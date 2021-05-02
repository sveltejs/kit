export function get() {
	return {
		headers: {
			'content-type': 'application/json'
		},
		body: '42'
	};
}
