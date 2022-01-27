let random = 0;

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function post({ request }) {
	const body = await request.formData();
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
