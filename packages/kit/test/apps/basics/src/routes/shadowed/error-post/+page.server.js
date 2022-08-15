export function load() {
	return {
		get_message: 'hello from get'
	};
}

export async function POST({ request }) {
	const data = await request.formData();

	return {
		status: 400,
		errors: {
			post_message: `echo: ${data.get('message')}`
		}
	};
}
