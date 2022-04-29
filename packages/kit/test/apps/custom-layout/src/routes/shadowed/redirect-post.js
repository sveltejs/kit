export function post() {
	return {
		status: 302,
		headers: {
			location: '/shadowed/redirected'
		}
	};
}
