import { invalid } from '@sveltejs/kit';

/** @type {import('./$types').Actions} */
export const actions = {
	default: async () => {
		throw invalid(400, { errors: { message: 'an error occurred' } });
	}
};
