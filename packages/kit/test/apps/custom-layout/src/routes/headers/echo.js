/** @type {import('@sveltejs/kit').RequestHandler} */
export function get({ request }) {
	/** @type {Record<string, string>} */
	const headers = {};
	request.headers.forEach((value, key) => {
		if (key !== 'cookie') {
			headers[key] = value;
		}
	});

	return {
		body: headers
	};
}
