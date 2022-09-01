import { validation } from '@sveltejs/kit';

/** @type {import('./$types').Actions} */
export const actions = {
	default: async () => {
		throw validation(400, undefined, { message: 'an error occurred' });
	}
};
