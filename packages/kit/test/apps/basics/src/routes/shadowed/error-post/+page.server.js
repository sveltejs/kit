import { validation } from '@sveltejs/kit';

export function load() {
	return {
		get_message: 'hello from get'
	};
}

export async function actions({ request }) {
	const data = await request.formData();

	throw validation(400, {
		post_message: `echo: ${data.get('message')}`
	});
}
