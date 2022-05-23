export function get() {
	return {
		body: {
			answer: 42
		}
	};
}

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function post({ request }) {
	return {
		body: {
			question: await request.text()
		}
	};
}
