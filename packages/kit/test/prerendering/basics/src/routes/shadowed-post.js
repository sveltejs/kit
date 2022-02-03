export function get() {
	return {
		body: {
			answer: 42
		}
	};
}

export function post() {
	return {
		status: 201
	};
}
