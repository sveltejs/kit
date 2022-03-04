/** @type {import('./[b]').RequestHandler} */
export async function get({ params }) {
	const param = params.b;

	if (param !== 'b') {
		return {
			fallthrough: true
		};
	}

	return {
		status: 200,
		body: { param }
	};
}
