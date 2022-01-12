let random = 0;

/** @type {import('@sveltejs/kit').RequestHandler<any, FormData>} */
export function post({ body }) {
	random = +(body.get('random') || '0');
	return { fallthrough: true };
}

export function get() {
	return {
		body: {
			random
		}
	};
}
