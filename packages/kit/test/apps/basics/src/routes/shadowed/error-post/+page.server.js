import { fail } from '@sveltejs/kit';

export function load() {
	return {
		get_message: 'hello from get'
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request }) => {
		const fields = await request.formData();
		return fail(400, {
			errors: { post_message: `echo: ${fields.get('message')}` }
		});
	}
};
