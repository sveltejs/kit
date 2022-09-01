import { invalid } from '@sveltejs/kit';

/** @type {import('./$types').Actions} */
export const actions = {
	default: async () => {
		throw invalid(400, undefined, { message: 'an error occurred' });
	}
};
