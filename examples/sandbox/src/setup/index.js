export function prepare(request) {
	return {
		context: {
			answer: 42
		},
		headers: {
			'x-foo': 'banana'
		}
	};
}

export function getSession(context) {
	return context;
}