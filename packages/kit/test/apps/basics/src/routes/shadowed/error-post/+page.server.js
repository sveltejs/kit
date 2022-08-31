import { validation } from '@sveltejs/kit';

export function load() {
	return {
		get_message: 'hello from get'
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ fields }) => {
		throw validation(400, {
			post_message: `echo: ${fields.get('message')}`
		});
	}
};
