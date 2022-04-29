export function get() {
	return {
		body: {
			get_message: 'hello from get'
		}
	};
}

export function post() {
	return {
		status: 400,
		body: {
			post_message: 'hello from post'
		}
	};
}
