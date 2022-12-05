import { invalid } from '@sveltejs/kit';

export function load() {
	return {
		get_message: 'hello from get'
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request }) => {
		const fields = await request.formData();
		return invalid(400, {
			errors: { post_message: `echo: ${fields.get('message')}` }
		});
	}
};
