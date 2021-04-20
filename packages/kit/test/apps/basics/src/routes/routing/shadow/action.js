let random = 0;

/** @type {import('@sveltejs/kit').RequestHandler} */
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
