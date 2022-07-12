/** @type {import('@sveltejs/kit').RequestHandler} */
export function get({ request }) {
	/** @type {Record<string, string>} */
	const body = {};

	request.headers.forEach((value, key) => {
		body[key] = value;
	});

	return {
		body
	};
}
