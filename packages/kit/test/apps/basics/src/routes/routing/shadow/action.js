let random = 0;

export function post({ body }) {
	random = body.get('random');
}

export function get() {
	return {
		body: {
			random
		}
	};
}
