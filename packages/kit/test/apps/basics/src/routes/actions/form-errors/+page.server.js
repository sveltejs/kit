import { fail } from '@sveltejs/kit';

/** @type {import('./$types').Actions} */
export const actions = {
	default: async () => {
		return fail(400, { errors: { message: 'an error occurred' } });
	}
};
