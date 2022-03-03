/** @type {import('./[a]').RequestHandler} */
export async function get({ params }) {
	const param = params.a;

	if (param !== 'a') {
		return {
			fallthrough: true
		};
	}

	return {
		status: 200,
		body: { param }
	};
}
