export function prepare({ headers }) {
	return {
		context: {
			answer: 42
		},
		headers: {
			'x-foo': 'banana'
		}
	};
}

export function getSession({ context }) {
	return context;
}
