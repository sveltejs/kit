let random = 0;

/** @type {import('@sveltejs/kit').RequestHandler<any, FormData>} */
export function post({ body }) {
	random = +body.get('random');
	return { fallthrough: true };
}

export function get() {
	return {
		body: {
			random
		}
	};
}
